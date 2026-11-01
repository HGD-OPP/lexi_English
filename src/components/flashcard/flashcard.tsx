"use client";

import {
  AudioLines,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Heart,
  Lightbulb,
  LoaderCircle,
  Puzzle,
  Quote,
  RotateCcw,
  Sparkles,
  Volume2,
  Waves,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type {
  MemoryApiResponse,
  MemoryHints,
  ReviewRating,
  UserWordSnapshot,
  WordWithProgress,
} from "@/lib/types";

type FlashcardProps = {
  words: WordWithProgress[];
  initialIndex?: number;
  canSave: boolean;
  label: string;
  onClose: () => void;
  onProgress?: (wordId: string, userWord: UserWordSnapshot) => void;
  onBookmarkChange?: (wordId: string, bookmarked: boolean) => void;
};

const ratingOptions: Array<{
  rating: ReviewRating;
  label: string;
  hint: string;
  className: string;
  icon: typeof Check;
}> = [
  {
    rating: "known",
    label: "认识",
    hint: "间隔 ×2",
    className:
      "border-moss/20 bg-moss text-paper hover:bg-moss-deep disabled:hover:bg-moss",
    icon: Check,
  },
  {
    rating: "fuzzy",
    label: "模糊",
    hint: "间隔不变",
    className:
      "border-sun/80 bg-sun/55 text-ink hover:bg-sun/80 disabled:hover:bg-sun/55",
    icon: Waves,
  },
  {
    rating: "unknown",
    label: "不认识",
    hint: "明天再来",
    className:
      "border-rose/80 bg-rose/55 text-ink hover:bg-rose/80 disabled:hover:bg-rose/55",
    icon: X,
  },
];

function localFallback(word: WordWithProgress): MemoryHints {
  const shortMeaning = word.meaning.split(/[；;]/)[0]?.trim() || word.meaning;
  return {
    association:
      word.memoryHint?.trim() ||
      `把 ${word.spelling} 放进一个具体场景：谁在哪儿，因为什么说出了这个词。画面越夸张，越容易想起来。`,
    root: `先按音节读：${word.spelling.replace(/([aeiouy]+)/gi, "·$1").replace(/^·/, "")}。读顺之后，把拼写和“${shortMeaning}”绑在一起。`,
    mnemonic: `把 ${word.spelling} 连读三遍，挑一个最像的中文声音，编成和“${shortMeaning}”有关的一句话。`,
  };
}

export function Flashcard({
  words,
  initialIndex = 0,
  canSave,
  label,
  onClose,
  onProgress,
  onBookmarkChange,
}: FlashcardProps) {
  const safeInitial = Math.min(Math.max(initialIndex, 0), words.length - 1);
  const [index, setIndex] = useState(safeInitial);
  const [flipped, setFlipped] = useState(false);
  const [memories, setMemories] = useState<Record<string, MemoryApiResponse>>(
    {},
  );
  const [loadingMemoryIds, setLoadingMemoryIds] = useState<
    Record<string, boolean>
  >({});
  const [saving, setSaving] = useState(false);
  const [bookmarkSaving, setBookmarkSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const advanceTimer = useRef<number | null>(null);
  const inFlightMemory = useRef<Set<string>>(new Set());

  const word = words[index] ?? words[0];
  const memory = word ? memories[word.id] : undefined;
  const memoryLoading = word ? Boolean(loadingMemoryIds[word.id]) : false;
  const bookmarked = word?.userWord?.isBookmarked ?? false;
  const progress = words.length > 0 ? ((index + 1) / words.length) * 100 : 0;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (advanceTimer.current) {
        window.clearTimeout(advanceTimer.current);
      }
    };
  }, []);

  function goTo(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= words.length) {
      return;
    }
    if (advanceTimer.current) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    setIndex(nextIndex);
    setFlipped(false);
    setFeedback(null);
    setNotice(null);
    setFinished(false);
    setSaving(false);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isTyping) {
        return;
      }

      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (saving) {
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(index + 1);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(index - 1);
        return;
      }
      if (event.code === "Space" || event.key === " ") {
        if (
          target?.closest(
            "button, a, input, textarea, select, [contenteditable=true]",
          )
        ) {
          return;
        }
        event.preventDefault();
        setFlipped((current) => !current);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, words.length, onClose, saving]);

  function generateMemory() {
    const targetWord = word;
    if (
      !targetWord ||
      !canSave ||
      !flipped ||
      memory ||
      inFlightMemory.current.has(targetWord.id)
    ) {
      return;
    }

    const wordId = targetWord.id;
    inFlightMemory.current.add(wordId);
    setLoadingMemoryIds((current) => ({ ...current, [wordId]: true }));

    fetch("/api/generate-memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as
          | MemoryApiResponse
          | { error?: string };
        if (!response.ok || !("memory" in payload)) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "AI 记忆法暂时不可用",
          );
        }
        return payload;
      })
      .then((payload) => {
        setMemories((current) => ({ ...current, [wordId]: payload }));
      })
      .catch(() => {
        setMemories((current) => ({
          ...current,
          [wordId]: {
            memory: localFallback(targetWord),
            source: "fallback",
          },
        }));
      })
      .finally(() => {
        inFlightMemory.current.delete(wordId);
        setLoadingMemoryIds((current) => ({
          ...current,
          [wordId]: false,
        }));
      });
  }

  function speak() {
    if (!word) {
      return;
    }
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setNotice("当前浏览器不支持语音朗读。");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(word.spelling);
    utterance.lang = "en-US";
    utterance.rate = 0.88;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((voice) => voice.lang === "en-US") ??
      voices.find((voice) => voice.lang.startsWith("en"));
    if (preferred) {
      utterance.voice = preferred;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async function handleReview(rating: ReviewRating) {
    if (!word) {
      return;
    }
    if (!canSave) {
      setNotice("登录后才能保存掌握程度和复习时间。");
      return;
    }

    setSaving(true);
    setNotice(null);
    setFeedback(null);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId: word.id, rating }),
      });
      const payload = (await response.json()) as {
        userWord?: UserWordSnapshot;
        error?: string;
      };

      if (!response.ok || !payload.userWord) {
        throw new Error(payload.error || "保存失败，请稍后再试。");
      }

      const saved = payload.userWord;
      onProgress?.(word.id, saved);
      setReviewedCount((count) => count + 1);
      setFeedback(
        saved.interval === 1
          ? "已记录 · 明天再见"
          : `已记录 · ${saved.interval} 天后复习`,
      );

      advanceTimer.current = window.setTimeout(() => {
        if (index >= words.length - 1) {
          setFinished(true);
        } else {
          setIndex((current) => current + 1);
          setFlipped(false);
          setFeedback(null);
        }
        setSaving(false);
        advanceTimer.current = null;
      }, 700);
    } catch (error) {
      setSaving(false);
      setNotice(
        error instanceof Error ? error.message : "保存失败，请稍后再试。",
      );
    }
  }

  async function toggleBookmark() {
    if (!word) {
      return;
    }
    if (!canSave) {
      setNotice("登录后才能把单词放进生词本。");
      return;
    }

    setBookmarkSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId: word.id,
          bookmarked: !bookmarked,
        }),
      });
      const payload = (await response.json()) as {
        bookmarked?: boolean;
        error?: string;
      };
      if (!response.ok || typeof payload.bookmarked !== "boolean") {
        throw new Error(payload.error || "收藏失败，请稍后再试。");
      }

      onBookmarkChange?.(word.id, payload.bookmarked);
      setNotice(payload.bookmarked ? "已加入生词本" : "已移出生词本");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "收藏失败。");
    } finally {
      setBookmarkSaving(false);
    }
  }

  function restart() {
    setIndex(0);
    setFlipped(false);
    setFeedback(null);
    setNotice(null);
    setFinished(false);
    setReviewedCount(0);
  }

  if (!word) {
    return null;
  }

  const backMemoryBlocks = memory
    ? [
        {
          key: "association",
          label: "联想",
          icon: Lightbulb,
          text: memory.memory.association,
          tint: "bg-lime/60",
        },
        {
          key: "root",
          label: "词根",
          icon: Puzzle,
          text: memory.memory.root,
          tint: "bg-sun/35",
        },
        {
          key: "mnemonic",
          label: "谐音",
          icon: AudioLines,
          text: memory.memory.mnemonic,
          tint: "bg-rose/40",
        },
      ]
    : [];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#101a14]/80 p-3 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${label}闪卡`}
    >
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
        <div className="flex items-center justify-between gap-3 py-2 text-paper/70">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-paper/15 bg-paper/5 px-3 text-xs transition hover:bg-paper/10 hover:text-paper"
          >
            <X className="size-4" strokeWidth={1.8} />
            关闭
          </button>
          <p className="hidden font-mono text-[10px] uppercase tracking-[0.2em] sm:block">
            {label}
          </p>
          <div className="flex items-center gap-1">
            <span className="mr-1 font-mono text-[11px] tabular-nums text-paper/55">
              {String(index + 1).padStart(2, "0")} /{" "}
              {String(words.length).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              disabled={index === 0 || saving}
              className="grid size-8 place-items-center rounded-full border border-paper/15 text-paper/70 transition hover:bg-paper/10 hover:text-paper disabled:opacity-25"
              aria-label="上一个单词"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              disabled={index >= words.length - 1 || saving}
              className="grid size-8 place-items-center rounded-full border border-paper/15 text-paper/70 transition hover:bg-paper/10 hover:text-paper disabled:opacity-25"
              aria-label="下一个单词"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="h-0.5 w-full overflow-hidden rounded-full bg-paper/10">
          <div
            className="h-full rounded-full bg-lime transition-all duration-500"
            style={{ width: `${finished ? 100 : progress}%` }}
          />
        </div>

        {finished ? (
          <div className="my-auto py-10">
            <div className="animate-fade-up rounded-[2rem] border border-paper/10 bg-cream p-8 text-center shadow-[var(--shadow-float)] sm:p-12">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-lime text-moss-deep">
                <CircleCheck className="size-8" strokeWidth={1.6} />
              </span>
              <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
                Round complete
              </p>
              <h2 className="mt-2 font-display text-3xl tracking-tight">
                这一轮，走完了。
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-ink-soft">
                你刚刚复习了 {reviewedCount || words.length} 个单词。记住多少不重要，重要的是明天还会再见。
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={restart}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-cream px-5 text-sm transition hover:border-moss/30"
                >
                  <RotateCcw className="size-4" strokeWidth={1.8} />
                  再来一轮
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm text-paper transition hover:bg-moss-deep"
                >
                  回到列表
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-1 items-center justify-center py-4 sm:py-6">
              <div className="w-full">
                <div className="relative">
                  <button
                    type="button"
                    onClick={toggleBookmark}
                    disabled={bookmarkSaving}
                    className={`absolute right-4 top-4 z-30 grid size-11 place-items-center rounded-full border shadow-sm backdrop-blur transition ${
                      bookmarked
                        ? "border-rose/70 bg-rose text-[#9b3f35]"
                        : "border-line bg-cream/85 text-ink-soft hover:text-[#9b3f35]"
                    } disabled:opacity-50`}
                    aria-label={bookmarked ? "从生词本移除" : "加入生词本"}
                    title={bookmarked ? "从生词本移除" : "加入生词本"}
                  >
                    {bookmarkSaving ? (
                      <LoaderCircle className="size-5 animate-spin" />
                    ) : (
                      <Heart
                        className="size-5"
                        strokeWidth={1.8}
                        fill={bookmarked ? "currentColor" : "none"}
                      />
                    )}
                  </button>

                  <div className="flip-scene h-[clamp(350px,58vh,570px)]">
                    <div
                      className={`flip-card ${flipped ? "is-flipped" : ""}`}
                    >
                      <div
                        className="flip-face paper-grain cursor-pointer border border-ink/10 bg-cream shadow-[var(--shadow-float)]"
                        onClick={() => setFlipped(true)}
                        role="button"
                        tabIndex={0}
                        aria-label="翻到卡片背面"
                      >
                        <div className="flex h-full flex-col p-6 sm:p-9">
                          <div className="flex items-center justify-between gap-3 pr-14">
                            <span className="rounded-full bg-ink px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-paper">
                              Word {String(index + 1).padStart(2, "0")}
                            </span>
                          </div>

                          <div className="flex flex-1 flex-col items-center justify-center text-center">
                            <h2 className="max-w-full break-words px-1 font-display text-[2.9rem] leading-[1.05] tracking-[-0.03em] text-ink sm:text-6xl">
                              {word.spelling}
                            </h2>
                            <p className="mt-4 font-mono text-sm text-ink-faint sm:text-base">
                              {word.phonetic}
                            </p>
                            {word.partOfSpeech ? (
                              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-moss/15 bg-moss/[0.06] px-3 py-1 font-mono text-[11px] leading-none text-moss">
                                <span
                                  className="size-1.5 rounded-full bg-moss/60"
                                  aria-hidden="true"
                                />
                                {word.partOfSpeech}
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                speak();
                              }}
                              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-moss/15 bg-lime/60 px-4 text-sm text-moss-deep transition hover:bg-lime"
                            >
                              <Volume2 className="size-4" strokeWidth={1.8} />
                              听发音
                            </button>
                          </div>

                          <div className="flex items-center justify-center gap-2 text-[11px] text-ink-faint">
                            <RotateCcw className="size-3.5" strokeWidth={1.8} />
                            点击卡片或按空格翻面
                          </div>
                        </div>
                      </div>

                      <div className="flip-face flip-back paper-grain cursor-pointer border border-ink/10 bg-[#fbf7e9] shadow-[var(--shadow-float)]">
                        <div
                          className="scrollbar-thin flex h-full flex-col overflow-y-auto p-6 sm:p-8"
                          onClick={() => setFlipped(false)}
                          role="button"
                          tabIndex={-1}
                          aria-label="翻回卡片正面"
                        >
                          <div className="flex items-center justify-between gap-3 pr-14">
                            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">
                              Meaning
                            </span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                speak();
                              }}
                              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-cream/70 px-3 text-[11px] text-ink-soft transition hover:text-ink"
                            >
                              <Volume2 className="size-3.5" />
                              再听一次
                            </button>
                          </div>

                          <div className="mt-4 flex flex-wrap items-start gap-2.5">
                            {word.partOfSpeech ? (
                              <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full bg-moss/[0.08] px-2.5 py-1 font-mono text-[10px] leading-none text-moss">
                                {word.partOfSpeech}
                              </span>
                            ) : null}
                            <h2 className="min-w-0 flex-1 text-2xl font-semibold leading-snug tracking-tight text-ink sm:text-[1.7rem]">
                              {word.meaning}
                            </h2>
                          </div>

                          {word.exampleEn ? (
                            <div className="mt-5 rounded-2xl border border-line/70 bg-cream/70 p-4">
                              <Quote className="size-4 text-moss/50" />
                              <p className="mt-2 font-display text-lg leading-7 text-ink">
                                {word.exampleEn}
                              </p>
                              {word.exampleZh ? (
                                <p className="mt-1.5 text-xs leading-5 text-ink-soft">
                                  {word.exampleZh}
                                </p>
                              ) : null}
                            </div>
                          ) : null}

                          <div className="mt-5">
                            <div className="flex items-center justify-between gap-3">
                              <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                                <Sparkles className="size-3.5 text-moss" />
                                Memory hooks
                              </p>
                              {memory ? (
                                <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[9px] text-ink-faint">
                                  {memory.source === "ai"
                                    ? "AI 生成"
                                    : memory.source === "fallback"
                                      ? "离线提示"
                                      : "预置提示"}
                                </span>
                              ) : null}
                            </div>

                            {!canSave ? (
                              <div className="mt-3 rounded-2xl border border-dashed border-line bg-cream/50 p-4">
                                <p className="text-xs leading-5 text-ink-soft">
                                  {word.memoryHint ||
                                    "登录后可以让 AI 为这个词生成联想、词根与谐音三种记忆法。"}
                                </p>
                                <Link
                                  href="/login"
                                  onClick={(event) => event.stopPropagation()}
                                  className="mt-2 inline-flex text-xs font-medium text-moss underline decoration-moss/30 underline-offset-4"
                                >
                                  登录，解锁 AI 记忆法
                                </Link>
                              </div>
                            ) : memoryLoading ? (
                              <div className="mt-3 space-y-2">
                                {[0, 1, 2].map((item) => (
                                  <div
                                    key={item}
                                    className="h-14 animate-soft-pulse rounded-xl bg-ink/[0.06]"
                                  />
                                ))}
                              </div>
                            ) : memory ? (
                              <div className="mt-3 space-y-2">
                                {backMemoryBlocks.map((block) => {
                                  const Icon = block.icon;
                                  return (
                                    <div
                                      key={block.key}
                                      className={`flex gap-3 rounded-xl p-3 ${block.tint}`}
                                    >
                                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-cream/65 text-ink-soft">
                                        <Icon
                                          className="size-3.5"
                                          strokeWidth={1.8}
                                        />
                                      </span>
                                      <div>
                                        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint">
                                          {block.label}
                                        </p>
                                        <p className="mt-0.5 text-xs leading-5 text-ink">
                                          {block.text}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="mt-3 rounded-2xl border border-line/70 bg-cream/65 p-4">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                                    预置记忆提示
                                  </p>
                                  <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[9px] text-ink-faint">
                                    种子词库
                                  </span>
                                </div>
                                <p className="mt-2 text-xs leading-5 text-ink-soft">
                                  {word.memoryHint ||
                                    "这个词还没有预置提示，可以让 AI 从联想、词根和谐音三个角度生成。"}
                                </p>
                                <p className="mt-2 text-[10px] leading-4 text-ink-faint">
                                  释义、例句和提示已随词库写入；需要更多角度时再调用 AI。
                                </p>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    generateMemory();
                                  }}
                                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-moss/20 bg-lime/60 px-3 py-1.5 text-[11px] font-medium text-moss-deep transition hover:bg-lime"
                                >
                                  <Sparkles className="size-3.5" />
                                  用 AI 生成三种记忆法
                                </button>
                              </div>
                            )}
                          </div>

                          <p className="mt-auto pt-5 text-center text-[10px] text-ink-faint">
                            点击卡片翻回正面
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="min-h-5 pt-2 text-center">
                  {notice ? (
                    <p
                      className="text-xs text-paper/75"
                      role="status"
                      aria-live="polite"
                    >
                      {notice}
                    </p>
                  ) : feedback ? (
                    <p
                      className="inline-flex items-center gap-1.5 text-xs text-lime"
                      role="status"
                      aria-live="polite"
                    >
                      <CircleCheck className="size-3.5" />
                      {feedback}
                    </p>
                  ) : (
                    <p className="text-[10px] text-paper/35">
                      ← → 切换单词 · 空格翻面 · Esc 关闭
                    </p>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-3">
                  {ratingOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.rating}
                        type="button"
                        onClick={() => handleReview(option.rating)}
                        disabled={!flipped || saving}
                        className={`group flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl border px-2 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-35 sm:h-16 ${option.className}`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Icon className="size-4" strokeWidth={2} />
                          {option.label}
                        </span>
                        <span className="text-[9px] font-normal opacity-60 sm:text-[10px]">
                          {option.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!flipped ? (
                  <p className="mt-2 text-center text-[10px] text-paper/40">
                    先翻面看看释义，再判断自己的掌握程度。
                  </p>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
