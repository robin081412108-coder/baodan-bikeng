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

type RedisPipelineResponse<T = unknown> = Array<{
  result?: T;
  error?: string;
}>;

export class LeadStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadStorageError";
  }
}

const DATA_DIR = path.join(process.cwd(), "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");
const VERCEL_KV_LEADS_KEY = process.env.VERCEL_KV_LEADS_KEY || "baodan:leads";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function hasVercelKvConfig() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export function isLeadStorageConfigured() {
  return !isProduction() || hasVercelKvConfig();
}

function assertProductionStorage() {
  if (isProduction() && !hasVercelKvConfig()) {
    throw new LeadStorageError(
      "生产环境未配置 Vercel KV，无法保存联系方式。",
    );
  }
}

async function vercelKvPipeline<T>(commands: unknown[][]) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new LeadStorageError("缺少 Vercel KV 配置。");
  }

  const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new LeadStorageError(`Vercel KV 请求失败：${response.status} ${text}`);
  }

  const payload = (await response.json()) as RedisPipelineResponse<T>;
  const failed = payload.find((item) => item.error);

  if (failed?.error) {
    throw new LeadStorageError(`Vercel KV 命令失败：${failed.error}`);
  }

  return payload;
}

function parseLead(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const lead = JSON.parse(value) as Lead;

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
  } catch {
    return null;
  }
}

async function listVercelKvLeads() {
  const payload = await vercelKvPipeline<string[]>([
    ["LRANGE", VERCEL_KV_LEADS_KEY, "0", "499"],
  ]);
  const values = payload[0]?.result ?? [];

  return values.map(parseLead).filter((lead): lead is Lead => Boolean(lead));
}

async function createVercelKvLead(lead: Lead) {
  await vercelKvPipeline([
    ["LPUSH", VERCEL_KV_LEADS_KEY, JSON.stringify(lead)],
    ["LTRIM", VERCEL_KV_LEADS_KEY, "0", "499"],
  ]);

  return lead;
}

async function readLocalLeads() {
  try {
    const content = await readFile(LEADS_FILE, "utf8");
    const leads = JSON.parse(content) as Lead[];
    return Array.isArray(leads) ? leads : [];
  } catch {
    return [];
  }
}

async function writeLocalLeads(leads: Lead[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(LEADS_FILE, `${JSON.stringify(leads, null, 2)}\n`, "utf8");
}

async function createLocalLead(lead: Lead) {
  const leads = await readLocalLeads();
  leads.unshift(lead);
  await writeLocalLeads(leads);
  return lead;
}

export async function listLeads() {
  assertProductionStorage();

  if (hasVercelKvConfig()) {
    return listVercelKvLeads();
  }

  return readLocalLeads();
}

export async function createLead(input: Omit<Lead, "id" | "createdAt">) {
  assertProductionStorage();

  const lead: Lead = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };

  if (hasVercelKvConfig()) {
    return createVercelKvLead(lead);
  }

  return createLocalLead(lead);
}
