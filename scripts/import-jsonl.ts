import "dotenv/config";

import { readFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const INPUT_FILE = path.resolve(process.cwd(), "junior.jsonl");
const BOOK_SLUG = "junior-imported";
const BATCH_SIZE = 100;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function first<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function text(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function readWord(record: JsonObject): string | undefined {
  const word = isObject(record.word) ? record.word : undefined;
  const content = isObject(record.content) ? record.content : undefined;
  const contentWord =
    content && isObject(content.word) ? content.word : undefined;
  const deepContent =
    contentWord && isObject(contentWord.content)
      ? contentWord.content
      : undefined;

  return text(
    text(record.word) ??
      text(record.headWord) ??
      text(record.name) ??
      text(record.spelling) ??
      word?.wordHead ??
      contentWord?.wordHead ??
      deepContent?.wordHead,
  );
}

function readTranslation(record: JsonObject): string | undefined {
  const content = isObject(record.content) ? record.content : undefined;
  const contentWord =
    content && isObject(content.word) ? content.word : undefined;
  const deepContent =
    contentWord && isObject(contentWord.content)
      ? contentWord.content
      : undefined;

  const raw = first(
    (record.translation ??
      record.meaning ??
      record.definition ??
      record.trans ??
      deepContent?.trans) as unknown,
  );

  if (typeof raw === "string") return text(raw);
  if (isObject(raw)) {
    return text(
      raw.tranCn ??
        raw.translation ??
        raw.meaning ??
        raw.zh ??
        raw.cn ??
        raw.text,
    );
  }
  return undefined;
}

function readPartOfSpeech(record: JsonObject): string | undefined {
  const content = isObject(record.content) ? record.content : undefined;
  const contentWord =
    content && isObject(content.word) ? content.word : undefined;
  const deepContent =
    contentWord && isObject(contentWord.content)
      ? contentWord.content
      : undefined;
  const rawTrans = first((deepContent?.trans ?? record.trans) as unknown);
  const trans = isObject(rawTrans) ? rawTrans : undefined;

  return text(
    record.type ??
      record.partOfSpeech ??
      record.pos ??
      trans?.pos ??
      deepContent?.pos,
  );
}

function readPhonetic(record: JsonObject): string | undefined {
  const content = isObject(record.content) ? record.content : undefined;
  const contentWord =
    content && isObject(content.word) ? content.word : undefined;
  const deepContent =
    contentWord && isObject(contentWord.content)
      ? contentWord.content
      : undefined;

  return text(
    record.phonetic ??
      record.usphone ??
      record.ukphone ??
      deepContent?.phone ??
      deepContent?.usphone ??
      deepContent?.ukphone,
  );
}

function readExamples(record: JsonObject): {
  exampleEn?: string;
  exampleZh?: string;
} {
  const content = isObject(record.content) ? record.content : undefined;
  const contentWord =
    content && isObject(content.word) ? content.word : undefined;
  const deepContent =
    contentWord && isObject(contentWord.content)
      ? contentWord.content
      : undefined;

  const rawSentence =
    record.exampleEn ??
    record.example ??
    record.sentence ??
    deepContent?.sentence;
  let sentence = first(rawSentence as unknown);

  if (isObject(sentence) && Array.isArray(sentence.sentences)) {
    sentence = first(sentence.sentences as unknown);
  }

  if (isObject(sentence)) {
    return {
      exampleEn: text(sentence.sContent ?? sentence.en ?? sentence.example),
      exampleZh: text(sentence.sCn ?? sentence.zh ?? sentence.translation),
    };
  }

  return {
    exampleEn: text(record.exampleEn ?? record.example ?? sentence),
    exampleZh: text(record.exampleZh ?? record.exampleCn),
  };
}

function readMemoryHint(record: JsonObject): string | undefined {
  const content = isObject(record.content) ? record.content : undefined;
  const contentWord =
    content && isObject(content.word) ? content.word : undefined;
  const deepContent =
    contentWord && isObject(contentWord.content)
      ? contentWord.content
      : undefined;
  const raw = deepContent?.remMethod;

  if (isObject(raw)) return text(raw.val ?? raw.text ?? raw.desc);
  return text(record.memoryHint ?? record.mnemonic ?? raw);
}

function normalizeSpelling(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

async function main() {
  const raw = readFileSync(INPUT_FILE, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length === 0) {
    throw new Error(`No records found in ${INPUT_FILE}`);
  }

  const records = new Map<
    string,
    {
      spelling: string;
      phonetic: string;
      partOfSpeech?: string;
      meaning: string;
      exampleEn?: string;
      exampleZh?: string;
      memoryHint?: string;
    }
  >();
  let malformed = 0;
  let missingMeaning = 0;
  let duplicates = 0;

  for (const line of lines) {
    let record: JsonObject;
    try {
      const parsed: unknown = JSON.parse(line);
      if (!isObject(parsed)) {
        malformed += 1;
        continue;
      }
      record = parsed;
    } catch {
      malformed += 1;
      continue;
    }

    const rawSpelling = readWord(record);
    const meaning = readTranslation(record);
    if (!rawSpelling || !meaning) {
      missingMeaning += 1;
      continue;
    }

    const spelling = normalizeSpelling(rawSpelling);
    const key = spelling.toLowerCase();
    if (records.has(key)) {
      duplicates += 1;
      continue;
    }

    const examples = readExamples(record);
    records.set(key, {
      spelling,
      phonetic: readPhonetic(record) ?? "",
      partOfSpeech: readPartOfSpeech(record),
      meaning,
      exampleEn: examples.exampleEn,
      exampleZh: examples.exampleZh,
      memoryHint: readMemoryHint(record),
    });
  }

  const rows = [...records.values()];
  if (rows.length === 0) {
    throw new Error("No valid records found; nothing was imported.");
  }

  const dryRun = process.argv.includes("--dry-run");
  const summary = {
    file: INPUT_FILE,
    lines: lines.length,
    uniqueWords: rows.length,
    duplicates,
    malformed,
    skippedWithoutWordOrMeaning: missingMeaning,
    dryRun,
  };

  if (dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const book = await prisma.wordBook.upsert({
    where: { slug: BOOK_SLUG },
    update: {
      title: "初中词汇导入",
      subtitle: "Junior Vocabulary · JSONL import",
      description: "从 junior.jsonl 导入的初中词汇。",
      level: "初中",
      accent: "#ffe7c2",
      emoji: "🌱",
      sortOrder: 7,
    },
    create: {
      slug: BOOK_SLUG,
      title: "初中词汇导入",
      subtitle: "Junior Vocabulary · JSONL import",
      description: "从 junior.jsonl 导入的初中词汇。",
      level: "初中",
      accent: "#ffe7c2",
      emoji: "🌱",
      sortOrder: 7,
    },
  });

  let imported = 0;
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((row) =>
        prisma.word.upsert({
          where: {
            wordBookId_spelling: {
              wordBookId: book.id,
              spelling: row.spelling,
            },
          },
          update: {
            phonetic: row.phonetic,
            partOfSpeech: row.partOfSpeech,
            meaning: row.meaning,
            exampleEn: row.exampleEn,
            exampleZh: row.exampleZh,
            memoryHint: row.memoryHint,
          },
          create: {
            wordBookId: book.id,
            ...row,
          },
        }),
      ),
    );
    imported += batch.length;
  }

  console.log(
    JSON.stringify(
      {
        ...summary,
        imported,
        wordBook: { id: book.id, slug: book.slug, title: book.title },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });