import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findGuide, guides } from "@/lib/guides";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = findGuide(slug);

  if (!guide) {
    return {};
  }

  return {
    title: guide.title,
    description: guide.description,
    alternates: {
      canonical: `/guides/${guide.slug}`,
    },
    openGraph: {
      title: guide.title,
      description: guide.description,
      type: "article",
      url: `/guides/${guide.slug}`,
    },
  };
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = findGuide(slug);

  if (!guide) {
    notFound();
  }

  const relatedGuides = guides.filter((item) => item.slug !== guide.slug).slice(0, 3);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link href="/" className="text-sm font-semibold text-emerald-700">
            保单避坑助手
          </Link>
          <Link href="/#upload" className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
            上传资料初筛
          </Link>
        </div>
      </header>

      <article className="px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold text-emerald-700">{guide.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-slate-950">{guide.title}</h1>
          <p className="mt-6 rounded-lg border border-slate-200 bg-white p-5 leading-8 text-slate-700 shadow-sm">
            {guide.summary}
          </p>

          <div className="mt-10 space-y-10">
            {guide.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-2xl font-bold text-slate-950">{section.heading}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-4 leading-8 text-slate-700">
                    {paragraph}
                  </p>
                ))}
                {section.items && (
                  <ul className="mt-4 space-y-3">
                    {section.items.map((item) => (
                      <li
                        key={item}
                        className="rounded-md border border-slate-200 bg-white px-4 py-3 leading-7 text-slate-700"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <section className="mt-12 rounded-lg border border-emerald-200 bg-emerald-50 p-6">
            <h2 className="text-2xl font-bold text-slate-950">手里已有保险资料？</h2>
            <p className="mt-3 leading-7 text-slate-700">
              上传脱敏后的计划书、说明书、利益演示表或条款，免费查看 3 条需要进一步确认的初步风险提示。
            </p>
            <Link
              href="/#upload"
              className="mt-5 inline-flex rounded-md bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800"
            >
              上传脱敏资料，免费初筛
            </Link>
          </section>

          <section className="mt-12 border-t border-slate-200 pt-8">
            <h2 className="text-xl font-bold text-slate-950">继续阅读</h2>
            <div className="mt-4 grid gap-3">
              {relatedGuides.map((item) => (
                <Link
                  key={item.slug}
                  href={`/guides/${item.slug}`}
                  className="rounded-md bg-white p-4 text-sm font-semibold text-slate-800 shadow-sm hover:text-emerald-700"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </section>

          <p className="mt-10 text-sm leading-7 text-slate-500">
            本工具及本页内容仅供初步参考，不构成保险建议、法律建议、投资建议、购买建议或退保建议。具体保障责任、现金价值、免责条款、退保金额和理赔条件，请以正式保险合同和保险公司文件为准。
          </p>
        </div>
      </article>
    </main>
  );
}
