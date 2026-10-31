import { ApiError } from "@/lib/api-error";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Viewer } from "@/lib/types";

/**
 * Reads the signed-in Supabase user. Returns null when auth is not configured
 * yet, which keeps the word catalogue browsable before credentials exist.
 */
export async function getViewer(): Promise<Viewer | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.email) {
      return null;
    }

    const metadataName = user.user_metadata?.full_name;
    return {
      id: user.id,
      email: user.email,
      name: typeof metadataName === "string" ? metadataName : null,
    };
  } catch (error) {
    console.error("[auth] Could not read the Supabase session", error);
    return null;
  }
}

/**
 * Auth guard for write endpoints. Supabase owns identity; our User row is a
 * lightweight mirror so UserWord can keep a foreign key.
 */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    throw new ApiError(
      401,
      "AUTH_REQUIRED",
      "请先登录后再保存学习记录。",
    );
  }

  if (!hasDatabaseUrl) {
    throw new ApiError(
      503,
      "DATABASE_NOT_CONFIGURED",
      "数据库尚未配置，请先在 .env 中填写 DATABASE_URL。",
    );
  }

  try {
    await prisma.user.upsert({
      where: { id: viewer.id },
      update: { email: viewer.email, name: viewer.name },
      create: {
        id: viewer.id,
        email: viewer.email,
        name: viewer.name,
      },
    });
  } catch (error) {
    console.error("[auth] Could not sync the Supabase user", error);
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "暂时无法连接数据库，学习记录没有保存。",
    );
  }

  return viewer;
}
