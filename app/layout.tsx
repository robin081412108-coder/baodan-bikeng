import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AnalyticsPageView } from "./analytics-page-view";
import "./globals.css";

const siteUrl = "https://www.baoxianjiance.cn";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "保单避坑助手 - 上传保险资料，初步识别需要确认的风险点",
    template: "%s | 保单避坑助手",
  },
  description:
    "上传脱敏后的保险计划书、产品说明书或利益演示表，基于文件事实生成 3 条初步风险提示。不卖保险，不推荐产品。",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "保单避坑助手 - 保险资料初步风险提示工具",
    description:
      "上传脱敏后的保险资料，基于文件事实初步识别需要重点确认的金额与条款。",
    url: siteUrl,
    siteName: "保单避坑助手",
    locale: "zh_CN",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="baidu-site-verification" content="codeva-cDzYevrQjW" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              var _hmt = _hmt || [];
              (function() {
                var hm = document.createElement("script");
                hm.src = "https://hm.baidu.com/hm.js?1f2430d9ff55451972357d67e388f200";
                var s = document.getElementsByTagName("script")[0];
                s.parentNode.insertBefore(hm, s);
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AnalyticsPageView />
        {children}
      </body>
    </html>
  );
}
