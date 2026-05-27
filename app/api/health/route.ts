import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/app-info";
import { isLeadStorageConfigured } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      version: APP_VERSION,
      time: new Date().toISOString(),
      qwenConfigured: Boolean(process.env.DASHSCOPE_API_KEY),
      adminConfigured: Boolean(process.env.ADMIN_PASSWORD),
      leadStorageConfigured: isLeadStorageConfigured(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
