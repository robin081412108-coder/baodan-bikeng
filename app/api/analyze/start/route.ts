import { NextResponse } from "next/server";
import {
  isSupportedAnalysisFile,
  logQwenAnalyzeError,
  MAX_ANALYSIS_FILE_SIZE,
  startQwenAnalysis,
} from "@/lib/qwen-analysis";
import { createEvent } from "@/lib/events";

export const runtime = "nodejs";
export const maxDuration = 60;

const friendlyAnalyzeError =
  "本次自动分析失败，请稍后重试，或换一份更清晰的文件再试。";
const missingApiKeyError =
  "服务端未配置 DASHSCOPE_API_KEY。请在项目根目录的 .env.local 里添加 DASHSCOPE_API_KEY，然后重启 npm run dev。";

export async function POST(request: Request) {
  const apiKey = process.env.DASHSCOPE_API_KEY;

  if (!apiKey) {
    logQwenAnalyzeError(new Error("Missing DASHSCOPE_API_KEY"));
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production" ? friendlyAnalyzeError : missingApiKeyError,
      },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请先上传一份保险资料文件。" }, { status: 400 });
  }

  if (file.size > MAX_ANALYSIS_FILE_SIZE) {
    return NextResponse.json(
      { error: "文件过大，请上传 20MB 以内的文件。" },
      { status: 400 },
    );
  }

  if (!isSupportedAnalysisFile(file)) {
    return NextResponse.json(
      { error: "暂时支持 PDF、Word DOCX、JPG、PNG、TXT、MD 文件。请换一种格式上传。" },
      { status: 400 },
    );
  }

  await createEvent({
    category: "初筛流程",
    action: "选择文件",
    path: "/",
  }).catch((eventError) => console.error("Create file selected event error:", eventError));

  try {
    const job = await startQwenAnalysis(file, apiKey);
    await createEvent({
      category: "初筛流程",
      action: "开始分析",
      path: "/",
    }).catch((eventError) => console.error("Create analysis start event error:", eventError));
    return NextResponse.json({ jobId: job.fileId, status: "processing" });
  } catch (error) {
    logQwenAnalyzeError(error);
    return NextResponse.json({ error: friendlyAnalyzeError }, { status: 502 });
  }
}
