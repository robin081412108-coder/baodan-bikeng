import { get, put } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type Lead = {
  id: string;
  createdAt: string;
  contact: string;
  question: string;
  fileName: string;
  documentType: string;
};

export class LeadStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadStorageError";
  }
}

const DATA_DIR = path.join(process.cwd(), "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");
const BLOB_LEADS_PATH = process.env.BLOB_LEADS_PATH || "admin/leads.json";
const leadWriteState = globalThis as typeof globalThis & {
  __baodanLeadWriteQueue?: Promise<unknown>;
};

function hasVercelBlobConfig() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isRunningOnVercel() {
  return process.env.VERCEL === "1";
}

function shouldUseBlobStorage() {
  return isRunningOnVercel() && hasVercelBlobConfig();
}

export function isLeadStorageConfigured() {
  return !isRunningOnVercel() || hasVercelBlobConfig();
}

function assertStorageConfigured() {
  if (isRunningOnVercel() && !hasVercelBlobConfig()) {
    throw new LeadStorageError("Vercel 尚未连接 Blob，暂时无法保存联系方式。");
  }
}

function normalizeLead(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const lead = value as Partial<Lead>;

  if (!lead.id || !lead.createdAt || !lead.contact) {
    return null;
  }

  return {
    id: String(lead.id),
    createdAt: String(lead.createdAt),
    contact: String(lead.contact),
    question: String(lead.question ?? ""),
    fileName: String(lead.fileName ?? ""),
    documentType: String(lead.documentType ?? ""),
  };
}

function normalizeLeads(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizeLead).filter((lead): lead is Lead => Boolean(lead));
}

async function streamToText(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let content = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    content += decoder.decode(value, { stream: true });
  }

  content += decoder.decode();
  return content;
}

async function readBlobLeads() {
  try {
    const result = await get(BLOB_LEADS_PATH, {
      access: "private",
      useCache: false,
    });

    if (!result || result.statusCode !== 200) {
      return [];
    }

    const content = await streamToText(result.stream);
    return normalizeLeads(JSON.parse(content));
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error("Parse blob leads failed:", error);
      return [];
    }

    const message = error instanceof Error ? error.message : String(error);

    if (message.toLowerCase().includes("not found")) {
      return [];
    }

    throw new LeadStorageError(`读取联系方式失败：${message}`);
  }
}

async function writeBlobLeads(leads: Lead[]) {
  try {
    await put(BLOB_LEADS_PATH, JSON.stringify(leads.slice(0, 500), null, 2), {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json; charset=utf-8",
      cacheControlMaxAge: 60,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new LeadStorageError(`保存联系方式失败：${message}`);
  }
}

async function createBlobLead(lead: Lead) {
  const leads = await readBlobLeads();
  leads.unshift(lead);
  await writeBlobLeads(leads);
  return lead;
}

async function readLocalLeads() {
  try {
    const content = await readFile(LEADS_FILE, "utf8");
    return normalizeLeads(JSON.parse(content));
  } catch {
    return [];
  }
}

async function writeLocalLeads(leads: Lead[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(LEADS_FILE, `${JSON.stringify(leads.slice(0, 500), null, 2)}\n`, "utf8");
}

async function createLocalLead(lead: Lead) {
  const previousWrite = leadWriteState.__baodanLeadWriteQueue ?? Promise.resolve();
  const nextWrite = previousWrite
    .catch(() => undefined)
    .then(async () => {
      const leads = await readLocalLeads();
      leads.unshift(lead);
      await writeLocalLeads(leads);
    });

  leadWriteState.__baodanLeadWriteQueue = nextWrite;
  await nextWrite;
  return lead;
}

export async function listLeads() {
  assertStorageConfigured();

  if (shouldUseBlobStorage()) {
    return readBlobLeads();
  }

  return readLocalLeads();
}

export async function createLead(input: Omit<Lead, "id" | "createdAt">) {
  assertStorageConfigured();

  const lead: Lead = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };

  if (shouldUseBlobStorage()) {
    return createBlobLead(lead);
  }

  return createLocalLead(lead);
}
