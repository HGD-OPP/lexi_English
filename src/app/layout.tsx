import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/auth";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Lexi · 把单词学成自己的",
    template: "%s · Lexi",
  },
  description:
    "一本安静、专注的英语单词书：词书浏览、3D 闪卡、AI 记忆法与 SM-2 间隔复习。",
  applicationName: "Lexi",
  keywords: ["英语单词", "背单词", "闪卡", "SM-2", "AI 记忆法"],
};

export const viewport: Viewport = {
  themeColor: "#f6f3ea",
  width: "device-width",
  initialScale: 1,
};

// The header reads the Supabase session on every request, so no page that
// shares this layout can be statically pre-rendered.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const viewer = await getViewer();

  return (
    <html lang="zh-CN" className="h-full">
      <body className="flex min-h-full flex-col">
        <SiteHeader viewer={viewer} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
