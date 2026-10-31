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
};

export type LearningStats = {
  totalWords: number;
  studied: number;
  mastered: number;
  due: number;
  bookmarked: number;
  streak: number;
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
