import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import { wordbookSeed } from "../src/lib/wordbook-data";

const prisma = new PrismaClient();

async function main() {
  console.log(`Seeding ${wordbookSeed.length} word books…`);

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
      await prisma.word.upsert({
        where: {
          wordBookId_spelling: {
            wordBookId: savedBook.id,
            spelling: word.spelling,
          },
        },
        update: {
          phonetic: word.phonetic,
          partOfSpeech: word.partOfSpeech,
          meaning: word.meaning,
          exampleEn: word.exampleEn,
          exampleZh: word.exampleZh,
          memoryHint: word.memoryHint,
        },
        create: {
          wordBookId: savedBook.id,
          spelling: word.spelling,
          phonetic: word.phonetic,
          partOfSpeech: word.partOfSpeech,
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
  console.log(`Done. ${bookCount} books, ${wordCount} words in the database.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
