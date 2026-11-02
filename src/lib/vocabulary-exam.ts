import type { SeedWordBook } from "./wordbook-data";
import { cet4Words } from "./vocabulary-cet4";
import { juniorWords } from "./vocabulary-junior";

/**
 * Two extra exam-oriented books, kept as static seed data.
 * The Prisma seed upserts them by slug, so existing books are updated and
 * missing books are created automatically.
 */
export const examWordBooks: SeedWordBook[] = [
  {
    slug: "junior-foundation",
    title: "初中词汇",
    subtitle: "Junior Foundations · 100 词",
    description:
      "初中英语最常见的 100 个基础单词，覆盖日常表达、校园生活与简单阅读。",
    level: "A1–A2 · 初中",
    accent: "#ffe7c2",
    emoji: "🌱",
    sortOrder: 5,
    words: juniorWords,
  },
  {
    slug: "cet4-core",
    title: "四级核心",
    subtitle: "CET-4 Core · 200 词",
    description:
      "四级考试高频核心词，适合在完成基础词汇后集中突破阅读与写作表达。",
    level: "B1–B2 · 四级",
    accent: "#d9e8ff",
    emoji: "🎯",
    sortOrder: 6,
    words: cet4Words,
  },
];
