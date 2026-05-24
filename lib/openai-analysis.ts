import mammoth from "mammoth";

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

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const configuredModel = process.env.OPENAI_MODEL?.trim();
const MODEL =
  !configuredModel || configuredModel === "gpt-5" ? "gpt-5-mini" : configuredModel;
const disclaimerText =
  "本结果仅供初步参考，不构成保险、法律、投资、购买或退保建议。";

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

export function logOpenAIAnalyzeError(error: unknown) {
  console.error("OpenAI analyze error:", error);

  if (error && typeof error === "object") {
    const details = error as {
      status?: unknown;
      message?: unknown;
      response?: unknown;
      cause?: unknown;
    };

    console.error("OpenAI analyze error details:", {
      status: details.status,
      message: details.message,
      response: details.response,
      cause: details.cause,
    });
  }
}

export function isTimeoutError(error: unknown) {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return true;
  }

  if (!error || typeof error !== "object" || !("cause" in error)) {
    return false;
  }

  const cause = (error as { cause?: unknown }).cause;
  if (!cause || typeof cause !== "object" || !("code" in cause)) {
    return false;
  }

  return (cause as { code?: unknown }).code === "UND_ERR_CONNECT_TIMEOUT";
}

export function getMimeType(file: File) {
  const name = file.name.toLowerCase();

  if (file.type) {
    return file.type;
  }

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

  if (name.endsWith(".webp")) {
    return "image/webp";
  }

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return "text/plain";
  }

  return "application/octet-stream";
}

export function isSupportedAnalysisFile(file: File) {
  const mimeType = getMimeType(file);
  return (
    mimeType === "application/pdf" ||
    mimeType === "text/plain" ||
    mimeType === "text/markdown" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/webp"
  );
}

function extractOutputText(response: unknown) {
  if (
    response &&
    typeof response === "object" &&
    "output_text" in response &&
    typeof response.output_text === "string"
  ) {
    return response.output_text;
  }

  if (!response || typeof response !== "object" || !("output" in response)) {
    return "";
  }

  const output = response.output;
  if (!Array.isArray(output)) {
    return "";
  }

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object" || !("content" in item)) {
        return [];
      }

      const content = item.content;
      if (!Array.isArray(content)) {
        return [];
      }

      return content
        .map((part) => {
          if (
            part &&
            typeof part === "object" &&
            "type" in part &&
            part.type === "output_text" &&
            "text" in part &&
            typeof part.text === "string"
          ) {
            return part.text;
          }

          return "";
        })
        .filter(Boolean);
    })
    .join("");
}

function hasExpectedShape(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as {
    documentType?: unknown;
    materialCompleteness?: unknown;
    missingInfo?: unknown;
    risks?: unknown;
    disclaimer?: unknown;
  };

  return (
    typeof result.documentType === "string" &&
    typeof result.materialCompleteness === "string" &&
    Array.isArray(result.missingInfo) &&
    Array.isArray(result.risks) &&
    result.risks.length === 3 &&
    result.risks.every(
      (risk) =>
        risk &&
        typeof risk === "object" &&
        typeof (risk as { riskTitle?: unknown }).riskTitle === "string" &&
        typeof (risk as { riskLevel?: unknown }).riskLevel === "string" &&
        typeof (risk as { factFromDocument?: unknown }).factFromDocument === "string" &&
        typeof (risk as { whyItMatters?: unknown }).whyItMatters === "string" &&
        typeof (risk as { needToConfirm?: unknown }).needToConfirm === "string",
    ) &&
    typeof result.disclaimer === "string"
  );
}

async function buildFileContent(file: File) {
  const mimeType = getMimeType(file);
  const bytes = Buffer.from(await file.arrayBuffer());

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer: bytes });
    const text = result.value.trim();

    return {
      type: "input_text",
      text: `用户上传 Word 文件名：${file.name}\n\n${text || "未能从 Word 文件中提取到文字内容。"}`,
    };
  }

  if (mimeType.startsWith("text/")) {
    return {
      type: "input_text",
      text: `用户上传文件名：${file.name}\n\n${bytes.toString("utf8")}`,
    };
  }

  const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;

  if (mimeType.startsWith("image/")) {
    return {
      type: "input_image",
      image_url: dataUrl,
    };
  }

  return {
    type: "input_file",
    filename: file.name || "insurance-document",
    file_data: dataUrl,
  };
}

async function buildOpenAIRequestBody(file: File, background: boolean) {
  const fileContent = await buildFileContent(file);

  return {
    model: MODEL,
    background,
    reasoning: {
      effort: "minimal",
    },
    max_output_tokens: 1800,
    instructions:
      "你是一个保险资料风险提示工具。所有输出字段必须使用中国大陆常用的简体中文，不得使用英文、繁体中文、拼音或中英混杂表达，除非文件原文中的产品名或专有名词必须保留。你的读者是不懂保险的普通人，所以必须用白话解释，不要堆保险术语；如果必须写现金价值、等待期、免责条款、非保证利益、保底利率等术语，必须紧跟一句通俗解释，例如“现金价值就是中途退保大概能拿回的钱”。句子要短，直接说人话。只基于用户上传文件中能看到的事实做初步风险提示。不要做购买建议、退保建议、产品推荐，不评价产品好坏。不要使用骗局、垃圾、一定亏、一定赚等情绪化或绝对化词语。输出要有冲击力，但只能靠文件里的数字和条款事实产生冲击力，不能编造。优先提取金额、保费、现金价值、年度、等待期、免责条件、赔付比例、医院范围、领取年龄、演示档位等具体数字。每个注意点都要写得具体、有数字、有对比。whyItMatters 字段必须针对该风险举一个普通人能理解的具体例子：例如第几年退保、累计已交多少钱、现金价值或可领取金额是多少、差额是多少；如果文件里能看到银行定存、保底利率、演示利率或可合理作为对照的低风险金额/利率，再写出和该对照相比少了多少。不得编造文件没有的利率或金额；如果缺少关键数字，就明确写“文件未提供某某数字，因此暂时无法算出具体差额”。如果文件没有对应数字，要明确写出缺少什么数字或条款。只输出 3 个注意点。若文件不是保险相关资料，documentType 返回无法判断，并说明无法从文件中提取保险事实。",
    input: [
      {
        role: "user",
        content: [
          fileContent,
          {
            type: "input_text",
            text:
              "请分析这份保险资料，并按 JSON Schema 返回 3 个最值得用户立刻确认的风险点。所有字段内容必须是中国大陆常用简体中文。请写给完全不懂保险的普通人看，语言要通俗、短句、少术语；出现术语必须马上解释。要求：1. 只依据文件事实；2. 每条都尽量引用具体金额、年份、比例、页内条件或条款限制；3. 不要建议买或退；4. 如果资料不完整，missingInfo 必须列出缺失材料；5. 每条都包含事实、为什么要注意、进一步确认什么；6. whyItMatters 必须举具体数字例子，尽量算出用户在某一年可能少拿多少钱，能和文件中的定存/保底/演示收益等对照时要写出差额，不能编造文件没有的数据。",
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "insurance_risk_analysis",
        strict: true,
        schema: resultSchema,
      },
    },
  };
}

function getHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function parseCompletedResponse(openaiPayload: unknown) {
  const outputText = extractOutputText(openaiPayload);

  if (!outputText) {
    console.error("OpenAI analyze error: empty output_text");
    console.error("OpenAI raw response:", JSON.stringify(openaiPayload, null, 2));
    throw new Error("OpenAI returned empty output_text");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch (error) {
    logOpenAIAnalyzeError(error);
    console.error("OpenAI raw output_text:", outputText);
    throw new Error("OpenAI JSON parse failed");
  }

  if (!hasExpectedShape(parsed)) {
    console.error("OpenAI analyze error: parsed JSON shape mismatch");
    console.error("OpenAI raw output_text:", outputText);
    console.error("OpenAI parsed JSON:", JSON.stringify(parsed, null, 2));
    throw new Error("OpenAI JSON shape mismatch");
  }

  return parsed;
}

export async function analyzeInsuranceFile(file: File, apiKey: string) {
  const openaiResponse = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: getHeaders(apiKey),
    body: JSON.stringify(await buildOpenAIRequestBody(file, false)),
  });

  if (!openaiResponse.ok) {
    const response = await openaiResponse.text();
    logOpenAIAnalyzeError({
      status: openaiResponse.status,
      message: openaiResponse.statusText,
      response,
    });
    throw new Error("OpenAI request failed");
  }

  const openaiPayload = (await openaiResponse.json()) as unknown;
  return parseCompletedResponse(openaiPayload);
}

export async function startBackgroundAnalysis(file: File, apiKey: string) {
  const openaiResponse = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: getHeaders(apiKey),
    body: JSON.stringify(await buildOpenAIRequestBody(file, true)),
  });

  if (!openaiResponse.ok) {
    const response = await openaiResponse.text();
    logOpenAIAnalyzeError({
      status: openaiResponse.status,
      message: openaiResponse.statusText,
      response,
    });
    throw new Error("OpenAI background request failed");
  }

  const openaiPayload = (await openaiResponse.json()) as { id?: unknown; status?: unknown };
  if (typeof openaiPayload.id !== "string") {
    console.error("OpenAI analyze error: missing response id");
    console.error("OpenAI raw response:", JSON.stringify(openaiPayload, null, 2));
    throw new Error("OpenAI missing response id");
  }

  return {
    responseId: openaiPayload.id,
    status: typeof openaiPayload.status === "string" ? openaiPayload.status : "queued",
  };
}

export async function retrieveBackgroundAnalysis(responseId: string, apiKey: string) {
  const openaiResponse = await fetch(
    `${OPENAI_RESPONSES_URL}/${encodeURIComponent(responseId)}`,
    {
      headers: getHeaders(apiKey),
      cache: "no-store",
    },
  );

  if (!openaiResponse.ok) {
    const response = await openaiResponse.text();
    logOpenAIAnalyzeError({
      status: openaiResponse.status,
      message: openaiResponse.statusText,
      response,
    });
    throw new Error("OpenAI retrieve failed");
  }

  const openaiPayload = (await openaiResponse.json()) as {
    status?: unknown;
    error?: unknown;
  };
  const status = typeof openaiPayload.status === "string" ? openaiPayload.status : "";

  if (status === "completed") {
    return {
      status: "completed" as const,
      result: await parseCompletedResponse(openaiPayload),
    };
  }

  if (status === "failed" || status === "cancelled" || status === "incomplete") {
    console.error("OpenAI analyze error: background response did not complete");
    console.error("OpenAI raw response:", JSON.stringify(openaiPayload, null, 2));
    return {
      status: "failed" as const,
      error: "本次自动分析失败，请稍后重试，或换一份更清晰的文件再试。",
    };
  }

  return {
    status: "processing" as const,
  };
}
