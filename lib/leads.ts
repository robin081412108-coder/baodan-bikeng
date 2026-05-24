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

type SupabaseLeadRow = {
  id: string;
  created_at: string;
  contact: string;
  question: string | null;
  file_name: string | null;
  document_type: string | null;
};

export class LeadStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadStorageError";
  }
}

const DATA_DIR = path.join(process.cwd(), "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");
const SUPABASE_TABLE = process.env.SUPABASE_LEADS_TABLE || "leads";

function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function assertProductionStorage() {
  if (isProduction() && !hasSupabaseConfig()) {
    throw new LeadStorageError(
      "生产环境未配置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY，无法持久保存联系方式。",
    );
  }
}

function toLead(row: SupabaseLeadRow): Lead {
  return {
    id: row.id,
    createdAt: row.created_at,
    contact: row.contact,
    question: row.question ?? "",
    fileName: row.file_name ?? "",
    documentType: row.document_type ?? "",
  };
}

async function supabaseFetch(pathname: string, init?: RequestInit) {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new LeadStorageError("缺少 Supabase 配置。");
  }

  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new LeadStorageError(`Supabase 请求失败：${response.status} ${text}`);
  }

  return response;
}

async function listSupabaseLeads() {
  const params = new URLSearchParams({
    select: "id,created_at,contact,question,file_name,document_type",
    order: "created_at.desc",
  });
  const response = await supabaseFetch(`${SUPABASE_TABLE}?${params.toString()}`);
  const rows = (await response.json()) as SupabaseLeadRow[];
  return rows.map(toLead);
}

async function createSupabaseLead(lead: Lead) {
  const response = await supabaseFetch(SUPABASE_TABLE, {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      id: lead.id,
      created_at: lead.createdAt,
      contact: lead.contact,
      question: lead.question,
      file_name: lead.fileName,
      document_type: lead.documentType,
    }),
  });

  const rows = (await response.json()) as SupabaseLeadRow[];
  return rows[0] ? toLead(rows[0]) : lead;
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

export function isLeadStorageConfigured() {
  return !isProduction() || hasSupabaseConfig();
}

export async function listLeads() {
  assertProductionStorage();

  if (hasSupabaseConfig()) {
    return listSupabaseLeads();
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

  if (hasSupabaseConfig()) {
    return createSupabaseLead(lead);
  }

  return createLocalLead(lead);
}
