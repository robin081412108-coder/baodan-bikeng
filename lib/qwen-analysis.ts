export type RiskLevel = "高" | "中" | "低";

export type RiskItem = {
  riskTitle: string;
  riskLevel: RiskLevel;
  factFromDocument: string;
  whyItMatters: string;
  needToConfirm: string;
};

export type AnalysisResult = {
  documentType: string;
  materialCompleteness: string;
  missingInfo: string[];
  risks: RiskItem[];
  disclaimer: string;
};

export const MAX_ANALYSIS_FILE_SIZE = 20 * 1024 * 1024;

const DASHSCOPE_BASE_URL =
  process.env.DASHSCOPE_BASE_URL?.trim() ||
  "https://dashscope.aliyuncs.com/compatible-mode/v1";
const MODEL = process.env.QWEN_MODEL?.trim() || "qwen-long";
const disclaimerText =
  "本结果仅供初步参考，不构成保险、法律、投资、购买或退保建议。";
const scheduledCleanups = globalThis as typeof globalThis & {
  __qwenFileCleanupTimers?: Map<string, ReturnType<typeof setTimeout>>;
};

const resultSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "documentType",
    "materialCompleteness",
    "missingInfo",
    "risks",
    "disclaimer",
  ],
  properties: {
    documentType: {
      type: "string",
      enum: ["保险计划书", "产品说明书", "利益演示表", "保险条款", "无法判断"],
    },
    materialCompleteness: {
      type: "string",
      enum: ["高", "中", "低"],
    },
    missingInfo: {
      type: "array",
      items: { type: "string" },
    },
    risks: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "riskTitle",
          "riskLevel",
          "factFromDocument",
          "whyItMatters",
          "needToConfirm",
        ],
        properties: {
          riskTitle: { type: "string" },
          riskLevel: {
            type: "string",
            enum: ["高", "中", "低"],
          },
          factFromDocument: { type: "string" },
          whyItMatters: { type: "string" },
          needToConfirm: { type: "string" },
        },
      },
    },
    disclaimer: {
      type: "string",
      enum: [disclaimerText],
    },
  },
};

const systemPrompt =
  "你是一个保险资料初步风险提示工具。所有输出必须使用中国大陆常用简体中文，写给不懂保险的普通人看。只依据上传文件能看到的事实，不做购买建议、退保建议或产品推荐，不评价产品好坏，不使用“骗局”“垃圾”“一定亏”“一定赚”等绝对化表达。优先摘取保费、现金价值、年度、演示利益、等待期、免责条件、医院范围、赔付比例等数字或条款。术语后必须立即用白话解释，例如“现金价值就是中途退保大概能拿回的钱”。每个注意点的 whyItMatters 必须举文件数字能够支持的具体例子，例如累计交多少钱、退保可拿多少钱、差额多少；没有数字就明确说文件缺少数字，不能编造。若文件不是保险资料，documentType 返回“无法判断”，仍用三条提示说明不能提取哪些保险事实。只返回符合要求的 JSON，不要输出 Markdown。";

const userPrompt =
  "请分析该文件并返回 3 个最值得用户进一步确认的注意点。缺失的正式条款或关键数字请写入 missingInfo。每条必须包含风险标题、风险等级、文件中看到的事实、通俗解释为什么需要注意、进一步需要确认什么。";

type ResponseFormatMode = "json_schema" | "json_object" | "prompt_only";

export function logQwenAnalyzeError(error: unknown) {
  console.error("Qwen analyze error:", error);

  if (error && typeof error === "object") {
    const details = error as {
      status?: unknown;
      message?: unknown;
      response?: unknown;
      cause?: unknown;
    };

    console.error("Qwen analyze error details:", {
      status: details.status,
      message: details.message,
      response: details.response,
      cause: details.cause,
    });
  }
}

export function getMimeType(file: File) {
  const name = file.name.toLowerCase();

  if (name.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  if (name.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (name.endsWith(".png")) {
    return "image/png";
  }

  if (name.endsWith(".txt")) {
    return "text/plain";
  }

  if (name.endsWith(".md")) {
    return "text/markdown";
  }

  return file.type || "application/octet-stream";
}

export function isSupportedAnalysisFile(file: File) {
  const mimeType = getMimeType(file);
  return (
    mimeType === "application/pdf" ||
    mimeType === "text/plain" ||
    mimeType === "text/markdown" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "image/jpeg" ||
    mimeType === "image/png"
  );
}

function authorizationHeader(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}` };
}

function hasExpectedShape(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Partial<AnalysisResult>;

  return (
    typeof result.documentType === "string" &&
    typeof result.materialCompleteness === "string" &&
    Array.isArray(result.missingInfo) &&
    Array.isArray(result.risks) &&
    result.risks.length === 3 &&
    result.risks.every(
      (risk) =>
        risk &&
        typeof risk.riskTitle === "string" &&
        typeof risk.riskLevel === "string" &&
        typeof risk.factFromDocument === "string" &&
        typeof risk.whyItMatters === "string" &&
        typeof risk.needToConfirm === "string",
    ) &&
    typeof result.disclaimer === "string"
  );
}

function extractContent(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("choices" in payload)) {
    return "";
  }

  const choices = payload.choices;
  if (!Array.isArray(choices)) {
    return "";
  }

  const first = choices[0];
  if (!first || typeof first !== "object" || !("message" in first)) {
    return "";
  }

  const message = first.message;
  if (!message || typeof message !== "object" || !("content" in message)) {
    return "";
  }

  return typeof message.content === "string" ? message.content : "";
}

function parseResult(rawContent: string) {
  const content = rawContent
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    logQwenAnalyzeError(error);
    console.error("Qwen raw output:", rawContent);
    throw new Error("Qwen JSON parse failed");
  }

  if (!hasExpectedShape(parsed)) {
    console.error("Qwen result JSON shape mismatch:", rawContent);
    throw new Error("Qwen JSON shape mismatch");
  }

  return {
    ...parsed,
    risks: parsed.risks.slice(0, 3),
    disclaimer: disclaimerText,
  };
}

async function uploadFile(file: File, apiKey: string) {
  const formData = new FormData();
  formData.append("file", file, file.name || "insurance-document");
  formData.append("purpose", "file-extract");

  const response = await fetch(`${DASHSCOPE_BASE_URL}/files`, {
    method: "POST",
    headers: authorizationHeader(apiKey),
    body: formData,
  });

  const rawResponse = await response.text();

  if (!response.ok) {
    logQwenAnalyzeError({
      status: response.status,
      message: response.statusText,
      response: rawResponse,
    });
    throw new Error("Qwen file upload failed");
  }

  const payload = JSON.parse(rawResponse) as { id?: unknown };
  if (typeof payload.id !== "string") {
    console.error("Qwen file upload did not return file-id:", rawResponse);
    throw new Error("Qwen missing file-id");
  }

  return payload.id;
}

async function deleteFile(fileId: string, apiKey: string) {
  const timer = scheduledCleanups.__qwenFileCleanupTimers?.get(fileId);
  if (timer) {
    clearTimeout(timer);
    scheduledCleanups.__qwenFileCleanupTimers?.delete(fileId);
  }

  try {
    const response = await fetch(
      `${DASHSCOPE_BASE_URL}/files/${encodeURIComponent(fileId)}`,
      {
        method: "DELETE",
        headers: authorizationHeader(apiKey),
      },
    );

    if (!response.ok) {
      console.error("Qwen temporary file deletion failed:", await response.text());
    }
  } catch (error) {
    console.error("Qwen temporary file deletion failed:", error);
  }
}

function scheduleFileCleanup(fileId: string, apiKey: string) {
  if (!scheduledCleanups.__qwenFileCleanupTimers) {
    scheduledCleanups.__qwenFileCleanupTimers = new Map();
  }

  const timer = setTimeout(() => {
    void deleteFile(fileId, apiKey);
  }, 30 * 60 * 1000);

  timer.unref();
  scheduledCleanups.__qwenFileCleanupTimers.set(fileId, timer);
}

function buildResponseFormat(mode: ResponseFormatMode) {
  if (mode === "json_schema") {
    return {
      type: "json_schema",
      json_schema: {
        name: "insurance_risk_analysis",
        description: "保险资料初步风险提示的固定结构化输出",
        strict: true,
        schema: resultSchema,
      },
    };
  }

  if (mode === "json_object") {
    return { type: "json_object" };
  }

  return undefined;
}

async function requestFileAnalysis(
  fileId: string,
  apiKey: string,
  mode: ResponseFormatMode,
) {
  const responseFormat = buildResponseFormat(mode);
  const response = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      ...authorizationHeader(apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "system", content: `fileid://${fileId}` },
        { role: "user", content: userPrompt },
      ],
      ...(responseFormat ? { response_format: responseFormat } : {}),
      temperature: 0.1,
    }),
    cache: "no-store",
  });

  const rawResponse = await response.text();
  return { response, rawResponse };
}

async function queryFile(fileId: string, apiKey: string) {
  const modes: ResponseFormatMode[] = ["json_schema", "json_object", "prompt_only"];

  for (const [index, mode] of modes.entries()) {
    const { response, rawResponse } = await requestFileAnalysis(fileId, apiKey, mode);

    if (rawResponse.toLowerCase().includes("file parsing in progress")) {
      return { status: "processing" as const };
    }

    if (!response.ok) {
      const mayRetryOutputFormat =
        response.status === 400 &&
        rawResponse.toLowerCase().includes("response_format") &&
        index < modes.length - 1;

      if (mayRetryOutputFormat) {
        console.warn(`Qwen rejected ${mode} output format, retrying with fallback format.`);
        continue;
      }

      logQwenAnalyzeError({
        status: response.status,
        message: response.statusText,
        response: rawResponse,
      });
      throw new Error("Qwen analysis request failed");
    }

    const payload = JSON.parse(rawResponse) as unknown;
    const content = extractContent(payload);

    if (!content) {
      console.error("Qwen analysis returned empty content:", rawResponse);
      throw new Error("Qwen returned empty content");
    }

    return {
      status: "completed" as const,
      result: parseResult(content),
    };
  }

  throw new Error("Qwen analysis request failed");
}

export async function startQwenAnalysis(file: File, apiKey: string) {
  const fileId = await uploadFile(file, apiKey);
  scheduleFileCleanup(fileId, apiKey);
  return { fileId, status: "processing" as const };
}

export async function retrieveQwenAnalysis(fileId: string, apiKey: string) {
  try {
    const result = await queryFile(fileId, apiKey);

    if (result.status === "completed") {
      await deleteFile(fileId, apiKey);
    }

    return result;
  } catch (error) {
    await deleteFile(fileId, apiKey);
    throw error;
  }
}

export async function analyzeInsuranceFile(file: File, apiKey: string) {
  const job = await startQwenAnalysis(file, apiKey);

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = await retrieveQwenAnalysis(job.fileId, apiKey);

    if (result.status === "completed") {
      return result.result;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  await deleteFile(job.fileId, apiKey);
  throw new Error("Qwen file parsing timeout");
}
