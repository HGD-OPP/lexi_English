import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CircleCheck,
  Clock,
  Layers,
} from "lucide-react";

import { WordList } from "@/components/word-list";
import { getViewer } from "@/lib/auth";
import { getWordBookDetail } from "@/lib/data";
import { findSeedBook } from "@/lib/wordbook-data";

type BookPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: BookPageProps): Promise<Metadata> {
  const { slug } = await params;
  const book = findSeedBook(slug);
  return {
    title: book?.title ?? "词书",
    description: book?.description,
  };
}

export default async function BookDetailPage({ params }: BookPageProps) {
  const { slug } = await params;
  const viewer = await getViewer();
  const result = await getWordBookDetail(slug, viewer);

  if (!result) {
    notFound();
  }

  const { book, words, pendingToday, nextReviewAt } = result.detail;
  const canSave = Boolean(viewer);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-ink-soft transition hover:text-ink"
      >
        <ArrowLeft className="size-3.5" strokeWidth={1.8} />
        全部词书
      </Link>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div
          className="paper-grain relative overflow-hidden rounded-[2rem] border border-black/5 p-6 sm:p-8"
          style={{ backgroundColor: book.accent }}
        >
          <div className="flex items-start justify-between gap-4">
            <span className="grid size-14 place-items-center rounded-2xl bg-cream/75 text-2xl shadow-sm">
              {book.emoji}
            </span>
            <span className="rounded-full border border-ink/15 bg-cream/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
              {book.level}
            </span>
          </div>

          <h1 className="mt-7 font-display text-4xl tracking-tight text-ink sm:text-5xl">
            {book.title}
          </h1>
          <p className="mt-2 font-display text-xl italic text-ink-soft">
            {book.subtitle}
          </p>
          <p className="mt-4 max-w-xl text-sm leading-7 text-ink-soft">
            {book.description}
          </p>

          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="size-3.5" strokeWidth={1.7} />
              {book.wordCount} 个单词
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CircleCheck className="size-3.5" strokeWidth={1.7} />
              已掌握 {book.masteredCount}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" strokeWidth={1.7} />
              待复习 {book.dueCount}
            </span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] bg-ink p-6 text-paper sm:p-8">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45">
              Your progress
            </p>
            <BookOpen className="size-4 text-lime/70" strokeWidth={1.6} />
          </div>
          <p className="mt-6 font-display text-6xl leading-none">
            {book.progress}
            <span className="ml-1 font-sans text-xl text-paper/40">%</span>
          </p>
          <p className="mt-2 text-sm text-paper/55">这本词书的学习进度</p>

          <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-paper/10">
            <div
              className="h-full rounded-full bg-lime transition-all"
              style={{ width: `${book.progress}%` }}
            />
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 border-t border-paper/10 pt-5">
            <div>
              <p className="font-display text-2xl">{book.masteredCount}</p>
              <p className="mt-0.5 text-[10px] text-paper/40">已掌握</p>
            </div>
            <div>
              <p className="font-display text-2xl">{book.dueCount}</p>
              <p className="mt-0.5 text-[10px] text-paper/40">今天待复习</p>
            </div>
          </div>

          {result.source === "preview" ? (
            <p className="mt-6 rounded-xl border border-sun/20 bg-sun/10 px-3 py-2 text-[10px] leading-5 text-sun/80">
              预览模式：配置数据库并登录后，学习进度会保存到 Supabase。
            </p>
          ) : null}
        </div>
      </section>

      <div className="mt-10 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Word list
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-tight">单词列表</h2>
        </div>
        <p className="hidden text-xs text-ink-faint sm:block">
          按空格翻面，方向键切换
        </p>
      </div>

      <WordList
        key={`${book.id}:${words.map((word) => word.id).join(",")}`}
        words={words}
        bookTitle={book.title}
        canSave={canSave}
        source={result.source}
        totalWords={book.wordCount}
        pendingToday={pendingToday}
        nextReviewAt={nextReviewAt}
      />
    </div>
  );
}
