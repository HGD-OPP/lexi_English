"use client";

import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  CircleCheck,
  Clock,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Flashcard } from "@/components/flashcard/flashcard";
import { MASTERED_AT } from "@/lib/data";
import type {
  DataSource,
  UserWordSnapshot,
  WordWithProgress,
} from "@/lib/types";

type Filter = "all" | "due" | "bookmarked";

const filterLabels: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "今日" },
  { key: "due", label: "待复习" },
  { key: "bookmarked", label: "已收藏" },
];

function isDue(word: WordWithProgress) {
  return (
    !word.userWord ||
    new Date(word.userWord.nextReviewAt).getTime() <= Date.now()
  );
}

function minutesUntil(iso: string | null) {
  if (!iso) {
    return null;
  }
  return Math.max(
    1,
    Math.ceil((new Date(iso).getTime() - Date.now()) / 60_000),
  );
}

export function WordList({
  words: initialWords,
  bookTitle,
  canSave,
  source,
  totalWords,
  pendingToday,
  nextReviewAt,
}: {
  words: WordWithProgress[];
  bookTitle: string;
  canSave: boolean;
  source: DataSource;
  totalWords: number;
  pendingToday: number;
  nextReviewAt: string | null;
}) {
  const router = useRouter();
  const [words, setWords] = useState(initialWords);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [session, setSession] = useState<{
    words: WordWithProgress[];
    index: number;
  } | null>(null);
  const [localPending, setLocalPending] = useState(0);
  const [localNextReviewAt, setLocalNextReviewAt] = useState<string | null>(
    null,
  );

  const counts = useMemo(
    () => ({
      all: words.length,
      due: words.filter(isDue).length,
      bookmarked: words.filter((word) => word.userWord?.isBookmarked).length,
    }),
    [words],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return words.filter((word) => {
      if (filter === "due" && !isDue(word)) {
        return false;
      }
      if (filter === "bookmarked" && !word.userWord?.isBookmarked) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      return (
        word.spelling.toLowerCase().includes(normalized) ||
        word.meaning.toLowerCase().includes(normalized)
      );
    });
  }, [words, filter, query]);

  const queueFinished = words.length === 0 && totalWords > 0;
  const effectivePending = pendingToday + localPending;
  const effectiveNextReviewAt = [nextReviewAt, localNextReviewAt]
    .filter((value): value is string => Boolean(value))
    .sort()[0] ?? null;
  const pendingMinutes = minutesUntil(effectiveNextReviewAt);

  function updateWord(
    wordId: string,
    updater: (word: WordWithProgress) => WordWithProgress,
  ) {
    setWords((current) =>
      current.map((word) => (word.id === wordId ? updater(word) : word)),
    );
    setSession((current) =>
      current
        ? {
            ...current,
            words: current.words.map((word) =>
              word.id === wordId ? updater(word) : word,
            ),
          }
        : current,
    );
  }

  function handleProgress(wordId: string, userWord: UserWordSnapshot) {
    const nextReview = new Date(userWord.nextReviewAt).getTime();
    const stillDue = nextReview <= Date.now();

    // Unknown words re-enter the short-term queue five minutes later. Keep a
    // local count so the empty state does not claim "done" before that refresh.
    if (userWord.lastRating === "unknown" && !stillDue) {
      setLocalPending((current) => current + 1);
      setLocalNextReviewAt((current) => {
        if (!current) {
          return userWord.nextReviewAt;
        }
        return nextReview < new Date(current).getTime()
          ? userWord.nextReviewAt
          : current;
      });
    }

    // Once a word has been scheduled (known/fuzzy) or moved to the short
    // relearning queue (unknown), it should leave today's visible list.
    setWords((current) =>
      stillDue
        ? current.map((word) =>
            word.id === wordId ? { ...word, userWord } : word,
          )
        : current.filter((word) => word.id !== wordId),
    );
    setSession((current) =>
      current
        ? {
            ...current,
            words: current.words.map((word) =>
              word.id === wordId ? { ...word, userWord } : word,
            ),
          }
        : current,
    );
  }

  function handleBookmarkChange(wordId: string, bookmarked: boolean) {
    updateWord(wordId, (word) => ({
      ...word,
      userWord: word.userWord
        ? { ...word.userWord, isBookmarked: bookmarked }
        : {
            mastery: 0,
            isBookmarked: bookmarked,
            interval: 1,
            repetitions: 0,
            easeFactor: 2.5,
            nextReviewAt: new Date().toISOString(),
            lastRating: null,
          },
    }));
  }

  function closeSession() {
    setSession(null);
    router.refresh();
  }

  return (
    <div>
      <div className="mt-8 rounded-[1.75rem] border border-line/80 bg-cream/70 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 border-b border-line/70 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="scrollbar-thin flex items-center gap-1 overflow-x-auto">
            {filterLabels.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                aria-pressed={filter === item.key}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs transition ${
                  filter === item.key
                    ? "bg-ink text-paper"
                    : "text-ink-soft hover:bg-ink/5"
                }`}
              >
                {item.label}
                <span
                  className={`font-mono text-[10px] ${
                    filter === item.key ? "text-paper/50" : "text-ink-faint"
                  }`}
                >
                  {counts[item.key]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label className="relative flex-1 sm:w-48 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索单词或释义"
                className="h-9 w-full rounded-full border border-line bg-paper/60 pl-8 pr-3 text-xs text-ink outline-none transition placeholder:text-ink-faint/70 focus:border-moss/40 focus:bg-cream"
              />
            </label>
            <button
              type="button"
              onClick={() => setSession({ words: filtered, index: 0 })}
              disabled={filtered.length === 0}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-moss px-4 text-xs font-medium text-paper transition hover:bg-moss-deep disabled:opacity-40"
            >
              <Sparkles className="size-3.5" strokeWidth={1.8} />
              开始复习
            </button>
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="divide-y divide-line/60">
            {filtered.map((word, index) => {
              const mastered = (word.userWord?.mastery ?? 0) >= MASTERED_AT;
              const due = isDue(word);
              return (
                <button
                  key={word.id}
                  type="button"
                  onClick={() => setSession({ words: filtered, index })}
                  className="group flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-paper/60 sm:gap-5 sm:px-6"
                >
                  <span className="hidden w-7 shrink-0 font-mono text-[10px] tabular-nums text-ink-faint/70 sm:block">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                      <span className="font-display text-xl tracking-tight text-ink sm:text-[1.4rem]">
                        {word.spelling}
                      </span>
                      <span className="font-mono text-[11px] text-ink-faint">
                        {word.phonetic}
                      </span>
                      {mastered ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-lime/60 px-1.5 py-0.5 text-[9px] text-moss-deep">
                          <Check className="size-2.5" strokeWidth={2.4} />
                          已掌握
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-soft sm:text-[13px]">
                      {word.meaning}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {due ? (
                      <span className="hidden rounded-full bg-sun/40 px-2 py-1 text-[9px] font-medium text-[#7a5a22] sm:inline">
                        待复习
                      </span>
                    ) : null}
                    {word.userWord?.isBookmarked ? (
                      <Bookmark
                        className="size-3.5 text-[#9b3f35]"
                        fill="currentColor"
                        strokeWidth={1.5}
                      />
                    ) : null}
                    <span className="grid size-8 place-items-center rounded-full border border-transparent text-ink-faint transition group-hover:border-line group-hover:bg-cream group-hover:text-ink">
                      <ChevronRight className="size-4" strokeWidth={1.8} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : queueFinished ? (
          <div className="px-6 py-16 text-center">
            {effectivePending > 0 ? (
              <>
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-sun/35 text-[#7a5a22]">
                  <Clock className="size-5" strokeWidth={1.7} />
                </span>
                <p className="mt-4 font-display text-xl">还差一点，别走开</p>
                <p className="mt-1 text-xs leading-6 text-ink-soft">
                  还有 {effectivePending} 个今天没记住的词
                  {pendingMinutes
                    ? `，约 ${pendingMinutes} 分钟后`
                    : "，稍后"}{" "}
                  会重新回到队列。
                </p>
                <button
                  type="button"
                  onClick={() => router.refresh()}
                  className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-cream px-4 text-xs transition hover:border-moss/30"
                >
                  <RefreshCw className="size-3.5" />
                  刷新队列
                </button>
              </>
            ) : (
              <>
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-lime/70 text-moss-deep">
                  <CircleCheck className="size-5" strokeWidth={1.7} />
                </span>
                <p className="mt-4 font-display text-xl">今日任务已完成</p>
                <p className="mt-1 text-xs leading-6 text-ink-soft">
                  认识的词已经排到未来，明天不会再重复出现。
                </p>
                <button
                  type="button"
                  onClick={() => router.refresh()}
                  className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-cream px-4 text-xs transition hover:border-moss/30"
                >
                  <RefreshCw className="size-3.5" />
                  刷新看看
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-paper-deep text-ink-faint">
              <Search className="size-5" strokeWidth={1.7} />
            </span>
            <p className="mt-4 font-display text-xl">
              {totalWords === 0 ? "这本词书还没有单词" : "这里暂时没有单词"}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {totalWords === 0
                ? "先运行 seed 把词库写进数据库。"
                : "换一个筛选条件，或者清空搜索词试试。"}
            </p>
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setQuery("");
              }}
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-cream px-4 text-xs transition hover:border-moss/30"
            >
              重置筛选
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-line/60 px-4 py-3 text-[11px] text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            点击任意单词打开全屏闪卡
            {!canSave ? " · 登录后才会保存学习记录" : ""}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em]">
            {source === "preview" ? "Preview data" : "Synced with Supabase"}
          </p>
        </div>
      </div>

      {session && session.words.length > 0 ? (
        <Flashcard
          words={session.words}
          initialIndex={session.index}
          canSave={canSave}
          label={`${bookTitle} · 闪卡`}
          onClose={closeSession}
          onProgress={handleProgress}
          onBookmarkChange={handleBookmarkChange}
          onRestart={closeSession}
        />
      ) : null}
    </div>
  );
}
