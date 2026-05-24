import { NextResponse } from "next/server";
import { logOpenAIAnalyzeError, retrieveBackgroundAnalysis } from "@/lib/openai-analysis";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "服务端未配置 OPENAI_API_KEY。" }, { status: 500 });
  }

  const { id } = await params;

  try {
    const status = await retrieveBackgroundAnalysis(id, apiKey);

    if (status.status === "completed") {
      return NextResponse.json({
        id,
        status: "completed",
        result: status.result,
      });
    }

    if (status.status === "failed") {
      return NextResponse.json({
        id,
        status: "failed",
        error: status.error,
      });
    }

    return NextResponse.json({
      id,
      status: "processing",
    });
  } catch (error) {
    logOpenAIAnalyzeError(error);
    return NextResponse.json(
      { error: "分析任务状态查询失败，请稍后重试。" },
      { status: 502 },
    );
  }
}
