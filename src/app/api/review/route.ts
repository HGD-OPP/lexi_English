import { NextResponse } from "next/server";

import { ApiError, jsonError, readJson } from "@/lib/api-error";
import { requireViewer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyReview } from "@/lib/sm2";
import type { ReviewRating, UserWordSnapshot } from "@/lib/types";

const RATINGS: ReviewRating[] = ["known", "fuzzy", "unknown"];

function isRating(value: unknown): value is ReviewRating {
  return typeof value === "string" && RATINGS.includes(value as ReviewRating);
}

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = await readJson<{ wordId?: unknown; rating?: unknown }>(
      request,
    );

    if (typeof body.wordId !== "string" || !body.wordId.trim()) {
      throw new ApiError(400, "INVALID_WORD", "缺少有效的 wordId。");
    }
    if (!isRating(body.rating)) {
      throw new ApiError(
        400,
        "INVALID_RATING",
        "rating 必须是 known、fuzzy 或 unknown。",
      );
    }

    const word = await prisma.word.findUnique({
      where: { id: body.wordId },
      select: { id: true },
    });
    if (!word) {
      throw new ApiError(404, "WORD_NOT_FOUND", "这个单词不存在。");
    }

    const existing = await prisma.userWord.findUnique({
      where: {
        userId_wordId: { userId: viewer.id, wordId: word.id },
      },
    });

    const outcome = applyReview(
      {
        easeFactor: existing?.easeFactor ?? 2.5,
        interval: existing?.interval ?? 1,
        repetitions: existing?.repetitions ?? 0,
        mastery: existing?.mastery ?? 0,
      },
      body.rating,
    );

    const saved = await prisma.userWord.upsert({
      where: {
        userId_wordId: { userId: viewer.id, wordId: word.id },
      },
      update: {
        easeFactor: outcome.easeFactor,
        interval: outcome.interval,
        repetitions: outcome.repetitions,
        mastery: outcome.mastery,
        nextReviewAt: outcome.nextReviewAt,
        lastRating: outcome.lastRating,
        lastReviewedAt: new Date(),
      },
      create: {
        userId: viewer.id,
        wordId: word.id,
        easeFactor: outcome.easeFactor,
        interval: outcome.interval,
        repetitions: outcome.repetitions,
        mastery: outcome.mastery,
        nextReviewAt: outcome.nextReviewAt,
        lastRating: outcome.lastRating,
        lastReviewedAt: new Date(),
      },
    });

    const userWord: UserWordSnapshot = {
      mastery: saved.mastery,
      isBookmarked: saved.isBookmarked,
      interval: saved.interval,
      repetitions: saved.repetitions,
      easeFactor: saved.easeFactor,
      nextReviewAt: saved.nextReviewAt.toISOString(),
      lastRating: saved.lastRating,
    };

    return NextResponse.json({ userWord, rating: outcome.lastRating });
  } catch (error) {
    return jsonError(error);
  }
}
