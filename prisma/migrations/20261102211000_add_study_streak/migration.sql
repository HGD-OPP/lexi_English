-- AlterTable: track the user's consecutive study days.
-- last_study_date is stored as a DATE so timezone drift cannot change the day.
ALTER TABLE "users"
    ADD COLUMN "study_streak" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "last_study_date" DATE;
