import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Bookmark, LockKeyhole } from "lucide-react";

import { BookmarksView } from "@/components/bookmarks-view";
import { getViewer } from "@/lib/auth";
import { getBookmarks } from "@/lib/data";

export const metadata: Metadata = {
  title: "生词本",
  description: "收藏那些还没记牢的单词，集中复习。",
};

// Bookmarks are always user-specific, even when auth is not configured yet.
export const dynamic = "force-dynamic";

export default async function BookmarksPage() {
  const viewer = await getViewer();

  if (!viewer) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-16 sm:px-6">
        <div className="rounded-[2rem] border border-line bg-cream/70 px-6 py-16 text-center shadow-[var(--shadow-card)]">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-paper-deep text-ink-faint">
            <LockKeyhole className="size-5" strokeWidth={1.6} />
          </span>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Personal wordbook
          </p>
          <h1 className="mt-2 font-display text-4xl tracking-tight">
            登录后查看生词本
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-ink-soft">
            收藏与复习记录绑定在你的账号上。登录之后，在闪卡右上角点一下心形，就能把单词收进这里。
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/login?next=%2Fbookmarks"
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

  const result = await getBookmarks(viewer);
  const count = result.bookmarks.length;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-line bg-cream/70 p-6 shadow-[var(--shadow-card)] sm:p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Saved for later
          </p>
          <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">
            生词本
          </h1>
          <p className="mt-3 max-w-md text-sm leading-7 text-ink-soft">
            那些在阅读里绊住你的词，值得再见几面。点击任意单词直接进入闪卡，也可以从这里开始一轮集中复习。
          </p>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-ink p-6 text-paper sm:p-7">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45">
              In your list
            </p>
            <Bookmark className="size-4 text-lime/70" strokeWidth={1.6} />
          </div>
          <p className="mt-6 font-display text-6xl leading-none">{count}</p>
          <p className="mt-2 text-xs text-paper/50">
            个单词正在生词本里等你
          </p>
        </div>
      </section>

      <BookmarksView
        bookmarks={result.bookmarks}
        canSave
        source={result.source}
      />
    </div>
  );
}
