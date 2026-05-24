import { after } from "next/server";
import { NextResponse } from "next/server";
import {
  createAnalysisJob,
  failAnalysisJob,
  completeAnalysisJob,
} from "@/lib/analysis-jobs";
import {
  analyzeInsuranceFile,
  isSupportedAnalysisFile,
  logOpenAIAnalyzeError,
  MAX_ANALYSIS_FILE_SIZE,
} from "@/lib/openai-analysis";

export const runtime = "nodejs";
export const maxDuration = 300;

const friendlyAnalyzeError =
  "本次自动分析失败，请稍后重试，或换一份更清晰的文件再试。";
const missingApiKeyError =
  "服务端未配置 OPENAI_API_KEY。请在项目根目录的 .env.local 里添加 OPENAI_API_KEY，然后重启 npm run dev。";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    logOpenAIAnalyzeError(new Error("Missing OPENAI_API_KEY"));
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
      { error: "暂时支持 PDF、JPG、PNG、WEBP、TXT、MD 文件。请换一种格式上传。" },
      { status: 400 },
    );
  }

  const job = createAnalysisJob(file.name || "insurance-document");

  after(async () => {
    try {
      const result = await analyzeInsuranceFile(file, apiKey);
      completeAnalysisJob(job.id, result);
    } catch (error) {
      logOpenAIAnalyzeError(error);
      failAnalysisJob(job.id, friendlyAnalyzeError);
    }
  });

  return NextResponse.json({ jobId: job.id, status: job.status });
}
