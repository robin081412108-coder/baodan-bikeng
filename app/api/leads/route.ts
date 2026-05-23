import { NextResponse } from "next/server";
import { createLead, listLeads } from "@/lib/leads";

export const runtime = "nodejs";

export async function GET() {
  const leads = await listLeads();
  return NextResponse.json({ leads });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    contact?: unknown;
    question?: unknown;
    fileName?: unknown;
    documentType?: unknown;
  };
  const contact = String(payload.contact ?? "").trim();
  const question = String(payload.question ?? "").trim();

  if (!contact) {
    return NextResponse.json({ error: "请填写微信或邮箱。" }, { status: 400 });
  }

  const lead = await createLead({
    contact,
    question,
    fileName: String(payload.fileName ?? "").trim(),
    documentType: String(payload.documentType ?? "").trim(),
  });

  return NextResponse.json({ ok: true, lead });
}
