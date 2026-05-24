import type { AnalysisResult } from "@/lib/openai-analysis";

export type AnalysisJobStatus = "processing" | "completed" | "failed";

export type AnalysisJob = {
  id: string;
  status: AnalysisJobStatus;
  createdAt: string;
  updatedAt: string;
  fileName: string;
  result?: AnalysisResult;
  error?: string;
};

const globalJobs = globalThis as typeof globalThis & {
  __baodanAnalysisJobs?: Map<string, AnalysisJob>;
};

function getJobMap() {
  if (!globalJobs.__baodanAnalysisJobs) {
    globalJobs.__baodanAnalysisJobs = new Map<string, AnalysisJob>();
  }

  return globalJobs.__baodanAnalysisJobs;
}

export function createAnalysisJob(fileName: string) {
  const now = new Date().toISOString();
  const job: AnalysisJob = {
    id: crypto.randomUUID(),
    status: "processing",
    createdAt: now,
    updatedAt: now,
    fileName,
  };

  getJobMap().set(job.id, job);
  return job;
}

export function getAnalysisJob(id: string) {
  return getJobMap().get(id) ?? null;
}

export function completeAnalysisJob(id: string, result: AnalysisResult) {
  const job = getAnalysisJob(id);
  if (!job) {
    return;
  }

  getJobMap().set(id, {
    ...job,
    status: "completed",
    updatedAt: new Date().toISOString(),
    result,
  });
}

export function failAnalysisJob(id: string, error: string) {
  const job = getAnalysisJob(id);
  if (!job) {
    return;
  }

  getJobMap().set(id, {
    ...job,
    status: "failed",
    updatedAt: new Date().toISOString(),
    error,
  });
}
