import { NextResponse } from "next/server";
import { createLead, LeadStorageError, listLeads } from "@/lib/leads";

export const runtime = "nodejs";

export async function GET() {
  try {
    const leads = await listLeads();
    return NextResponse.json({ leads });
  } catch (error) {
    console.error("List leads error:", error);

    if (error instanceof LeadStorageError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json({ error: "读取联系方式失败。" }, { status: 500 });
  }
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

  try {
    const lead = await createLead({
      contact,
      question,
      fileName: String(payload.fileName ?? "").trim(),
      documentType: String(payload.documentType ?? "").trim(),
    });

    return NextResponse.json({ ok: true, lead });
  } catch (error) {
    console.error("Create lead error:", error);

    if (error instanceof LeadStorageError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json({ error: "提交失败，请稍后再试。" }, { status: 500 });
  }
}
