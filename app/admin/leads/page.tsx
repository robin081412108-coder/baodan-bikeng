import type { Metadata } from "next";
import Link from "next/link";
import { isLeadStorageConfigured, LeadStorageError, listLeads, type Lead } from "@/lib/leads";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "联系方式后台",
  robots: {
    index: false,
    follow: false,
  },
};

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Shanghai",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

async function loadLeads() {
  try {
    return {
      leads: await listLeads(),
      error: "",
    };
  } catch (error) {
    console.error("Admin leads load error:", error);

    return {
      leads: [] as Lead[],
      error:
        error instanceof LeadStorageError
          ? error.message
          : "后台读取联系方式失败，请稍后刷新重试。",
    };
  }
}

export default async function LeadsPage() {
  const { leads, error } = await loadLeads();
  const storageConfigured = isLeadStorageConfigured();

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">保单避坑助手后台</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">联系方式线索</h1>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <p className="text-sm text-slate-500">共 {leads.length} 条</p>
            <Link href="/admin/events" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
              查看行为统计
            </Link>
          </div>
        </div>

        {!storageConfigured || error ? (
          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <p className="font-semibold">联系方式保存通道尚未可用</p>
            <p className="mt-2 leading-7">{error || "请检查服务器保存配置后刷新。"}</p>
          </div>
        ) : null}

        {leads.length === 0 ? (
          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
            还没有用户提交联系方式。
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[1fr_1fr_1.4fr_1fr_1fr] gap-4 border-b border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                <span>提交时间</span>
                <span>微信或邮箱</span>
                <span>最想了解的问题</span>
                <span>上传文件</span>
                <span>材料类型</span>
              </div>
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="grid grid-cols-[1fr_1fr_1.4fr_1fr_1fr] gap-4 border-b border-slate-100 px-4 py-4 text-sm last:border-b-0"
                >
                  <span className="text-slate-500">{formatTime(lead.createdAt)}</span>
                  <span className="break-all font-semibold text-slate-950">{lead.contact}</span>
                  <span className="break-words text-slate-700">{lead.question || "未填写"}</span>
                  <span className="break-all text-slate-600">{lead.fileName || "未记录"}</span>
                  <span className="text-slate-600">{lead.documentType || "未记录"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
