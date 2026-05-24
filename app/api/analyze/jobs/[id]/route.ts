import { NextResponse } from "next/server";
import { getAnalysisJob } from "@/lib/analysis-jobs";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = getAnalysisJob(id);

  if (!job) {
    return NextResponse.json(
      {
        error:
          "分析任务状态暂时不可用，请刷新页面后重新上传。若在 Vercel 上频繁出现，请配置数据库任务存储。",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(job);
}
