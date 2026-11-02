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
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import type {
  MemoryApiResponse,
  MemoryHints,
  ReviewRating,
  UserWordSnapshot,
  WordWithProgress,
} from "@/lib/types";
import { RELEARN_MINUTES } from "@/lib/sm2";

type SpellingResult = {
  status: "correct" | "wrong";
  submitted: string;
};

type StudyMode = "spelling" | "choice";

type ChoiceOption = {
  id: string;
  meaning: string;
  isCorrect: boolean;
};

type ChoiceResult = {
  selectedId: string;
  correctId: string;
  status: "correct" | "wrong";
};

type FlashcardProps = {
  words: WordWithProgress[];
  initialIndex?: number;
  canSave: boolean;
  label: string;
  onClose: () => void;
  onProgress?: (wordId: string, userWord: UserWordSnapshot) => void;
  onBookmarkChange?: (wordId: string, bookmarked: boolean) => void;
  /** Refresh the server-side queue instead of replaying stale cards. */
  onRestart?: () => void;
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

const studyModes: Array<{ id: StudyMode; label: string }> = [
  { id: "spelling", label: "拼写模式" },
  { id: "choice", label: "选择题模式" },
];

const FALLBACK_DISTRACTOR_MEANINGS = [
  "n. 责任；职责",
  "v. 改善；提高",
  "adj. 安静的；平静的",
  "n. 机会；时机",
  "v. 决定；选定",
  "adj. 诚实的；正直的",
  "n. 经验；经历",
  "v. 提醒；使想起",
  "adj. 有效的；高效的",
  "n. 目的地；终点",
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function buildChoiceOptions(
  correct: WordWithProgress,
  pool: Array<{ id: string; meaning: string }>,
): ChoiceOption[] {
  const usedMeanings = new Set([correct.meaning.trim()]);
  const distractors: ChoiceOption[] = [];

  for (const candidate of shuffle(pool)) {
    const meaning = candidate.meaning.trim();
    if (
      !meaning ||
      candidate.id === correct.id ||
      usedMeanings.has(meaning)
    ) {
      continue;
    }
    usedMeanings.add(meaning);
    distractors.push({ id: candidate.id, meaning, isCorrect: false });
    if (distractors.length === 3) {
      break;
    }
  }

  for (const meaning of FALLBACK_DISTRACTOR_MEANINGS) {
    if (distractors.length === 3) {
      break;
    }
    if (usedMeanings.has(meaning)) {
      continue;
    }
    usedMeanings.add(meaning);
    distractors.push({
      id: `fallback-${distractors.length}`,
      meaning,
      isCorrect: false,
    });
  }

  return shuffle([
    { id: correct.id, meaning: correct.meaning, isCorrect: true },
    ...distractors.slice(0, 3),
  ]);
}

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
  onRestart,
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
  const [spellingAnswer, setSpellingAnswer] = useState("");
  const [spellingResult, setSpellingResult] = useState<SpellingResult | null>(
    null,
  );
  const [mode, setMode] = useState<StudyMode>("spelling");
  const [choiceOptions, setChoiceOptions] = useState<ChoiceOption[]>([]);
  const [choiceResult, setChoiceResult] = useState<ChoiceResult | null>(null);
  const [finished, setFinished] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const advanceTimer = useRef<number | null>(null);
  const inFlightMemory = useRef<Set<string>>(new Set());
  const choiceRequestId = useRef(0);

  const word = words[index] ?? words[0];
  const memory = word ? memories[word.id] : undefined;
  const memoryLoading = word ? Boolean(loadingMemoryIds[word.id]) : false;
  const bookmarked = word?.userWord?.isBookmarked ?? false;
  const progress = words.length > 0 ? ((index + 1) / words.length) * 100 : 0;
  const choiceLoading =
    mode === "choice" && flipped && choiceOptions.length === 0;

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
    setSpellingAnswer("");
    setSpellingResult(null);
    setChoiceOptions([]);
    setChoiceResult(null);
    choiceRequestId.current += 1;
    setNotice(null);
    setFinished(false);
    setSaving(false);
  }

  function changeMode(nextMode: StudyMode) {
    if (nextMode === mode || saving) {
      return;
    }
    choiceRequestId.current += 1;
    setMode(nextMode);
    setFeedback(null);
    setNotice(null);
    setSpellingAnswer("");
    setSpellingResult(null);
    setChoiceOptions([]);
    setChoiceResult(null);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (isTyping) {
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

  useEffect(() => {
    if (
      mode !== "choice" ||
      !flipped ||
      !word ||
      choiceOptions.length >= 4
    ) {
      return;
    }

    const targetWord = word;
    const requestId = ++choiceRequestId.current;
    const controller = new AbortController();

    async function loadChoiceOptions() {
      let pool: Array<{ id: string; meaning: string }> = [];

      try {
        const response = await fetch(
          "/api/words?random=1&limit=60&scope=all",
          {
            signal: controller.signal,
          },
        );
        if (response.ok) {
          const payload = (await response.json()) as {
            words?: Array<{ id: string; meaning: string }>;
          };
          if (Array.isArray(payload.words)) {
            pool = payload.words;
          }
        }
      } catch {
        if (controller.signal.aborted) {
          return;
        }
      }

      if (requestId !== choiceRequestId.current) {
        return;
      }

      const localPool = words.map((item) => ({
        id: item.id,
        meaning: item.meaning,
      }));
      const options = buildChoiceOptions(targetWord, [...pool, ...localPool]);
      setChoiceOptions(options);
    }

    void loadChoiceOptions();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, flipped, word?.id, choiceOptions.length, words]);

  function speakPhrase(text: string, rate = 0.9) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setNotice("当前浏览器不支持语音朗读。");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
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

  function speak() {
    if (!word) {
      return;
    }
    speakPhrase(word.spelling, 0.88);
  }

  function speakEncouragement(rating: ReviewRating) {
    speakPhrase(rating === "known" ? "Excellent!" : "Keep going!", 0.95);
  }

  async function handleReview(
    rating: ReviewRating,
    options: { feedback?: string; delayMs?: number } = {},
  ): Promise<boolean> {
    if (!word) {
      return false;
    }

    speakEncouragement(rating);

    if (!canSave) {
      setNotice("登录后才能保存掌握程度和复习时间。");
      return false;
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
        options.feedback ??
          (rating === "unknown" || saved.interval === 0
            ? `已记录 · ${RELEARN_MINUTES} 分钟后再来`
            : saved.interval === 1
              ? "已记录 · 明天再见"
              : `已记录 · ${saved.interval} 天后复习`),
      );

      advanceTimer.current = window.setTimeout(() => {
        if (index >= words.length - 1) {
          setFinished(true);
        } else {
          setIndex((current) => current + 1);
          setFlipped(false);
          setFeedback(null);
          setSpellingAnswer("");
          setSpellingResult(null);
          setChoiceOptions([]);
          setChoiceResult(null);
          choiceRequestId.current += 1;
        }
        setSaving(false);
        advanceTimer.current = null;
      }, options.delayMs ?? 700);

      return true;
    } catch (error) {
      setSaving(false);
      setNotice(
        error instanceof Error ? error.message : "保存失败，请稍后再试。",
      );
      return false;
    }
  }

  function handleSpellingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!word || !flipped || saving || spellingResult) {
      return;
    }
    if (!canSave) {
      setNotice("登录后才能保存拼写测试结果。");
      return;
    }

    const submitted = spellingAnswer.trim();
    if (!submitted) {
      setNotice("先输入拼写，再按 Enter 验证。");
      return;
    }

    const isCorrect =
      submitted.toLowerCase() === word.spelling.trim().toLowerCase();
    setSpellingResult({
      status: isCorrect ? "correct" : "wrong",
      submitted,
    });

    void handleReview(isCorrect ? "known" : "unknown", {
      feedback: isCorrect
        ? "Excellent! · 已标记为认识"
        : `Keep going! · 已标记为不认识，${RELEARN_MINUTES} 分钟后再来`,
      delayMs: isCorrect ? 1400 : 2200,
    }).then((saved) => {
      if (!saved) {
        setSpellingResult(null);
      }
    });
  }

  function handleChoiceSelect(option: ChoiceOption) {
    if (!word || !flipped || saving || choiceLoading || choiceResult) {
      return;
    }
    if (!canSave) {
      setNotice("登录后才能保存选择题结果。");
      return;
    }

    const isCorrect = option.isCorrect;
    setChoiceResult({
      selectedId: option.id,
      correctId: word.id,
      status: isCorrect ? "correct" : "wrong",
    });

    void handleReview(isCorrect ? "known" : "unknown", {
      feedback: isCorrect
        ? "Excellent! · 已标记为认识"
        : `Keep going! · 已标记为不认识，${RELEARN_MINUTES} 分钟后再来`,
      delayMs: isCorrect ? 900 : 2200,
    }).then((saved) => {
      if (!saved) {
        setChoiceResult(null);
      }
    });
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
    if (onRestart) {
      onRestart();
      return;
    }
    setIndex(0);
    setFlipped(false);
    setFeedback(null);
    setSpellingAnswer("");
    setSpellingResult(null);
    setChoiceOptions([]);
    setChoiceResult(null);
    choiceRequestId.current += 1;
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

        {!finished ? (
          <div className="flex justify-center pb-3">
            <div
              className="inline-flex items-center gap-1 rounded-full border border-paper/15 bg-paper/5 p-1"
              role="group"
              aria-label="闪卡学习模式"
            >
              {studyModes.map((option) => {
                const active = mode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => changeMode(option.id)}
                    disabled={saving}
                    aria-pressed={active}
                    className={`inline-flex h-8 items-center justify-center rounded-full px-3.5 text-[11px] font-medium transition sm:text-xs ${
                      active
                        ? "bg-paper text-ink shadow-sm"
                        : "text-paper/60 hover:text-paper"
                    } disabled:cursor-not-allowed disabled:opacity-45`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

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
                  {onRestart ? "刷新今日队列" : "再来一轮"}
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
                              {mode === "choice" ? "选择题" : "Meaning"}
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

                          {mode === "spelling" ? (
                            <>
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

                          <form
                            onSubmit={handleSpellingSubmit}
                            onClick={(event) => event.stopPropagation()}
                            className="mt-5 rounded-2xl border border-line/70 bg-cream/75 p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <label
                                htmlFor={`spelling-${word.id}`}
                                className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint"
                              >
                                拼写验证
                              </label>
                              <span className="text-[9px] text-ink-faint">
                                {canSave ? "按 Enter 提交" : "登录后可保存结果"}
                              </span>
                            </div>
                            <p className="mt-1.5 text-[11px] leading-4 text-ink-faint">
                              先别看答案，凭记忆写出这个词。
                            </p>
                            <div className="mt-3 flex gap-2">
                              <input
                                id={`spelling-${word.id}`}
                                type="text"
                                value={spellingAnswer}
                                onChange={(event) =>
                                  setSpellingAnswer(event.target.value)
                                }
                                placeholder={
                                  canSave
                                    ? "请输入拼写以验证记忆"
                                    : "登录后输入拼写"
                                }
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="none"
                                spellCheck={false}
                                enterKeyHint="done"
                                maxLength={64}
                                disabled={
                                  !canSave || saving || Boolean(spellingResult)
                                }
                                className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-cream px-3 font-mono text-sm text-ink outline-none transition placeholder:font-sans placeholder:text-[11px] placeholder:text-ink-faint focus:border-moss/50 focus:ring-2 focus:ring-moss/10 disabled:cursor-not-allowed disabled:opacity-55"
                              />
                              <button
                                type="submit"
                                disabled={
                                  !canSave ||
                                  saving ||
                                  Boolean(spellingResult) ||
                                  !spellingAnswer.trim()
                                }
                                className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-ink px-4 text-xs font-medium text-paper transition hover:bg-moss-deep disabled:cursor-not-allowed disabled:opacity-35"
                              >
                                验证
                              </button>
                            </div>

                            {spellingResult?.status === "correct" ? (
                              <p
                                role="status"
                                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-moss"
                              >
                                <CircleCheck className="size-3.5" />
                                拼写正确，正在标记为「认识」。
                              </p>
                            ) : spellingResult ? (
                              <div
                                role="alert"
                                className="mt-3 rounded-xl border border-[#c35b4a]/25 bg-[#fbe9e4] px-3 py-2.5 text-xs text-[#9f3f32]"
                              >
                                <p className="flex items-center gap-1.5 font-medium">
                                  <X className="size-3.5" />
                                  拼写错误，正在标记为「不认识」。
                                </p>
                                <p className="mt-1.5">
                                  正确拼写：
                                  <strong className="font-mono text-sm">
                                    {word.spelling}
                                  </strong>
                                </p>
                                <p className="mt-1 text-[10px] text-[#9f3f32]/70">
                                  你的输入：
                                  <span className="font-mono line-through">
                                    {spellingResult.submitted}
                                  </span>
                                </p>
                              </div>
                            ) : null}
                          </form>

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
                            </>
                          ) : (
                            <div
                              className="mt-4 flex flex-1 flex-col"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
                                Choose the meaning
                              </p>
                              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <p className="font-display text-3xl leading-tight tracking-tight text-ink">
                                  {word.spelling}
                                </p>
                                <p className="font-mono text-xs text-ink-faint">
                                  {word.phonetic}
                                </p>
                              </div>
                              <p className="mt-2 text-xs leading-5 text-ink-soft">
                                从下面四个中文释义中，选出正确的一项。
                              </p>

                              <div className="mt-4 grid gap-2">
                                {choiceLoading || choiceOptions.length === 0 ? (
                                  [0, 1, 2, 3].map((item) => (
                                    <div
                                      key={item}
                                      className="h-[3.25rem] animate-soft-pulse rounded-xl bg-ink/[0.06]"
                                    />
                                  ))
                                ) : (
                                  choiceOptions.map((option, optionIndex) => {
                                    const selected =
                                      choiceResult?.selectedId === option.id;
                                    const selectedCorrect =
                                      selected &&
                                      choiceResult?.status === "correct";
                                    const selectedWrong =
                                      selected &&
                                      choiceResult?.status === "wrong";
                                    const revealCorrect =
                                      choiceResult?.status === "wrong" &&
                                      option.isCorrect;

                                    let optionClass =
                                      "border-line bg-cream/80 text-ink hover:border-moss/40 hover:bg-lime/25";
                                    if (selectedCorrect) {
                                      optionClass =
                                        "border-moss bg-lime text-moss-deep";
                                    } else if (revealCorrect) {
                                      optionClass =
                                        "border-[#c35b4a] bg-[#fbe9e4] text-[#9f3f32]";
                                    } else if (selectedWrong) {
                                      optionClass =
                                        "border-[#c35b4a]/45 bg-[#fbe9e4]/70 text-[#9f3f32]";
                                    } else if (choiceResult) {
                                      optionClass =
                                        "border-line/60 bg-cream/40 text-ink-faint";
                                    }

                                    return (
                                      <button
                                        key={option.id}
                                        type="button"
                                        onClick={() =>
                                          handleChoiceSelect(option)
                                        }
                                        disabled={
                                          !canSave ||
                                          saving ||
                                          choiceLoading ||
                                          Boolean(choiceResult)
                                        }
                                        aria-pressed={selected}
                                        className={`flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition disabled:cursor-not-allowed ${optionClass}`}
                                      >
                                        <span
                                          className="grid size-6 shrink-0 place-items-center rounded-full border border-current/20 font-mono text-[10px] opacity-70"
                                          aria-hidden="true"
                                        >
                                          {String.fromCharCode(65 + optionIndex)}
                                        </span>
                                        <span
                                          className={`min-w-0 flex-1 leading-5 ${
                                            selectedWrong ? "line-through" : ""
                                          }`}
                                        >
                                          {option.meaning}
                                        </span>
                                        {selectedCorrect ? (
                                          <Check
                                            className="size-4 shrink-0"
                                            strokeWidth={2}
                                          />
                                        ) : revealCorrect || selectedWrong ? (
                                          <X
                                            className="size-4 shrink-0"
                                            strokeWidth={2}
                                          />
                                        ) : null}
                                      </button>
                                    );
                                  })
                                )}
                              </div>

                              {choiceResult ? (
                                <div
                                  role="status"
                                  aria-live="polite"
                                  className={`mt-3 rounded-xl border px-3 py-2.5 text-xs ${
                                    choiceResult.status === "correct"
                                      ? "border-moss/25 bg-lime/60 text-moss-deep"
                                      : "border-[#c35b4a]/25 bg-[#fbe9e4] text-[#9f3f32]"
                                  }`}
                                >
                                  <p className="flex items-center gap-1.5 font-medium">
                                    {choiceResult.status === "correct" ? (
                                      <Check className="size-3.5" />
                                    ) : (
                                      <X className="size-3.5" />
                                    )}
                                    {choiceResult.status === "correct"
                                      ? "回答正确，已标记为「认识」。"
                                      : "回答错误，已标记为「不认识」。"}
                                  </p>
                                  {choiceResult.status === "wrong" ? (
                                    <p className="mt-1 leading-5">
                                      正确答案：
                                      <strong className="font-semibold">
                                        {word.meaning}
                                      </strong>
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}

                              {!canSave ? (
                                <p className="mt-3 text-[11px] leading-5 text-ink-faint">
                                  登录后才能记录答案。
                                  <Link
                                    href="/login"
                                    onClick={(event) =>
                                      event.stopPropagation()
                                    }
                                    className="ml-1 font-medium text-moss underline decoration-moss/30 underline-offset-4"
                                  >
                                    去登录
                                  </Link>
                                </p>
                              ) : null}

                              <p className="mt-auto pt-4 text-center text-[10px] text-ink-faint">
                                点击选项即自动记录；答错会标出正确释义。
                              </p>
                            </div>
                          )}

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

                {mode === "spelling" ? (
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
                ) : (
                  <p className="mt-2 text-center text-[10px] text-paper/40">
                    选择题模式：点击正确释义即自动标记「认识」，答错自动标为「不认识」。
                  </p>
                )}
                {!flipped ? (
                  <p className="mt-2 text-center text-[10px] text-paper/40">
                    {mode === "choice"
                      ? "先翻面，再从四个释义中选出正确答案。"
                      : "先翻面看看释义，再判断自己的掌握程度。"}
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
