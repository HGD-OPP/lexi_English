import type { ReviewRating } from "@/lib/types";

export type ReviewState = {
  easeFactor: number;
  interval: number;
  repetitions: number;
  mastery: number;
};

export type ReviewOutcome = ReviewState & {
  nextReviewAt: Date;
  lastRating: ReviewRating;
};

const MIN_EASE = 1.3;
const MAX_EASE = 3;
const MAX_MASTERY = 5;

function clampEase(value: number) {
  return Math.min(MAX_EASE, Math.max(MIN_EASE, Number(value.toFixed(2))));
}

function clampMastery(value: number) {
  return Math.min(MAX_MASTERY, Math.max(0, Math.round(value)));
}

/**
 * A deliberately small SM-2 variant, matching the product rules:
 * known doubles the interval, fuzzy keeps it, unknown resets to one day.
 */
export function applyReview(
  current: ReviewState,
  rating: ReviewRating,
  now = new Date(),
): ReviewOutcome {
  const easeFactor = clampEase(
    rating === "known"
      ? current.easeFactor + 0.1
      : rating === "fuzzy"
        ? current.easeFactor - 0.05
        : current.easeFactor - 0.2,
  );

  let interval: number;
  let repetitions: number;
  let mastery: number;

  if (rating === "known") {
    interval = Math.max(2, Math.round(Math.max(1, current.interval) * 2));
    repetitions = current.repetitions + 1;
    mastery = clampMastery(current.mastery + 1);
  } else if (rating === "fuzzy") {
    interval = Math.max(1, current.interval);
    repetitions = current.repetitions;
    mastery = current.mastery;
  } else {
    interval = 1;
    repetitions = 0;
    mastery = 0;
  }

  const nextReviewAt = new Date(now);
  nextReviewAt.setUTCDate(nextReviewAt.getUTCDate() + interval);

  return {
    easeFactor,
    interval,
    repetitions,
    mastery,
    nextReviewAt,
    lastRating: rating,
  };
}
