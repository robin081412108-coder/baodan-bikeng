import { NextResponse } from "next/server";
import { createEvent } from "@/lib/events";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      category?: unknown;
      action?: unknown;
      label?: unknown;
      path?: unknown;
      referrer?: unknown;
      source?: unknown;
      medium?: unknown;
      campaign?: unknown;
    };

    await createEvent(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
