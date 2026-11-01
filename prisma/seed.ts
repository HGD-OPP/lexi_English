import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import {
  wordbookSeed,
  type SeedWord,
} from "../src/lib/wordbook-data";

const prisma = new PrismaClient();
const MIN_SEED_WORDS = 100;

function assertSeedWord(bookSlug: string, word: SeedWord) {
  const missing = [
    !word.spelling.trim() && "spelling",
    !word.phonetic.trim() && "phonetic",
    !word.partOfSpeech.trim() && "partOfSpeech",
    !word.meaning.trim() && "meaning",
    !word.exampleEn.trim() && "exampleEn",
    !word.exampleZh.trim() && "exampleZh",
    !word.memoryHint.trim() && "memoryHint",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Seed word ${bookSlug}/${word.spelling || "<unknown>"} is missing: ${missing.join(", ")}`,
    );
  }
}

async function main() {
  const totalSeedWords = wordbookSeed.reduce(
    (total, book) => total + book.words.length,
    0,
  );
  if (totalSeedWords < MIN_SEED_WORDS) {
    throw new Error(
      `Expected at least ${MIN_SEED_WORDS} seed words, found ${totalSeedWords}.`,
    );
  }

  const posCounts = new Map<string, number>();
  console.log(
    `Seeding ${wordbookSeed.length} word books · ${totalSeedWords} words…`,
  );

  for (const [bookIndex, book] of wordbookSeed.entries()) {
    const savedBook = await prisma.wordBook.upsert({
      where: { slug: book.slug },
      update: {
        title: book.title,
        subtitle: book.subtitle,
        description: book.description,
        level: book.level,
        accent: book.accent,
        emoji: book.emoji,
        sortOrder: bookIndex,
      },
      create: {
        slug: book.slug,
        title: book.title,
        subtitle: book.subtitle,
        description: book.description,
        level: book.level,
        accent: book.accent,
        emoji: book.emoji,
        sortOrder: bookIndex,
      },
    });

    for (const word of book.words) {
      assertSeedWord(book.slug, word);
      const partOfSpeech = word.partOfSpeech.trim();
      posCounts.set(partOfSpeech, (posCounts.get(partOfSpeech) ?? 0) + 1);

      await prisma.word.upsert({
        where: {
          wordBookId_spelling: {
            wordBookId: savedBook.id,
            spelling: word.spelling,
          },
        },
        update: {
          phonetic: word.phonetic,
          partOfSpeech,
          meaning: word.meaning,
          exampleEn: word.exampleEn,
          exampleZh: word.exampleZh,
          memoryHint: word.memoryHint,
        },
        create: {
          wordBookId: savedBook.id,
          spelling: word.spelling,
          phonetic: word.phonetic,
          partOfSpeech,
          meaning: word.meaning,
          exampleEn: word.exampleEn,
          exampleZh: word.exampleZh,
          memoryHint: word.memoryHint,
        },
      });
    }

    console.log(`  ✓ ${book.title} (${book.words.length} words)`);
  }

  const [bookCount, wordCount] = await Promise.all([
    prisma.wordBook.count(),
    prisma.word.count(),
  ]);
  const posSummary = [...posCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([pos, count]) => `${pos} ${count}`)
    .join(" · ");

  console.log(`Done. ${bookCount} books, ${wordCount} words in the database.`);
  console.log(`Part of speech (seed): ${posSummary}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
