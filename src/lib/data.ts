import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import type {
  BookmarkItem,
  DataSource,
  LearningStats,
  UserWordSnapshot,
  Viewer,
  WordBookDetail,
  WordBookSummary,
  WordView,
  WordWithProgress,
} from "@/lib/types";
import { findSeedBook, wordbookSeed } from "@/lib/wordbook-data";
import { studyDayKey } from "@/lib/study-streak";

export const MASTERED_AT = 4;

type ProgressRow = {
  wordId: string;
  mastery: number;
  nextReviewAt: Date;
  isBookmarked: boolean;
  interval: number;
  repetitions: number;
  easeFactor: number;
  lastRating: string | null;
};

type ProgressTotals = {
  mastered: number;
  due: number;
};

function previewBookId(slug: string) {
  return `preview-book-${slug}`;
}

function previewWordId(bookSlug: string, spelling: string) {
  return `preview-word-${bookSlug}-${spelling}`;
}

function emptySummary(
  book: (typeof wordbookSeed)[number],
): WordBookSummary {
  return {
    id: previewBookId(book.slug),
    slug: book.slug,
    title: book.title,
    subtitle: book.subtitle,
    description: book.description,
    level: book.level,
    accent: book.accent,
    emoji: book.emoji,
    wordCount: book.words.length,
    masteredCount: 0,
    dueCount: book.words.length,
    progress: 0,
  };
}

function previewWord(bookSlug: string, index: number): WordView {
  const book = findSeedBook(bookSlug);
  const word = book?.words[index];
  if (!book || !word) {
    throw new Error(`Unknown preview word ${bookSlug}[${index}]`);
  }

  return {
    id: previewWordId(book.slug, word.spelling),
    spelling: word.spelling,
    phonetic: word.phonetic,
    partOfSpeech: word.partOfSpeech,
    meaning: word.meaning,
    exampleEn: word.exampleEn,
    exampleZh: word.exampleZh,
    memoryHint: word.memoryHint,
    wordBookId: previewBookId(book.slug),
  };
}

function previewBooks(): WordBookSummary[] {
  return wordbookSeed.map(emptySummary);
}

function previewBookDetail(slug: string): WordBookDetail | null {
  const seed = findSeedBook(slug);
  if (!seed) {
    return null;
  }

  return {
    book: emptySummary(seed),
    words: seed.words.map((_, index) => ({
      ...previewWord(slug, index),
      userWord: null,
    })),
    pendingToday: 0,
    nextReviewAt: null,
    completed: false,
  };
}

function toUserWordSnapshot(row: ProgressRow): UserWordSnapshot {
  return {
    mastery: row.mastery,
    isBookmarked: row.isBookmarked,
    interval: row.interval,
    repetitions: row.repetitions,
    easeFactor: row.easeFactor,
    nextReviewAt: row.nextReviewAt.toISOString(),
    lastRating: row.lastRating,
  };
}

function countProgress(rows: ProgressRow[]): ProgressTotals {
  const now = Date.now();
  return rows.reduce<ProgressTotals>(
    (totals, row) => ({
      mastered: totals.mastered + (row.mastery >= MASTERED_AT ? 1 : 0),
      due: totals.due + (row.nextReviewAt.getTime() <= now ? 1 : 0),
    }),
    { mastered: 0, due: 0 },
  );
}

function progressMap(rows: ProgressRow[]) {
  return new Map(rows.map((row) => [row.wordId, row]));
}

export type BooksResult = {
  books: WordBookSummary[];
  source: DataSource;
};

export async function getWordBooks(
  viewer: Viewer | null,
): Promise<BooksResult> {
  if (!hasDatabaseUrl) {
    return { books: previewBooks(), source: "preview" };
  }

  try {
    const books = await prisma.wordBook.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { words: true } } },
    });

    const rows = viewer
      ? await prisma.userWord.findMany({
          where: { userId: viewer.id },
          select: {
            mastery: true,
            nextReviewAt: true,
            lastRating: true,
            word: { select: { wordBookId: true } },
          },
        })
      : [];

    const now = new Date();
    const today = studyDayKey(now);
    const totalsByBook = new Map<string, ProgressTotals>();
    const seenByBook = new Map<string, number>();
    for (const row of rows) {
      const bookId = row.word.wordBookId;
      const current = totalsByBook.get(bookId) ?? {
        mastered: 0,
        due: 0,
      };
      const isMastered = row.mastery >= MASTERED_AT;
      const isDue = row.nextReviewAt.getTime() <= now.getTime();
      const isPendingToday =
        row.lastRating === "unknown" &&
        row.nextReviewAt.getTime() > now.getTime() &&
        studyDayKey(row.nextReviewAt) === today;
      totalsByBook.set(bookId, {
        mastered: current.mastered + (isMastered ? 1 : 0),
        due: current.due + (isDue || isPendingToday ? 1 : 0),
      });
      seenByBook.set(bookId, (seenByBook.get(bookId) ?? 0) + 1);
    }

    return {
      source: "database",
      books: books.map((book) => {
        const wordCount = book._count.words;
        const totals = totalsByBook.get(book.id) ?? { mastered: 0, due: 0 };
        const seen = seenByBook.get(book.id) ?? 0;
        return {
          id: book.id,
          slug: book.slug,
          title: book.title,
          subtitle: book.subtitle,
          description: book.description,
          level: book.level,
          accent: book.accent,
          emoji: book.emoji,
          wordCount,
          masteredCount: totals.mastered,
          dueCount: totals.due + Math.max(0, wordCount - seen),
          progress:
            wordCount > 0
              ? Math.round((totals.mastered / wordCount) * 100)
              : 0,
        };
      }),
    };
  } catch (error) {
    console.error("[data] Falling back to preview word books", error);
    return { books: previewBooks(), source: "preview" };
  }
}

export type BookDetailResult = {
  detail: WordBookDetail;
  source: DataSource;
};

export async function getWordBookDetail(
  slug: string,
  viewer: Viewer | null,
): Promise<BookDetailResult | null> {
  if (!hasDatabaseUrl) {
    const detail = previewBookDetail(slug);
    return detail ? { detail, source: "preview" } : null;
  }

  try {
    const book = await prisma.wordBook.findUnique({
      where: { slug },
      include: {
        _count: { select: { words: true } },
        words: { orderBy: { spelling: "asc" } },
      },
    });

    if (!book) {
      return null;
    }

    const rows = viewer
      ? await prisma.userWord.findMany({
          where: {
            userId: viewer.id,
            wordId: { in: book.words.map((word) => word.id) },
          },
          select: {
            wordId: true,
            mastery: true,
            nextReviewAt: true,
            isBookmarked: true,
            interval: true,
            repetitions: true,
            easeFactor: true,
            lastRating: true,
          },
        })
      : [];

    const rowsByWord = progressMap(rows);
    const totals = countProgress(rows);
    const wordCount = book._count.words;
    const now = new Date();
    const today = studyDayKey(now);

    const dueRows = rows.filter(
      (row) => row.nextReviewAt.getTime() <= now.getTime(),
    ).length;
    const pendingRows = rows
      .filter(
        (row) =>
          row.lastRating === "unknown" &&
          row.nextReviewAt.getTime() > now.getTime() &&
          studyDayKey(row.nextReviewAt) === today,
      )
      .sort((left, right) => {
        return left.nextReviewAt.getTime() - right.nextReviewAt.getTime();
      });
    const dueCount =
      dueRows +
      Math.max(0, wordCount - rows.length) +
      pendingRows.length;
    const queueWords = book.words.filter((word) => {
      const progress = rowsByWord.get(word.id);
      return !progress || progress.nextReviewAt.getTime() <= now.getTime();
    });

    return {
      source: "database",
      detail: {
        book: {
          id: book.id,
          slug: book.slug,
          title: book.title,
          subtitle: book.subtitle,
          description: book.description,
          level: book.level,
          accent: book.accent,
          emoji: book.emoji,
          wordCount,
          masteredCount: totals.mastered,
          dueCount,
          progress:
            wordCount > 0
              ? Math.round((totals.mastered / wordCount) * 100)
              : 0,
        },
        pendingToday: pendingRows.length,
        nextReviewAt: pendingRows[0]?.nextReviewAt.toISOString() ?? null,
        completed:
          queueWords.length === 0 && wordCount > 0 && pendingRows.length === 0,
        words: queueWords.map((word) => {
          const progress = rowsByWord.get(word.id);
          return {
            id: word.id,
            spelling: word.spelling,
            phonetic: word.phonetic,
            partOfSpeech: word.partOfSpeech,
            meaning: word.meaning,
            exampleEn: word.exampleEn,
            exampleZh: word.exampleZh,
            memoryHint: word.memoryHint,
            wordBookId: word.wordBookId,
            userWord: progress ? toUserWordSnapshot(progress) : null,
          };
        }),
      },
    };
  } catch (error) {
    console.error("[data] Falling back to preview word book", error);
    const detail = previewBookDetail(slug);
    return detail ? { detail, source: "preview" } : null;
  }
}

export type BookmarksResult = {
  bookmarks: BookmarkItem[];
  source: DataSource;
};

export async function getBookmarks(
  viewer: Viewer | null,
): Promise<BookmarksResult> {
  if (!viewer || !hasDatabaseUrl) {
    return { bookmarks: [], source: "preview" };
  }

  try {
    const rows = await prisma.userWord.findMany({
      where: { userId: viewer.id, isBookmarked: true },
      orderBy: { updatedAt: "desc" },
      include: { word: { include: { wordBook: true } } },
    });

    return {
      source: "database",
      bookmarks: rows.map((row) => ({
        id: row.word.id,
        spelling: row.word.spelling,
        phonetic: row.word.phonetic,
        partOfSpeech: row.word.partOfSpeech,
        meaning: row.word.meaning,
        exampleEn: row.word.exampleEn,
        exampleZh: row.word.exampleZh,
        memoryHint: row.word.memoryHint,
        wordBookId: row.word.wordBookId,
        userWord: toUserWordSnapshot(row),
        book: {
          slug: row.word.wordBook.slug,
          title: row.word.wordBook.title,
          accent: row.word.wordBook.accent,
          emoji: row.word.wordBook.emoji,
        },
        bookmarkedAt: row.updatedAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("[data] Could not load bookmarks", error);
    return { bookmarks: [], source: "preview" };
  }
}

export type StatsResult = {
  stats: LearningStats;
  source: DataSource;
};

const EMPTY_STATS: LearningStats = {
  totalWords: 0,
  studied: 0,
  mastered: 0,
  due: 0,
  bookmarked: 0,
  streak: 0,
};

export async function getLearningStats(
  viewer: Viewer | null,
): Promise<StatsResult> {
  if (!hasDatabaseUrl) {
    const totalWords = wordbookSeed.reduce(
      (sum, book) => sum + book.words.length,
      0,
    );
    return {
      source: "preview",
      stats: {
        ...EMPTY_STATS,
        totalWords,
        due: totalWords,
      },
    };
  }

  try {
    const now = new Date();
    const [
      totalWords,
      studied,
      mastered,
      due,
      bookmarked,
      pendingRows,
      profile,
    ] = await Promise.all([
      prisma.word.count(),
      viewer
        ? prisma.userWord.count({ where: { userId: viewer.id } })
        : Promise.resolve(0),
      viewer
        ? prisma.userWord.count({
            where: { userId: viewer.id, mastery: { gte: MASTERED_AT } },
          })
        : Promise.resolve(0),
      viewer
        ? prisma.userWord.count({
            where: {
              userId: viewer.id,
              nextReviewAt: { lte: now },
            },
          })
        : Promise.resolve(0),
      viewer
        ? prisma.userWord.count({
            where: { userId: viewer.id, isBookmarked: true },
          })
        : Promise.resolve(0),
      viewer
        ? prisma.userWord.findMany({
            where: {
              userId: viewer.id,
              lastRating: "unknown",
              nextReviewAt: { gt: now },
            },
            select: { nextReviewAt: true },
          })
        : Promise.resolve([]),
      viewer
        ? prisma.user.findUnique({
            where: { id: viewer.id },
            select: { studyStreak: true },
          })
        : Promise.resolve(null),
    ]);

    const today = studyDayKey(now);
    const pendingToday = pendingRows.filter(
      (row) => studyDayKey(row.nextReviewAt) === today,
    ).length;

    return {
      source: "database",
      stats: {
        totalWords,
        studied,
        mastered,
        due: due + Math.max(0, totalWords - studied) + pendingToday,
        bookmarked,
        streak: Math.max(0, profile?.studyStreak ?? 0),
      },
    };
  } catch (error) {
    console.error("[data] Could not load learning stats", error);
    return { source: "preview", stats: EMPTY_STATS };
  }
}

export type WordsResult = {
  words: WordWithProgress[];
  /** Number of words in the active review queue (not just this page). */
  total: number;
  totalWords: number;
  completed: boolean;
  pendingToday: number;
  nextReviewAt: string | null;
  source: DataSource;
};

export type WordQuery = {
  bookSlug?: string;
  random?: boolean;
  limit?: number;
  viewer: Viewer | null;
  /** "review" returns today's due + unlearned words. "all" is for pickers. */
  scope?: "review" | "all";
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function previewWordsResult(
  bookSlug: string | undefined,
  random: boolean | undefined,
  limit: number,
): WordsResult {
  const preview = wordbookSeed
    .filter((book) => !bookSlug || book.slug === bookSlug)
    .flatMap((book) =>
      book.words.map((_, index) => ({
        ...previewWord(book.slug, index),
        userWord: null,
      })),
    );
  const ordered = random ? shuffle(preview) : preview;
  return {
    words: ordered.slice(0, limit),
    total: preview.length,
    totalWords: preview.length,
    completed: false,
    pendingToday: 0,
    nextReviewAt: null,
    source: "preview",
  };
}

export async function getWords(query: WordQuery): Promise<WordsResult> {
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
  const bookSlug = query.bookSlug?.trim() || undefined;
  const scope = query.scope ?? "review";
  const now = new Date();

  if (!hasDatabaseUrl) {
    return previewWordsResult(bookSlug, query.random, limit);
  }

  try {
    const bookWhere = bookSlug
      ? { wordBook: { slug: bookSlug } }
      : {};
    const queueWhere =
      scope === "review" && query.viewer
        ? {
            OR: [
              { userWords: { none: { userId: query.viewer.id } } },
              {
                userWords: {
                  some: {
                    userId: query.viewer.id,
                    nextReviewAt: { lte: now },
                  },
                },
              },
            ],
          }
        : {};
    const where = { ...bookWhere, ...queueWhere };

    const [words, queueTotal, totalWords] = await Promise.all([
      prisma.word.findMany({
        where,
        orderBy: { spelling: "asc" },
        take: 500,
      }),
      prisma.word.count({ where }),
      prisma.word.count({ where: bookWhere }),
    ]);

    const rows = query.viewer
      ? await prisma.userWord.findMany({
          where: {
            userId: query.viewer.id,
            wordId: { in: words.map((word) => word.id) },
          },
          select: {
            wordId: true,
            mastery: true,
            nextReviewAt: true,
            isBookmarked: true,
            interval: true,
            repetitions: true,
            easeFactor: true,
            lastRating: true,
          },
        })
      : [];

    const rowsByWord = progressMap(rows);
    const mapped: WordWithProgress[] = words.map((word) => {
      const progress = rowsByWord.get(word.id);
      return {
        id: word.id,
        spelling: word.spelling,
        phonetic: word.phonetic,
        partOfSpeech: word.partOfSpeech,
        meaning: word.meaning,
        exampleEn: word.exampleEn,
        exampleZh: word.exampleZh,
        memoryHint: word.memoryHint,
        wordBookId: word.wordBookId,
        userWord: progress ? toUserWordSnapshot(progress) : null,
      };
    });

    let pendingToday = 0;
    let nextReviewAt: string | null = null;

    // An empty due queue is not necessarily "done": unknown answers are
    // parked for a few minutes and should surface again today.
    if (scope === "review" && query.viewer && queueTotal === 0) {
      const pending = await prisma.userWord.findMany({
        where: {
          userId: query.viewer.id,
          lastRating: "unknown",
          nextReviewAt: { gt: now },
          ...(bookSlug
            ? { word: { wordBook: { slug: bookSlug } } }
            : {}),
        },
        orderBy: { nextReviewAt: "asc" },
        select: { nextReviewAt: true },
      });
      const today = studyDayKey(now);
      const todayPending = pending.filter(
        (row) => studyDayKey(row.nextReviewAt) === today,
      );
      pendingToday = todayPending.length;
      nextReviewAt = todayPending[0]?.nextReviewAt.toISOString() ?? null;
    }

    const ordered = query.random ? shuffle(mapped) : mapped;
    return {
      words: ordered.slice(0, limit),
      total: queueTotal,
      totalWords,
      completed: queueTotal === 0 && totalWords > 0 && pendingToday === 0,
      pendingToday,
      nextReviewAt,
      source: "database",
    };
  } catch (error) {
    console.error("[data] Falling back to preview words", error);
    return previewWordsResult(bookSlug, query.random, limit);
  }
}

export async function findWordById(id: string): Promise<WordView | null> {
  if (hasDatabaseUrl) {
    try {
      const word = await prisma.word.findUnique({ where: { id } });
      if (word) {
        return {
          id: word.id,
          spelling: word.spelling,
          phonetic: word.phonetic,
          partOfSpeech: word.partOfSpeech,
          meaning: word.meaning,
          exampleEn: word.exampleEn,
          exampleZh: word.exampleZh,
          memoryHint: word.memoryHint,
          wordBookId: word.wordBookId,
        };
      }
      return null;
    } catch (error) {
      console.error("[data] Could not find word in database", error);
    }
  }

  for (const book of wordbookSeed) {
    const index = book.words.findIndex((_, wordIndex) => {
      return previewWord(book.slug, wordIndex).id === id;
    });
    if (index >= 0) {
      return previewWord(book.slug, index);
    }
  }

  return null;
}

export async function findWordBySpelling(
  spelling: string,
): Promise<WordView | null> {
  const normalized = spelling.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (hasDatabaseUrl) {
    try {
      const word = await prisma.word.findFirst({
        where: { spelling: { equals: normalized, mode: "insensitive" } },
      });
      if (word) {
        return {
          id: word.id,
          spelling: word.spelling,
          phonetic: word.phonetic,
          partOfSpeech: word.partOfSpeech,
          meaning: word.meaning,
          exampleEn: word.exampleEn,
          exampleZh: word.exampleZh,
          memoryHint: word.memoryHint,
          wordBookId: word.wordBookId,
        };
      }
    } catch (error) {
      console.error("[data] Could not find word spelling", error);
    }
  }

  for (const book of wordbookSeed) {
    const index = book.words.findIndex(
      (word) => word.spelling.toLowerCase() === normalized,
    );
    if (index >= 0) {
      return previewWord(book.slug, index);
    }
  }

  return null;
}
