import { NextResponse } from "next/server";
import { logQwenAnalyzeError, retrieveQwenAnalysis } from "@/lib/qwen-analysis";
import { createEvent } from "@/lib/events";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const apiKey = process.env.DASHSCOPE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "服务端未配置 DASHSCOPE_API_KEY。" }, { status: 500 });
  }

  const { id } = await params;

  try {
    const status = await retrieveQwenAnalysis(id, apiKey);

    if (status.status === "completed") {
      await createEvent({
        category: "初筛流程",
        action: "分析成功",
        path: "/",
      }).catch((eventError) => console.error("Create analysis completed event error:", eventError));

      return NextResponse.json({
        id,
        status: "completed",
        result: status.result,
      });
    }

    return NextResponse.json({
      id,
      status: "processing",
    });
  } catch (error) {
    logQwenAnalyzeError(error);
    await createEvent({
      category: "初筛流程",
      action: "分析失败",
      label: "poll",
      path: "/",
    }).catch((eventError) => console.error("Create analysis failed event error:", eventError));
    return NextResponse.json(
      { error: "本次自动分析失败，请稍后重试，或换一份更清晰的文件再试。" },
      { status: 502 },
    );
  }
}
