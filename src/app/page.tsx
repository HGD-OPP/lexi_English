import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Flame,
  Layers,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { getViewer } from "@/lib/auth";
import { getLearningStats, getWordBooks } from "@/lib/data";
import type { WordBookSummary } from "@/lib/types";

// The header and today card depend on the signed-in viewer.
export const dynamic = "force-dynamic";

function BookCard({
  book,
  index,
}: {
  book: WordBookSummary;
  index: number;
}) {
  const started = book.masteredCount > 0;

  return (
    <Link
      href={`/books/${book.slug}`}
      className="paper-grain group relative flex min-h-[17rem] flex-col overflow-hidden rounded-[2rem] border border-ink/5 p-6 shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-float)] sm:p-7"
      style={{ backgroundColor: book.accent }}
    >
      <span
        className="pointer-events-none absolute -bottom-9 -right-3 rotate-[-8deg] text-[8rem] leading-none opacity-15 transition duration-500 group-hover:rotate-[-2deg] group-hover:opacity-25"
        aria-hidden="true"
      >
        {book.emoji}
      </span>

      <div className="relative flex items-start justify-between gap-4">
        <span className="grid size-12 place-items-center rounded-2xl border border-ink/10 bg-cream/65 text-2xl shadow-sm backdrop-blur">
          {book.emoji}
        </span>
        <span className="rounded-full border border-ink/10 bg-cream/55 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
          {book.level}
        </span>
      </div>

      <div className="relative mt-7">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
          <span>Book {String(index + 1).padStart(2, "0")}</span>
          <span className="h-px w-5 bg-ink/20" />
          <span>{book.wordCount} words</span>
        </div>
        <h3 className="mt-2 font-display text-[1.85rem] leading-tight tracking-tight text-ink sm:text-[2rem]">
          {book.title}
        </h3>
        <p className="mt-1.5 text-sm text-ink-soft">{book.subtitle}</p>
      </div>

      <div className="relative mt-auto pt-7">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between text-[11px] text-ink-faint">
              <span>
                {started ? `已掌握 ${book.masteredCount} 词` : "尚未开始"}
              </span>
              <span>{book.progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full bg-moss transition-all duration-700"
                style={{ width: `${Math.max(book.progress, 2)}%` }}
              />
            </div>
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-ink/10 bg-cream/55 transition group-hover:bg-ink group-hover:text-paper">
            <ChevronRight className="size-4" strokeWidth={1.8} />
          </span>
        </div>
        {book.newCount > 0 || book.dueCount > 0 ? (
          <p className="mt-3 text-[11px] font-medium text-moss-deep">
            {book.newCount} 个新词 · {book.dueCount} 个待复习
          </p>
        ) : (
          <p className="mt-3 text-[11px] font-medium text-moss-deep">
            这本词书今天已完成
          </p>
        )}
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const viewer = await getViewer();
  const [booksResult, statsResult] = await Promise.all([
    getWordBooks(viewer),
    getLearningStats(viewer),
  ]);
  const { books, source } = booksResult;
  const { stats } = statsResult;

  const today = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  const firstName =
    viewer?.name?.trim().split(/\s+/)[0] ||
    viewer?.email.split("@")[0] ||
    "同学";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6">
      <section className="grid items-end gap-10 pb-14 pt-12 sm:pt-16 lg:grid-cols-[1.25fr_0.75fr] lg:gap-14 lg:pb-20 lg:pt-20">
        <div className="animate-fade-up">
          <p className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.24em] text-moss">
            <span className="size-1.5 rounded-full bg-moss" />
            A quieter way to remember
          </p>
          <h1 className="text-balance mt-5 font-display text-[3.4rem] leading-[0.95] tracking-[-0.035em] text-ink sm:text-7xl lg:text-[5.2rem]">
            把单词，
            <br />
            学成
            <span className="relative mx-1 inline-block text-moss">
              自己
              <svg
                className="absolute -bottom-1 left-0 w-full text-moss/35"
                viewBox="0 0 120 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 8.5C27 3 81 2.5 117 7"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            的。
          </h1>
          <p className="mt-6 max-w-lg text-[15px] leading-7 text-ink-soft sm:text-base">
            不追赶进度条。挑一本词书，用一张张闪卡把词义、例句和记忆线索连成自己的故事，再交给 SM-2 在恰当的时候提醒你。
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="#wordbooks"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm text-paper transition hover:bg-moss-deep"
            >
              挑一本词书
              <ArrowRight className="size-4" strokeWidth={1.8} />
            </Link>
            <Link
              href="/bookmarks"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-cream/60 px-5 text-sm text-ink transition hover:border-moss/30 hover:bg-cream"
            >
              打开生词本
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-faint">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="size-3.5" strokeWidth={1.8} />
              {books.length} 本主题词书
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="size-3.5" strokeWidth={1.8} />
              {stats.totalWords} 个精选单词
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="size-3.5" strokeWidth={1.8} />
              AI 联想记忆
            </span>
          </div>
        </div>

        <aside className="animate-fade-up [animation-delay:120ms]">
          <div className="stat-card-hover relative overflow-hidden rounded-[2rem] bg-ink p-6 text-paper shadow-[var(--shadow-float)] sm:p-7">
            <div
              className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full border-[28px] border-lime/10"
              aria-hidden="true"
            />
            <div className="relative flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45">
                Today · {today}
              </p>
              <span className="grid size-8 place-items-center rounded-full bg-paper/10">
                <Flame className="size-4 text-sun" strokeWidth={1.8} />
              </span>
            </div>

            <p className="relative mt-7 font-display text-2xl">
              {viewer ? `${firstName}，慢慢来。` : "先登录，再开始积累。"}
            </p>

            <div className="relative mt-5">
              <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                <span className="font-display text-7xl leading-none tracking-tight text-lime">
                  {viewer ? stats.newWords : "—"}
                </span>
                <span className="pb-1.5 text-sm leading-5 text-paper/55">
                  个新词
                </span>
                <span className="pb-1.5 text-lg text-paper/25">·</span>
                <span className="pb-1 font-display text-3xl leading-none text-paper">
                  {viewer ? stats.due : "—"}
                </span>
                <span className="pb-1.5 text-sm leading-5 text-paper/55">
                  个待复习
                </span>
              </div>

              {viewer ? (
                <div className="mt-5 rounded-2xl border border-paper/10 bg-paper/[0.06] px-3.5 py-3">
                  <div className="flex items-center justify-between text-[10px] text-paper/50">
                    <span className="font-mono uppercase tracking-[0.14em]">
                      Daily check-in
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
                  <p className="mt-2 text-[11px] leading-5 text-paper/55">
                    {stats.checkedInToday
                      ? `今日已学 ${stats.todayStudied} 词，已完成打卡。`
                      : `今日已学 ${stats.todayStudied} 词，再学 ${stats.streakRemaining} 词即可打卡。`}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="relative mt-7 grid grid-cols-2 gap-3 border-t border-paper/10 pt-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/40">
                  Streak
                </p>
                <p className="mt-1 text-lg">
                  {viewer ? stats.streak : 0}
                  <span className="ml-1 text-xs text-paper/50">天</span>
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/40">
                  Mastered
                </p>
                <p className="mt-1 text-lg">
                  {viewer ? stats.mastered : 0}
                  <span className="ml-1 text-xs text-paper/50">词</span>
                </p>
              </div>
            </div>

            <Link
              href={viewer ? "#wordbooks" : "/login"}
              className="relative mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-lime text-sm font-medium text-ink transition hover:bg-cream"
            >
              {viewer ? "继续今天的学习" : "登录 / 注册"}
              <ArrowRight className="size-4" strokeWidth={1.8} />
            </Link>
          </div>
          <p className="mt-3 px-2 text-center text-[11px] leading-5 text-ink-faint">
            {viewer
              ? "复习间隔按 SM-2 自动安排，认识就延长，不认识就 5 分钟后再来。"
              : "登录后，收藏、掌握程度和复习时间都会跟着你。"}
          </p>
        </aside>
      </section>

      <section id="wordbooks" className="scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line/70 pt-10">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
              The shelf
            </p>
            <h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
              选一本，慢慢学
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-ink-soft">
            每本词书都有自己的语气。先从一个场景开始，把词放进能用到的地方。
          </p>
        </div>

        {source === "preview" ? (
          <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-sun/60 bg-sun/20 px-4 py-3 text-xs leading-5 text-ink-soft sm:flex-row sm:items-center sm:justify-between">
            <p>
              <span className="mr-2 rounded-full bg-ink px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-paper">
                Preview
              </span>
              正在读取内置词库，页面可直接浏览；连接 Supabase 后即可保存学习记录。
            </p>
            <Link
              href="/login"
              className="shrink-0 font-medium text-moss underline decoration-moss/30 underline-offset-4"
            >
              去登录
            </Link>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5">
          {books.map((book, index) => (
            <BookCard key={book.id} book={book} index={index} />
          ))}
        </div>
      </section>

      <section className="mt-20 grid gap-6 rounded-[2rem] border border-line/70 bg-cream/55 p-6 sm:p-9 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
            How it works
          </p>
          <h2 className="mt-2 font-display text-3xl tracking-tight">
            一次只记一个词
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-ink-soft">
            翻开、回忆、判断。没有排行榜，也没有催促，只有你和这个词之间越来越短的距离。
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "翻一张卡",
              body: "先看单词和音标，开口读一遍，再翻到背面。",
            },
            {
              step: "02",
              title: "留下线索",
              body: "联想、词根、谐音三种记忆法，挑最顺手的那个。",
            },
            {
              step: "03",
              title: "交给间隔",
              body: "认识、模糊、不认识，SM-2 会安排下一次见面。",
            },
          ].map((item) => (
            <div key={item.step} className="border-t border-line pt-4">
              <span className="font-mono text-[10px] tracking-[0.2em] text-moss">
                {item.step}
              </span>
              <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-xs leading-5 text-ink-soft">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
