import type { Metadata } from "next";
import Link from "next/link";
import { listEvents, type SiteEvent } from "@/lib/events";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "行为统计后台",
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

function isToday(value: string) {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date(value)) === formatter.format(new Date());
}

function eventKey(event: SiteEvent) {
  return `${event.category} / ${event.action}`;
}

function countByEvent(events: SiteEvent[]) {
  const counts = new Map<string, number>();

  for (const event of events) {
    const key = eventKey(event);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function countByPath(events: SiteEvent[]) {
  const counts = new Map<string, number>();

  for (const event of events) {
    if (event.category !== "页面" || event.action !== "访问") {
      continue;
    }

    const key = event.path || "未记录";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function countBySource(events: SiteEvent[]) {
  const counts = new Map<string, number>();

  for (const event of events) {
    if (event.category !== "页面" || event.action !== "访问") {
      continue;
    }

    const key = event.source || "直接访问";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function getCount(events: SiteEvent[], category: string, action: string) {
  return events.filter((event) => event.category === category && event.action === action).length;
}

function percent(part: number, total: number) {
  if (!total) {
    return "0%";
  }

  return `${Math.round((part / total) * 1000) / 10}%`;
}

export default async function EventsPage() {
  const events = await listEvents();
  const todayEvents = events.filter((event) => isToday(event.createdAt));
  const allCounts = countByEvent(events);
  const pathCounts = countByPath(events);
  const sourceCounts = countBySource(events);
  const recentEvents = events.slice(0, 120);

  const selectedFiles = getCount(events, "初筛流程", "选择文件");
  const analysisStarted = getCount(events, "初筛流程", "开始分析");
  const analysisCompleted = getCount(events, "初筛流程", "分析成功");
  const reportInterest = getCount(events, "详细报告", "点击意向按钮");
  const leadSubmitted = getCount(events, "留资", "提交成功");

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">保单避坑助手后台</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">行为统计</h1>
          </div>
          <Link href="/admin/leads" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            查看联系方式线索
          </Link>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            { title: "累计事件", value: events.length },
            { title: "今日事件", value: todayEvents.length },
            { title: "完成分析", value: analysisCompleted },
            { title: "详细报告点击", value: reportInterest },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{item.title}</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">核心转化漏斗</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {[
              { title: "选择文件", value: selectedFiles, rate: "起点" },
              { title: "开始分析", value: analysisStarted, rate: percent(analysisStarted, selectedFiles) },
              { title: "分析成功", value: analysisCompleted, rate: percent(analysisCompleted, analysisStarted) },
              { title: "点击详细报告", value: reportInterest, rate: percent(reportInterest, analysisCompleted) },
              { title: "提交联系方式", value: leadSubmitted, rate: percent(leadSubmitted, analysisCompleted) },
            ].map((item) => (
              <div key={item.title} className="rounded-md bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{item.title}</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{item.value}</p>
                <p className="mt-1 text-sm text-emerald-700">{item.rate}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <SummaryList title="事件排行" items={allCounts.slice(0, 10)} />
          <SummaryList title="访问页面" items={pathCounts} />
          <SummaryList title="来源" items={sourceCounts} />
        </section>

        <section className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr_1.4fr_1fr] gap-4 border-b border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
              <span>时间</span>
              <span>类别</span>
              <span>动作</span>
              <span>标签</span>
              <span>页面</span>
              <span>来源</span>
            </div>
            {recentEvents.length === 0 ? (
              <div className="px-4 py-8 text-slate-600">还没有记录到行为事件。</div>
            ) : (
              recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="grid grid-cols-[1.1fr_1fr_1fr_1fr_1.4fr_1fr] gap-4 border-b border-slate-100 px-4 py-4 text-sm last:border-b-0"
                >
                  <span className="text-slate-500">{formatTime(event.createdAt)}</span>
                  <span className="font-semibold text-slate-900">{event.category}</span>
                  <span className="text-slate-700">{event.action}</span>
                  <span className="text-slate-600">{event.label || "-"}</span>
                  <span className="break-all text-slate-600">{event.path || "-"}</span>
                  <span className="break-all text-slate-600">{event.source || "直接访问"}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <p className="mt-5 text-sm leading-7 text-slate-500">
          这里仅记录匿名行为动作与页面路径，不记录上传文件内容、联系方式、分析结果或 IP 地址。百度统计仍可用于查看大盘访问来源。
        </p>
      </div>
    </main>
  );
}

function SummaryList({ title, items }: { title: string; items: Array<{ name: string; count: number }> }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">暂无数据</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-4 text-sm">
              <span className="break-all text-slate-700">{item.name}</span>
              <span className="font-semibold text-slate-950">{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
