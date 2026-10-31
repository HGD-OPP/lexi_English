import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api-error";
import { getViewer } from "@/lib/auth";
import { getWords } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookSlug = searchParams.get("book") ?? undefined;
    const randomParam = searchParams.get("random");
    const random =
      randomParam === "1" ||
      randomParam === "true" ||
      randomParam === "yes";
    const limitParam = Number(searchParams.get("limit") ?? "20");
    const limit = Number.isFinite(limitParam) ? limitParam : 20;
    const viewer = await getViewer();

    const result = await getWords({
      bookSlug,
      random,
      limit,
      viewer,
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
