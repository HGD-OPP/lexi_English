import { NextResponse } from "next/server";

import { ApiError, jsonError, readJson } from "@/lib/api-error";
import { requireViewer } from "@/lib/auth";
import { getBookmarks } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const viewer = await requireViewer();
    const result = await getBookmarks(viewer);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = await readJson<{
      wordId?: unknown;
      bookmarked?: unknown;
    }>(request);

    if (typeof body.wordId !== "string" || !body.wordId.trim()) {
      throw new ApiError(400, "INVALID_WORD", "缺少有效的 wordId。");
    }

    const bookmarked =
      typeof body.bookmarked === "boolean" ? body.bookmarked : true;

    const word = await prisma.word.findUnique({
      where: { id: body.wordId },
      select: { id: true },
    });
    if (!word) {
      throw new ApiError(404, "WORD_NOT_FOUND", "这个单词不存在。");
    }

    const saved = await prisma.userWord.upsert({
      where: {
        userId_wordId: { userId: viewer.id, wordId: word.id },
      },
      update: { isBookmarked: bookmarked },
      create: {
        userId: viewer.id,
        wordId: word.id,
        isBookmarked: bookmarked,
      },
    });

    return NextResponse.json({ bookmarked: saved.isBookmarked });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const viewer = await requireViewer();
    const wordId = new URL(request.url).searchParams.get("wordId");

    if (!wordId) {
      throw new ApiError(400, "INVALID_WORD", "缺少有效的 wordId。");
    }

    await prisma.userWord.updateMany({
      where: { userId: viewer.id, wordId },
      data: { isBookmarked: false },
    });

    return NextResponse.json({ bookmarked: false });
  } catch (error) {
    return jsonError(error);
  }
}
