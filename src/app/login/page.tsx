import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bookmark, Sparkles, Waves } from "lucide-react";

import { AuthForm } from "@/components/auth/auth-form";
import { getViewer } from "@/lib/auth";
import { sanitizeNextPath } from "@/lib/redirect";

export const metadata: Metadata = {
  title: "登录",
  description: "登录 Lexi，同步你的单词学习进度和生词本。",
};

const benefits = [
  {
    icon: Sparkles,
    title: "间隔复习",
    description: "根据熟悉程度安排下一次复习，不浪费每一次相遇。",
  },
  {
    icon: Bookmark,
    title: "个人生词本",
    description: "把阅读中绊住你的词收进来，随时开始一轮集中复习。",
  },
  {
    icon: Waves,
    title: "AI 记忆法",
    description: "联想、词根、谐音三种提示，给抽象拼写一个有画面的抓手。",
  },
];

type LoginPageProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = sanitizeNextPath(params.next);
  const callbackFailed = Boolean(params.error);

  const viewer = await getViewer();
  if (viewer) {
    redirect(next);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-ink-soft transition hover:text-ink"
      >
        <ArrowLeft className="size-3.5" strokeWidth={1.8} />
        回到词书
      </Link>

      <div className="mt-4 grid overflow-hidden rounded-[2rem] border border-line bg-cream shadow-[var(--shadow-card)] lg:grid-cols-[1.05fr_1fr]">
        <aside className="paper-grain relative flex flex-col justify-between overflow-hidden bg-moss-deep p-7 text-paper sm:p-10">
          <div
            className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full border border-paper/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-28 -left-16 size-72 rounded-full bg-lime/5"
            aria-hidden
          />

          <div className="relative">
            <p className="font-display text-2xl tracking-tight text-lime">
              lexi.
            </p>
            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/40">
              Learn one word at a time
            </p>
            <blockquote className="mt-3 max-w-sm font-display text-3xl leading-[1.25] tracking-tight sm:text-4xl">
              “A word after a word after a word is power.”
            </blockquote>
            <p className="mt-3 text-xs text-paper/45">Margaret Atwood</p>
          </div>

          <ul className="relative mt-10 space-y-4 border-t border-paper/10 pt-6">
            {benefits.map((benefit) => (
              <li key={benefit.title} className="flex gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-paper/8 text-lime/80">
                  <benefit.icon className="size-4" strokeWidth={1.7} />
                </span>
                <span>
                  <span className="block text-xs font-medium text-paper/90">
                    {benefit.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-5 text-paper/40">
                    {benefit.description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="p-6 sm:p-9 lg:p-10">
          {callbackFailed ? (
            <p className="mb-5 rounded-xl border border-[#c97363]/30 bg-rose/30 px-3 py-2.5 text-xs leading-5 text-[#8b4036]">
              登录链接已失效，或邮箱确认没有完成。请重新登录，或者再注册一次。
            </p>
          ) : null}
          <AuthForm next={next} />
        </div>
      </div>
    </div>
  );
}
