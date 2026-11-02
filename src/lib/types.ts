export type DataSource = "database" | "preview";

export type WordBookSummary = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  level: string;
  accent: string;
  emoji: string;
  wordCount: number;
  masteredCount: number;
  /** Words that have never been studied by this user. */
  newCount: number;
  /** Due or waiting to reappear later today. */
  dueCount: number;
  progress: number;
};

export type WordView = {
  id: string;
  spelling: string;
  phonetic: string;
  partOfSpeech: string | null;
  meaning: string;
  exampleEn: string | null;
  exampleZh: string | null;
  memoryHint: string | null;
  wordBookId: string;
};

export type UserWordSnapshot = {
  mastery: number;
  isBookmarked: boolean;
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReviewAt: string;
  lastRating: string | null;
};

export type WordWithProgress = WordView & {
  userWord: UserWordSnapshot | null;
};

export type WordBookDetail = {
  book: WordBookSummary;
  words: WordWithProgress[];
  /** Unknown words that will re-enter the queue later today. */
  pendingToday: number;
  nextReviewAt: string | null;
  completed: boolean;
};

export type LearningStats = {
  totalWords: number;
  /** Never studied: no UserWord row exists. */
  newWords: number;
  studied: number;
  mastered: number;
  /** Due now, plus unknown words waiting to reappear later today. */
  due: number;
  bookmarked: number;
  streak: number;
  /** Distinct words rated today (Asia/Shanghai calendar day). */
  todayStudied: number;
  streakGoal: number;
  streakRemaining: number;
  checkedInToday: boolean;
};

export type BookmarkItem = WordWithProgress & {
  book: Pick<WordBookSummary, "slug" | "title" | "accent" | "emoji">;
  bookmarkedAt: string;
};

export type ReviewRating = "known" | "fuzzy" | "unknown";

export type MemoryHints = {
  association: string;
  root: string;
  mnemonic: string;
};

export type MemoryApiResponse = {
  memory: MemoryHints;
  source: "ai" | "preview" | "fallback";
  model?: string;
  cached?: boolean;
};

export type Viewer = {
  id: string;
  email: string;
  name: string | null;
};
