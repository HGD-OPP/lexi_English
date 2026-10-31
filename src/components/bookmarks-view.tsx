"use client";

import {
  Bookmark,
  ChevronRight,
  LoaderCircle,
  Sparkles,
  Trash,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Flashcard } from "@/components/flashcard/flashcard";
import { MASTERED_AT } from "@/lib/data";
import type {
  BookmarkItem,
  DataSource,
  UserWordSnapshot,
} from "@/lib/types";

export function BookmarksView({
  bookmarks: initialBookmarks,
  canSave,
  source,
}: {
  bookmarks: BookmarkItem[];
  canSave: boolean;
  source: DataSource;
}) {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{
    words: BookmarkItem[];
    index: number;
  } | null>(null);

  function updateBookmark(
    wordId: string,
    updater: (item: BookmarkItem) => BookmarkItem,
  ) {
    setBookmarks((current) =>
      current.map((item) => (item.id === wordId ? updater(item) : item)),
    );
    setSession((current) =>
      current
        ? {
            ...current,
            words: current.words.map((item) =>
              item.id === wordId ? updater(item) : item,
            ),
          }
        : current,
    );
  }

  function handleProgress(wordId: string, userWord: UserWordSnapshot) {
    updateBookmark(wordId, (item) => ({ ...item, userWord }));
  }

  function handleBookmarkChange(wordId: string, bookmarked: boolean) {
    // Keep the card's heart in sync even when the user re-bookmarks a word
    // during the same review session.
    setSession((current) =>
      current
        ? {
            ...current,
            words: current.words.map((item) =>
              item.id === wordId && item.userWord
                ? {
                    ...item,
                    userWord: { ...item.userWord, isBookmarked: bookmarked },
                  }
                : item,
            ),
          }
        : current,
    );

    if (bookmarked) {
      return;
    }

    setBookmarks((current) => current.filter((item) => item.id !== wordId));
  }

  async function removeBookmark(wordId: string) {
    setRemovingId(wordId);
    setError(null);
    try {
      const response = await fetch(
        `/api/bookmarks?wordId=${encodeURIComponent(wordId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "移除失败，请稍后再试。");
      }
      setBookmarks((current) =>
        current.filter((item) => item.id !== wordId),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "移除失败。");
    } finally {
      setRemovingId(null);
    }
  }

  function closeSession() {
    setSession(null);
    router.refresh();
  }

  if (bookmarks.length === 0 && !session) {
    return (
      <div className="mt-8 rounded-[2rem] border border-dashed border-line bg-cream/60 px-6 py-20 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-paper-deep text-ink-faint">
          <Bookmark className="size-6" strokeWidth={1.6} />
        </span>
        <h2 className="mt-5 font-display text-3xl tracking-tight">
          生词本还是空的
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-soft">
          在闪卡右上角点击心形按钮，把暂时记不住的单词收进来，之后可以集中复习。
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-6 inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-5 text-xs font-medium text-paper transition hover:bg-moss"
        >
          去挑几个单词
          <ChevronRight className="size-3.5" />
        </button>
        {source === "preview" ? (
          <p className="mt-5 text-[10px] text-ink-faint">
            当前为预览数据，登录并连接数据库后才会保存收藏。
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-soft">
          共 <span className="font-mono text-ink">{bookmarks.length}</span>{" "}
          个词，按最近收藏排序
        </p>
        <button
          type="button"
          onClick={() => setSession({ words: bookmarks, index: 0 })}
          disabled={bookmarks.length === 0}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-moss px-5 text-xs font-medium text-paper transition hover:bg-moss-deep disabled:opacity-40"
        >
          <Sparkles className="size-3.5" strokeWidth={1.8} />
          开始生词本复习
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-[#c97363]/30 bg-rose/30 px-3 py-2 text-xs text-[#8b4036]">
          {error}
        </p>
      ) : null}

      <ul className="mt-4 divide-y divide-line/60 overflow-hidden rounded-[1.75rem] border border-line/80 bg-cream/70 shadow-[var(--shadow-card)]">
        {bookmarks.map((item, index) => {
          const mastered = (item.userWord?.mastery ?? 0) >= MASTERED_AT;
          const removing = removingId === item.id;
          return (
            <li key={item.id} className="flex items-stretch">
              <button
                type="button"
                onClick={() => setSession({ words: bookmarks, index })}
                className="group flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left transition hover:bg-paper/60 sm:gap-4 sm:px-5"
              >
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-xl text-base"
                  style={{ backgroundColor: item.book.accent }}
                >
                  {item.book.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-display text-xl tracking-tight text-ink">
                      {item.spelling}
                    </span>
                    <span className="font-mono text-[10px] text-ink-faint">
                      {item.phonetic}
                    </span>
                    {mastered ? (
                      <span className="rounded-full bg-lime/60 px-1.5 py-0.5 text-[9px] text-moss-deep">
                        已掌握
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink-soft">
                    {item.meaning}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-[10px] text-ink-faint">
                    <span
                      className="inline-block size-1.5 rounded-full"
                      style={{ backgroundColor: item.book.accent }}
                    />
                    {item.book.title}
                  </span>
                </span>

                <span className="hidden shrink-0 items-center gap-1 md:flex">
                  {Array.from({ length: 5 }).map((_, dot) => (
                    <span
                      key={dot}
                      className={`size-1.5 rounded-full ${
                        dot < (item.userWord?.mastery ?? 0)
                          ? "bg-moss"
                          : "bg-line"
                      }`}
                    />
                  ))}
                </span>
                <ChevronRight className="size-4 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </button>

              <div className="flex shrink-0 items-center border-l border-line/50 px-2 sm:px-3">
                <button
                  type="button"
                  onClick={() => removeBookmark(item.id)}
                  disabled={removing}
                  aria-label={`移除 ${item.spelling}`}
                  title="从生词本移除"
                  className="grid size-9 place-items-center rounded-full text-ink-faint transition hover:bg-rose/50 hover:text-[#8b4036] disabled:opacity-50"
                >
                  {removing ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Trash className="size-4" strokeWidth={1.7} />
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-right font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
        {source === "preview" ? "Preview data" : "Synced with Supabase"}
      </p>

      {session && session.words.length > 0 ? (
        <Flashcard
          words={session.words}
          initialIndex={session.index}
          canSave={canSave}
          label="生词本 · 闪卡"
          onClose={closeSession}
          onProgress={handleProgress}
          onBookmarkChange={handleBookmarkChange}
        />
      ) : null}
    </div>
  );
}
