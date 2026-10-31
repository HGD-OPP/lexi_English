import { NextResponse } from "next/server";

import { ApiError, jsonError, readJson } from "@/lib/api-error";
import { requireViewer } from "@/lib/auth";
import { findWordById, findWordBySpelling } from "@/lib/data";
import type { MemoryHints, WordView } from "@/lib/types";

export const maxDuration = 30;

const MODEL = "deepseek-v4.1-flash";
const ENDPOINT = "https://api.deepseek.com/chat/completions";
const CACHE_LIMIT = 200;

const memoryCache = new Map<
  string,
  { memory: MemoryHints; model: string }
>();

function isMemoryHints(value: unknown): value is MemoryHints {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.association === "string" &&
    candidate.association.trim().length > 0 &&
    typeof candidate.root === "string" &&
    candidate.root.trim().length > 0 &&
    typeof candidate.mnemonic === "string" &&
    candidate.mnemonic.trim().length > 0
  );
}

function cleanHints(hints: MemoryHints): MemoryHints {
  const trim = (text: string) => text.trim().slice(0, 180);
  return {
    association: trim(hints.association),
    root: trim(hints.root),
    mnemonic: trim(hints.mnemonic),
  };
}

function fallbackHints(word: WordView): MemoryHints {
  const syllables = word.spelling
    .replace(/([aeiouy]+)/gi, "·$1")
    .replace(/^·/, "");
  const shortMeaning = word.meaning.split(/[；;]/)[0]?.trim() || word.meaning;

  return {
    association:
      word.memoryHint?.trim() ||
      `把 ${word.spelling} 放进一个具体画面：谁在什么地方，因为什么说出了这个词。画面越夸张，越容易想起来。`,
    root: `先按音节拆开读：${syllables}。读准节奏后，再把拼写和“${shortMeaning}”绑定，长单词会立刻短一截。`,
    mnemonic: `谐音联想：把 ${word.spelling} 快速读三遍，挑一个最像的中文声音，编成和“${shortMeaning}”有关的一句话。`,
  };
}

function parseModelJson(content: string): MemoryHints | null {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    const parsed: unknown = JSON.parse(cleaned);
    return isMemoryHints(parsed) ? cleanHints(parsed) : null;
  } catch {
    return null;
  }
}

async function callDeepSeek(word: WordView): Promise<MemoryHints> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.8,
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是一位擅长把英语单词讲得过目不忘的记忆教练。只输出合法 JSON，不要 Markdown，不要额外解释。JSON 必须恰好包含 association、root、mnemonic 三个中文字段，每个字段 40-100 字，口语化、具体、不编造错误词源。",
        },
        {
          role: "user",
          content: [
            `单词：${word.spelling}`,
            `音标：${word.phonetic}`,
            `词性：${word.partOfSpeech ?? "—"}`,
            `释义：${word.meaning}`,
            `例句：${word.exampleEn ?? "—"}`,
            "",
            "请生成三种风格的记忆提示：",
            "association：联想记忆法，构造一个具体、略带夸张的场景。",
            "root：词根/词缀或音节拆解，帮助记住拼写和含义；不确定词源时只做音节拆解。",
            "mnemonic：谐音记忆法，给出自然、不低俗的中文谐音和一句串联。",
          ].join("\n"),
        },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `DeepSeek responded ${response.status}: ${detail.slice(0, 300)}`,
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek returned an empty completion");
  }

  const hints = parseModelJson(content);
  if (!hints) {
    throw new Error("DeepSeek returned malformed memory JSON");
  }

  return hints;
}

export async function POST(request: Request) {
  try {
    // Memory generation costs money, so it is only available to signed-in
    // learners. The key itself never leaves this server route.
    await requireViewer();

    const body = await readJson<{
      wordId?: unknown;
      spelling?: unknown;
    }>(request);

    let word: WordView | null = null;
    if (typeof body.wordId === "string" && body.wordId.trim()) {
      word = await findWordById(body.wordId);
    } else if (typeof body.spelling === "string" && body.spelling.trim()) {
      word = await findWordBySpelling(body.spelling);
    }

    if (!word) {
      throw new ApiError(404, "WORD_NOT_FOUND", "没有找到这个单词。");
    }

    const cached = memoryCache.get(word.id);
    if (cached) {
      return NextResponse.json({
        memory: cached.memory,
        source: "ai",
        model: cached.model,
        cached: true,
      });
    }

    if (!process.env.DEEPSEEK_API_KEY?.trim()) {
      return NextResponse.json({
        memory: fallbackHints(word),
        source: "preview",
      });
    }

    try {
      const memory = await callDeepSeek(word);
      memoryCache.set(word.id, { memory, model: MODEL });
      if (memoryCache.size > CACHE_LIMIT) {
        const oldestKey = memoryCache.keys().next().value;
        if (oldestKey) {
          memoryCache.delete(oldestKey);
        }
      }

      return NextResponse.json({
        memory,
        source: "ai",
        model: MODEL,
        cached: false,
      });
    } catch (error) {
      console.error("[memory] DeepSeek call failed", error);
      return NextResponse.json({
        memory: fallbackHints(word),
        source: "fallback",
      });
    }
  } catch (error) {
    return jsonError(error);
  }
}
