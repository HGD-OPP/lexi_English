import { NextResponse } from "next/server";

import { ApiError, jsonError, readJson } from "@/lib/api-error";
import { requireViewer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyReview } from "@/lib/sm2";
import { advanceStudyStreak, STREAK_GOAL, studyDayRange } from "@/lib/study-streak";
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
    const rating = body.rating;

    const word = await prisma.word.findUnique({
      where: { id: body.wordId },
      select: { id: true },
    });
    if (!word) {
      throw new ApiError(404, "WORD_NOT_FOUND", "这个单词不存在。");
    }

    const now = new Date();
    const todayRange = studyDayRange(now);

    const result = await prisma.$transaction(async (tx) => {
      // Serialize streak updates for one user so two fast submissions cannot
      // both read yesterday's date and increment twice.
      const lockedUser = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "users" WHERE "id" = ${viewer.id}::uuid FOR UPDATE
      `;
      if (lockedUser.length === 0) {
        throw new ApiError(500, "USER_NOT_FOUND", "用户资料尚未初始化。");
      }

      const existing = await tx.userWord.findUnique({
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
        rating,
        now,
      );

      const saved = await tx.userWord.upsert({
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
          lastReviewedAt: now,
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
          lastReviewedAt: now,
        },
      });

      const todayStudied = await tx.userWord.count({
        where: {
          userId: viewer.id,
          lastReviewedAt: {
            gte: todayRange.start,
            lt: todayRange.end,
          },
        },
      });

      const currentUser = await tx.user.findUnique({
        where: { id: viewer.id },
        select: { studyStreak: true, lastStudyDate: true },
      });
      if (!currentUser) {
        throw new ApiError(500, "USER_NOT_FOUND", "用户资料尚未初始化。");
      }

      // A check-in is earned only after 20 distinct words have been studied
      // today. The User row is already locked above, so concurrent reviews
      // cannot both increment the streak.
      let studyStreak = currentUser.studyStreak;
      if (todayStudied >= STREAK_GOAL) {
        const streak = advanceStudyStreak(currentUser, now);
        if (streak.changed) {
          await tx.user.update({
            where: { id: viewer.id },
            data: {
              studyStreak: streak.studyStreak,
              lastStudyDate: streak.lastStudyDate,
            },
          });
        }
        studyStreak = streak.studyStreak;
      }

      return {
        saved,
        studyStreak,
        todayStudied,
        rating: outcome.lastRating,
      };
    });

    const userWord: UserWordSnapshot = {
      mastery: result.saved.mastery,
      isBookmarked: result.saved.isBookmarked,
      interval: result.saved.interval,
      repetitions: result.saved.repetitions,
      easeFactor: result.saved.easeFactor,
      nextReviewAt: result.saved.nextReviewAt.toISOString(),
      lastRating: result.saved.lastRating,
    };

    return NextResponse.json({
      userWord,
      rating: result.rating,
      studyStreak: result.studyStreak,
      studyDay: todayRange.day,
      todayStudied: result.todayStudied,
      streakGoal: STREAK_GOAL,
      streakRemaining: Math.max(0, STREAK_GOAL - result.todayStudied),
      checkedInToday: result.todayStudied >= STREAK_GOAL,
    });
  } catch (error) {
    return jsonError(error);
  }
}
