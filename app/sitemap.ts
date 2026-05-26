import type { MetadataRoute } from "next";
import { guides } from "@/lib/guides";

const siteUrl = "https://www.baoxianjiance.cn";

export default function sitemap(): MetadataRoute.Sitemap {
  const guideUrls = guides.map((guide) => ({
    url: `${siteUrl}/guides/${guide.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/guides`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...guideUrls,
    {
      url: `${siteUrl}/privacy`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
