import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Flame,
  LockKeyhole,
  Target,
} from "lucide-react";

import { getViewer } from "@/lib/auth";
import { getLearningStats, MASTERED_AT } from "@/lib/data";

export const metadata: Metadata = {
  title: "个人中心",
  description: "查看你的学习进度、累计掌握单词和连续打卡天数。",
};

export const dynamic = "force-dynamic";

function displayNameFor(name: string | null, email: string) {
  const trimmed = name?.trim();
  if (trimmed) {
    return trimmed;
  }

  const localPart = email.split("@")[0]?.trim();
  return localPart || "学习者";
}

export default async function DashboardPage() {
  const viewer = await getViewer();

  if (!viewer) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-16 sm:px-6">
        <div className="rounded-[2rem] border border-line bg-cream/70 px-6 py-16 text-center shadow-[var(--shadow-card)]">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-paper-deep text-ink-faint">
            <LockKeyhole className="size-5" strokeWidth={1.6} />
          </span>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Personal dashboard
          </p>
          <h1 className="mt-2 font-display text-4xl tracking-tight">
            登录后查看个人中心
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-ink-soft">
            学习进度、连续打卡和掌握单词数都绑定在你的账号上。登录之后，这里会记录你每一次认真的复习。
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/login?next=%2Fdashboard"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-5 text-xs font-medium text-paper transition hover:bg-moss"
            >
              登录 / 注册
              <ArrowUpRight className="size-3.5" />
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-full border border-line bg-cream px-5 text-xs text-ink-soft transition hover:border-moss/30 hover:text-ink"
            >
              先逛逛词书
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { stats, source } = await getLearningStats(viewer);
  const displayName = displayNameFor(viewer.name, viewer.email);
  const initial = displayName.charAt(0).toUpperCase();
  const progress =
    stats.totalWords > 0
      ? Math.min(100, Math.round((stats.mastered / stats.totalWords) * 100))
      : 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <section className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div className="stat-card-hover relative overflow-hidden rounded-[2rem] border border-line bg-cream/70 p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-lime/50 blur-3xl"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-center gap-4">
              <span className="grid size-16 shrink-0 place-items-center rounded-[1.35rem] border border-moss/15 bg-lime font-display text-2xl text-moss-deep shadow-sm">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                  Your profile
                </p>
                <h1 className="mt-1 break-words font-display text-4xl tracking-tight sm:text-5xl">
                  {displayName}
                </h1>
                <p className="mt-1.5 break-all text-sm text-ink-soft">
                  {viewer.email}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-moss/15 bg-paper/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-moss">
              <span className="size-1.5 rounded-full bg-moss" />
              {source === "database" ? "Learning in progress" : "Preview mode"}
            </span>
          </div>

          <div className="relative mt-8 border-t border-line/80 pt-5">
            <p className="max-w-md font-display text-xl leading-relaxed text-ink-soft">
              “每天多认识一点，世界就宽一点。”
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-5 text-xs font-medium text-paper transition hover:bg-moss"
              >
                继续学习
                <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href="/bookmarks"
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-cream px-5 text-xs text-ink-soft transition hover:border-moss/30 hover:text-ink"
              >
                查看生词本
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="stat-card-hover relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-ink p-6 text-paper sm:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-lime/10 blur-3xl"
          />
          <div className="relative flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45">
              Study streak
            </p>
            <Flame className="size-5 text-sun" strokeWidth={1.6} />
          </div>

          <div className="relative mt-8 flex items-end gap-2">
            <p className="font-display text-7xl leading-none">
              {stats.streak}
            </p>
            <span className="pb-1 text-sm text-paper/50">天连续打卡</span>
          </div>

          <div className="relative mt-5">
            <div className="flex items-center justify-between text-[10px] text-paper/45">
              <span className="font-mono uppercase tracking-[0.14em]">
                今日学习
              </span>
              <span>
                {stats.todayStudied} / {stats.streakGoal} 词
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper/10">
              <div
                className="h-full rounded-full bg-sun transition-[width] duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (stats.todayStudied / stats.streakGoal) * 100,
                    ),
                  )}%`,
                }}
              />
            </div>
            <p className="mt-2.5 text-xs leading-6 text-paper/55">
              {stats.checkedInToday
                ? `今日已学 ${stats.todayStudied} 词，已完成打卡。`
                : `今日已学 ${stats.todayStudied} 词，再学 ${stats.streakRemaining} 词即可打卡。`}
            </p>
          </div>

          <div className="relative mt-5 flex gap-1.5" aria-hidden>
            {Array.from({ length: 7 }).map((_, index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-full ${
                  index < Math.min(stats.streak, 7) ? "bg-lime" : "bg-paper/10"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.6rem] border border-line bg-cream/70 p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              Mastered
            </p>
            <Target className="size-4 text-moss" strokeWidth={1.6} />
          </div>
          <p className="mt-6 flex items-baseline gap-1.5">
            <span className="font-display text-5xl leading-none text-ink">
              {stats.mastered}
            </span>
            <span className="text-xs text-ink-faint">/ {stats.totalWords} 词</span>
          </p>
          <p className="mt-2 text-xs text-ink-soft">
            熟练度达到 {MASTERED_AT} 即计入掌握
          </p>
        </div>

        <div className="rounded-[1.6rem] border border-line bg-cream/70 p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              Studied
            </p>
            <BookOpen className="size-4 text-moss" strokeWidth={1.6} />
          </div>
          <p className="mt-6 flex items-baseline gap-1.5">
            <span className="font-display text-5xl leading-none text-ink">
              {stats.studied}
            </span>
            <span className="text-xs text-ink-faint">个单词</span>
          </p>
          <p className="mt-2 text-xs text-ink-soft">
            已经留下复习记录的单词
          </p>
        </div>

        <div className="rounded-[1.6rem] border border-line bg-cream/70 p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              Due today
            </p>
            <CalendarDays className="size-4 text-moss" strokeWidth={1.6} />
          </div>
          <p className="mt-6 flex items-baseline gap-1.5">
            <span className="font-display text-5xl leading-none text-ink">
              {stats.due}
            </span>
            <span className="text-xs text-ink-faint">个待复习</span>
          </p>
          <p className="mt-2 text-xs text-ink-soft">
            到期后及时复习，记忆会更牢
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-[1.6rem] border border-line bg-cream/70 p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              Overall progress
            </p>
            <p className="mt-1 font-display text-2xl tracking-tight">
              把单词，慢慢变成自己的。
            </p>
          </div>
          <p className="font-display text-3xl text-moss">{progress}%</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-moss transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          已掌握 {stats.mastered} 个，全部词库共 {stats.totalWords} 个；生词本里还有{" "}
          {stats.bookmarked} 个词等你再见一面。
        </p>
      </section>
    </div>
  );
}
