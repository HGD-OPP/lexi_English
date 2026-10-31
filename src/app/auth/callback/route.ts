import { NextResponse } from "next/server";

import { sanitizeNextPath } from "@/lib/redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;
  const next = sanitizeNextPath(url.searchParams.get("next"));

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(`${origin}/login?error=config`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing-code`);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth] Code exchange failed", error.message);
      return NextResponse.redirect(`${origin}/login?error=exchange`);
    }
  } catch (error) {
    console.error("[auth] Callback failed", error);
    return NextResponse.redirect(`${origin}/login?error=callback`);
  }

  const destination = new URL(next, origin);
  destination.searchParams.set("confirmed", "1");
  return NextResponse.redirect(destination);
}
