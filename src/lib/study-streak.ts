/**
 * Study-day helpers.
 *
 * A "study day" is a calendar day in Asia/Shanghai. `lastStudyDate` is stored
 * as a Postgres DATE, which Prisma exposes as a Date at 00:00 UTC; formatting
 * that value in Asia/Shanghai still yields the same calendar date.
 */

export const STUDY_TIME_ZONE = "Asia/Shanghai";

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: STUDY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export type StudyStreakState = {
  studyStreak: number;
  lastStudyDate: Date | null;
};

export type StudyStreakOutcome = {
  studyStreak: number;
  lastStudyDate: Date;
  changed: boolean;
  studyDay: string;
};

/** Return the Asia/Shanghai calendar date as YYYY-MM-DD. */
export function studyDayKey(date: Date): string {
  const parts = dayFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Could not format study day.");
  }

  return `${year}-${month}-${day}`;
}

/** Convert a YYYY-MM-DD study day to the UTC-midnight Date used by @db.Date. */
export function studyDayToDate(studyDay: string): Date {
  return new Date(`${studyDay}T00:00:00.000Z`);
}

/** Move a study-day key by a number of calendar days. */
export function shiftStudyDay(studyDay: string, days: number): string {
  const date = studyDayToDate(studyDay);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Apply one completed review to a user's streak:
 * - first study day -> 1
 * - already studied today -> unchanged
 * - studied yesterday -> +1
 * - missed one or more days -> reset to 1
 */
export function advanceStudyStreak(
  state: StudyStreakState,
  now = new Date(),
): StudyStreakOutcome {
  const studyDay = studyDayKey(now);
  const lastStudyDay = state.lastStudyDate
    ? studyDayKey(state.lastStudyDate)
    : null;
  const safeCurrent = Math.max(0, Math.round(state.studyStreak));

  if (lastStudyDay === studyDay) {
    return {
      studyStreak: safeCurrent,
      lastStudyDate: state.lastStudyDate ?? studyDayToDate(studyDay),
      changed: false,
      studyDay,
    };
  }

  const yesterday = shiftStudyDay(studyDay, -1);
  const nextStreak = lastStudyDay === yesterday ? safeCurrent + 1 : 1;

  return {
    studyStreak: nextStreak,
    lastStudyDate: studyDayToDate(studyDay),
    changed: true,
    studyDay,
  };
}
