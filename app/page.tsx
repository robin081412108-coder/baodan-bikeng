"use client";

import { useMemo, useState } from "react";

type RiskLevel = "高" | "中" | "低";

type RiskItem = {
  riskTitle: string;
  riskLevel: RiskLevel;
  factFromDocument: string;
  whyItMatters: string;
  needToConfirm: string;
};

type AnalysisResult = {
  documentType: string;
  materialCompleteness: string;
  missingInfo: string[];
  risks: RiskItem[];
  disclaimer: string;
};

type AnalysisJobResponse = {
  jobId: string;
  status: "processing";
  error?: string;
};

type AnalysisJobStatus = {
  id: string;
  status: "processing" | "completed" | "failed";
  result?: AnalysisResult;
  error?: string;
};

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ".pdf,.jpg,.jpeg,.png,.webp,.txt,.md,.docx";

const exampleRisks: RiskItem[] = [
  {
    riskTitle: "前期退保损失可能较高",
    riskLevel: "高",
    factFromDocument:
      "年交保费 30,000 元，交满 3 年累计 90,000 元；第 3 年退保现金价值仅约 42,600 元，少拿约 47,400 元。",
    whyItMatters:
      "举例看，第 3 年退保时一共交了 90,000 元，拿到手约 42,600 元，直接少 47,400 元；即使不和任何收益对比，本金差额也接近一半。",
    needToConfirm:
      "请确认第几年现金价值超过累计保费，以及退保金额是否为保证现金价值。",
  },
  {
    riskTitle: "演示收益不等于保证收益",
    riskLevel: "中",
    factFromDocument:
      "第 20 年高档演示利益约 612,000 元，但保证现金价值仅约 238,000 元；页面重点展示的是非保证数字。",
    whyItMatters:
      "举例看，第 20 年高档演示是 612,000 元，但保证现金价值只有 238,000 元，两者相差 374,000 元；用户如果只盯着高档演示，容易把不保证的钱当成确定能拿的钱。",
    needToConfirm:
      "请确认哪些金额是保证的，哪些金额是不保证的，以及不同档位的假设依据。",
  },
  {
    riskTitle: "保障责任需看完整条款",
    riskLevel: "中",
    factFromDocument:
      "宣传页写主险保额 500,000 元，但等待期 90 天内出险可能不赔；且未展示责任免除、医院范围和既往症限制。",
    whyItMatters:
      "举例看，如果等待期是 90 天，投保后第 60 天发生合同约定外或等待期内事故，即使页面写着 500,000 元保额，也可能不是按 500,000 元赔付，关键要看正式条款怎么限制。",
    needToConfirm:
      "请查看正式保险合同中的责任免除、等待期、医院范围和理赔条件。",
  },
];

const materialTips = [
  "保险计划书",
  "产品说明书",
  "利益演示表",
  "脱敏后保单",
  "现金价值表",
  "保障责任页",
  "完整保险条款",
  "截图或图片",
  "Word 文件",
];

const uploadGuideCards = [
  {
    title: "销售发过计划书？",
    text: "直接传，先看看退保损失、演示收益这些地方有没有需要重点确认的数字。",
  },
  {
    title: "已经买过保险？",
    text: "传脱敏后的保单、截图或现金价值表，看看保障和退保金额哪里要重点确认。",
  },
  {
    title: "只有零散资料？",
    text: "也可以先传，系统会尽量从文件里提取金额、年份、等待期和免责限制。",
  },
];

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [contact, setContact] = useState("");
  const [question, setQuestion] = useState("");
  const [leadStatus, setLeadStatus] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");

  const primaryButtonText = useMemo(() => {
    if (isAnalyzing) {
      return "识别中";
    }

    if (analysisResult) {
      return "重新初筛";
    }

    return "开始初步识别";
  }, [analysisResult, isAnalyzing]);

  async function handleAnalyze() {
    if (!privacyConfirmed || isAnalyzing) {
      return;
    }

    if (!selectedFile) {
      setErrorMessage("请先选择一份保险资料文件。");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setErrorMessage("文件过大，请上传 20MB 以内的文件。");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setErrorMessage("");
    setAnalysisMessage("已收到文件，正在排队分析，请稍等。");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/analyze/start", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as AnalysisJobResponse | { error?: string };

      if (!response.ok || ("error" in payload && payload.error)) {
        setErrorMessage(
          "error" in payload && payload.error
            ? payload.error
            : "本次自动分析失败，请稍后重试，或换一份更清晰的文件再试。",
        );
        return;
      }

      const { jobId } = payload as AnalysisJobResponse;
      setAnalysisMessage("正在分析文件，通常需要几十秒。页面会自动刷新结果。");

      for (let attempt = 0; attempt < 90; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));

        const statusResponse = await fetch(`/api/analyze/jobs/${jobId}`, {
          cache: "no-store",
        });
        const statusPayload = (await statusResponse.json()) as
          | AnalysisJobStatus
          | { error?: string };

        if (!statusResponse.ok || ("error" in statusPayload && statusPayload.error)) {
          setErrorMessage(
            "error" in statusPayload && statusPayload.error
              ? statusPayload.error
              : "分析任务状态异常，请重新上传再试。",
          );
          return;
        }

        const job = statusPayload as AnalysisJobStatus;
        if (job.status === "completed" && job.result) {
          setAnalysisResult({
            ...job.result,
            risks: job.result.risks.slice(0, 3),
          });
          setAnalysisMessage("");
          return;
        }

        if (job.status === "failed") {
          setErrorMessage(job.error || "本次自动分析失败，请稍后重试。");
          return;
        }

        if (attempt === 10) {
          setAnalysisMessage("文件仍在分析中，PDF 页数较多时会更慢一点。");
        }

        if (attempt === 30) {
          setAnalysisMessage("还在继续分析，请不要关闭页面。");
        }
      }

      setErrorMessage("本次分析等待时间较长，请稍后重新上传，或换一份页数更少的资料。");
    } catch {
      setErrorMessage("本次自动分析失败，请稍后重试，或换一份更清晰的文件再试。");
    } finally {
      setIsAnalyzing(false);
      setAnalysisMessage("");
    }
  }

  async function handleSubmitLead() {
    if (!contact.trim()) {
      setLeadStatus("请先填写微信或邮箱。");
      return;
    }

    setIsSubmittingLead(true);
    setLeadStatus("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contact,
          question,
          fileName: selectedFile?.name ?? "",
          documentType: analysisResult?.documentType ?? "",
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setLeadStatus(payload.error || "提交失败，请稍后再试。");
        return;
      }

      setLeadStatus("已提交，我们会根据这份结果整理需要进一步确认的问题。");
      setContact("");
      setQuestion("");
    } catch {
      setLeadStatus("提交失败，请稍后再试。");
    } finally {
      setIsSubmittingLead(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 py-8 sm:px-8 lg:py-12">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">保单避坑助手</p>
            <p className="mt-1 text-xs text-slate-500">保险资料风险提示工具</p>
          </div>
          <a
            href="#upload"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
          >
            开始免费初筛
          </a>
        </header>

        <section className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="py-8 sm:py-12">
            <p className="mb-7 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium leading-6 text-emerald-800">
              不卖保险，不推荐产品
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-normal text-slate-950 sm:text-5xl">
              免费保单检测
              <br />
              助你找出风险点
            </h1>
            <p className="mt-8 max-w-2xl text-lg font-semibold leading-9 text-amber-700">
              精准找出销售最不想让你知道的雷点
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <a
                href="#upload"
                className="inline-flex whitespace-nowrap justify-center rounded-md bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-800"
              >
                开始免费初筛
              </a>
              <p className="text-sm leading-7 text-slate-500">
                上传计划书、说明书、保单、截图等资料，系统会尽量分析
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-bold text-slate-950">结果示例</h2>
            </div>
            <div className="mt-5 space-y-4">
              {exampleRisks.map((risk, index) => (
                <div key={risk.riskTitle} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-900">
                      {index + 1}. {risk.riskTitle}
                    </p>
                    <RiskBadge level={risk.riskLevel} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{risk.factFromDocument}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>

      <section id="upload" className="bg-white/70 px-5 py-12 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-950">上传以下任意一种资料即可。</h2>
            <p className="mt-3 leading-7 text-slate-600">
              以下材料任意选择一份上传即可。通常可以找保险销售索取，也可以通过保险公司 APP、官网、客服电话下载或申请电子版。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {materialTips.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
                >
                  {item}
                </span>
              ))}
            </div>
            <p className="mt-6 text-sm leading-7 text-slate-500">
              上传前请遮挡：姓名、手机号、身份证号、银行卡号、详细住址、病史、体检信息等敏感内容。
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold text-slate-950">上传区域</h2>
              <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                尽量上传清晰文件
              </span>
            </div>

            <label className="mt-6 block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center transition hover:border-emerald-500 hover:bg-emerald-50/50">
              <input
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedFile(file);
                  setAnalysisResult(null);
                  setErrorMessage("");
                }}
              />
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-white text-lg font-bold text-emerald-700 shadow-sm">
                AI
              </div>
              <p className="mt-4 text-base font-semibold text-slate-900">
                选择或拖放保险资料文件
              </p>
              {selectedFile ? (
                <p className="mt-3 break-all text-sm leading-6 text-emerald-700">
                  已选择：{selectedFile.name}
                </p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  支持 PDF、Word、JPG、PNG、WEBP、TXT、MD；文件越清晰，识别越容易
                </p>
              )}
            </label>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={privacyConfirmed}
                onChange={(event) => setPrivacyConfirmed(event.target.checked)}
                className="mt-1 h-4 w-4 accent-emerald-700"
              />
              <span className="text-sm leading-6 text-slate-700">
                我确认已尽量遮挡个人敏感信息，并知晓本工具仅供初步参考。
              </span>
            </label>

            {errorMessage && (
              <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {errorMessage}
              </div>
            )}

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!privacyConfirmed || isAnalyzing}
              className="mt-5 w-full rounded-md bg-emerald-700 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              {primaryButtonText}
            </button>
          </div>
        </div>
      </section>

      {(isAnalyzing || analysisResult) && (
        <section className="px-5 py-12 sm:px-8">
          <div className="mx-auto max-w-6xl">
            {isAnalyzing && (
              <div className="rounded-lg border border-emerald-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
                  <p className="font-medium text-slate-800">
                    {analysisMessage || "正在阅读文件并提取需要注意的信息，结果仅供初步参考"}
                  </p>
                </div>
              </div>
            )}

            {analysisResult && (
              <div className="space-y-6">
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold text-emerald-700">初步识别结果</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <SummaryBlock title="材料类型" text={analysisResult.documentType} />
                    <SummaryBlock title="材料完整度" text={analysisResult.materialCompleteness} />
                    <SummaryBlock
                      title="缺失信息"
                      text={
                        analysisResult.missingInfo.length > 0
                          ? analysisResult.missingInfo.join("；")
                          : "暂未发现明显缺失信息"
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-5">
                  {analysisResult.risks.map((risk, index) => (
                    <article
                      key={`${risk.riskTitle}-${index}`}
                      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-xl font-bold text-slate-950">{risk.riskTitle}</h3>
                        <RiskBadge level={risk.riskLevel} prefix="风险等级：" />
                      </div>
                      <div className="mt-5 grid gap-4 lg:grid-cols-3">
                        <ResultBlock title="文件中看到的事实" text={risk.factFromDocument} />
                        <ResultBlock title="为什么需要注意" text={risk.whyItMatters} />
                        <ResultBlock title="进一步需要确认" text={risk.needToConfirm} />
                      </div>
                    </article>
                  ))}
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
                  <h2 className="text-2xl font-bold text-slate-950">
                    想知道这 3 个问题该怎么问销售或客服？
                  </h2>
                  <p className="mt-2 leading-7 text-slate-600">
                    留下微信或邮箱，我们可以根据这次结果，帮你整理一份更好开口的确认清单：该问什么、要销售补哪几页、哪些数字一定要截图留底。
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-[0.85fr_1.15fr_auto]">
                    <input
                      type="text"
                      placeholder="微信或邮箱"
                      value={contact}
                      onChange={(event) => {
                        setContact(event.target.value);
                        setLeadStatus("");
                      }}
                      className="min-h-12 rounded-md border border-slate-300 bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />
                    <input
                      type="text"
                      placeholder="比如：我想知道第几年退保不亏"
                      value={question}
                      onChange={(event) => {
                        setQuestion(event.target.value);
                        setLeadStatus("");
                      }}
                      className="min-h-12 rounded-md border border-slate-300 bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />
                    <button
                      type="button"
                      onClick={handleSubmitLead}
                      disabled={isSubmittingLead}
                      className="rounded-md bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {isSubmittingLead ? "提交中" : "获取确认清单"}
                    </button>
                  </div>
                  {leadStatus && (
                    <p className="mt-3 text-sm font-medium text-emerald-800">{leadStatus}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="bg-white px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-3xl font-bold text-slate-950">上传很简单</h2>
            <p className="max-w-xl text-sm leading-7 text-slate-500">
              不用整理材料，先上传你手里最像保险文件的那一份。
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {uploadGuideCards.map((card) => (
              <div key={card.title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-semibold text-slate-950">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-6xl rounded-lg border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600 shadow-sm">
          <p className="font-semibold text-slate-900">免责声明</p>
          <p className="mt-2">
            本工具生成内容仅供初步参考，不构成保险建议、法律建议、投资建议、购买建议或退保建议。具体保障责任、现金价值、免责条款、退保金额和理赔条件，请以正式保险合同和保险公司文件为准。
          </p>
          <a
            href="/privacy"
            className="mt-4 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            查看隐私与资料使用说明
          </a>
        </div>
      </footer>
    </main>
  );
}

function RiskBadge({ level, prefix = "" }: { level: RiskLevel; prefix?: string }) {
  return (
    <span
      className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${
        level === "高"
          ? "bg-red-50 text-red-700"
          : level === "中"
            ? "bg-amber-50 text-amber-700"
            : "bg-slate-100 text-slate-700"
      }`}
    >
      {prefix}
      {level}
      风险
    </span>
  );
}

function SummaryBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-900">{text}</p>
    </div>
  );
}

function ResultBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-800">{text}</p>
    </div>
  );
}
