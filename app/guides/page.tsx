import type { Metadata } from "next";
import Link from "next/link";
import { guides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "保险资料阅读指南",
  description: "了解保险计划书、现金价值、利益演示表与上传脱敏的基础确认方法。",
  alternates: {
    canonical: "/guides",
  },
};

export default function GuidesPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link href="/" className="text-sm font-semibold text-emerald-700">
            保单避坑助手
          </Link>
          <Link href="/#upload" className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
            上传资料初筛
          </Link>
        </div>
      </header>

      <section className="px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold text-emerald-700">保险资料阅读指南</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-slate-950">
            先看懂资料里的关键金额与条款
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-slate-600">
            以下内容帮助普通人识别保险资料中值得进一步确认的位置。内容仅供初步参考，具体责任、金额与条件仍以正式合同和保险公司文件为准。
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {guides.map((guide) => (
              <Link
                href={`/guides/${guide.slug}`}
                key={guide.slug}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-300"
              >
                <p className="text-sm font-semibold text-emerald-700">{guide.eyebrow}</p>
                <h2 className="mt-2 text-xl font-bold leading-8 text-slate-950">{guide.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{guide.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
