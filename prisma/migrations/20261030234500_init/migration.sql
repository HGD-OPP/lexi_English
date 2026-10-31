-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_books" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "accent" TEXT NOT NULL DEFAULT '#dff3c8',
    "emoji" TEXT NOT NULL DEFAULT '📘',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "word_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "words" (
    "id" TEXT NOT NULL,
    "spelling" TEXT NOT NULL,
    "phonetic" TEXT NOT NULL,
    "part_of_speech" TEXT,
    "meaning" TEXT NOT NULL,
    "example_en" TEXT,
    "example_zh" TEXT,
    "memory_hint" TEXT,
    "word_book_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_words" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "word_id" TEXT NOT NULL,
    "mastery" INTEGER NOT NULL DEFAULT 0,
    "next_review_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "is_bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "last_rating" TEXT,
    "last_reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_words_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "word_books_slug_key" ON "word_books"("slug");

-- CreateIndex
CREATE INDEX "words_word_book_id_idx" ON "words"("word_book_id");

-- CreateIndex
CREATE UNIQUE INDEX "words_word_book_id_spelling_key" ON "words"("word_book_id", "spelling");

-- CreateIndex
CREATE INDEX "user_words_user_id_next_review_at_idx" ON "user_words"("user_id", "next_review_at");

-- CreateIndex
CREATE INDEX "user_words_user_id_is_bookmarked_idx" ON "user_words"("user_id", "is_bookmarked");

-- CreateIndex
CREATE UNIQUE INDEX "user_words_user_id_word_id_key" ON "user_words"("user_id", "word_id");

-- AddForeignKey
ALTER TABLE "words" ADD CONSTRAINT "words_word_book_id_fkey" FOREIGN KEY ("word_book_id") REFERENCES "word_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_words" ADD CONSTRAINT "user_words_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_words" ADD CONSTRAINT "user_words_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Security: the browser talks to Supabase Auth only; it never queries these
-- tables directly. RLS with no anon policies blocks PostgREST access, while
-- Prisma's server-side Postgres role (the table owner) still works normally.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "word_books" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "words" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_words" ENABLE ROW LEVEL SECURITY;
