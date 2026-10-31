"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      startTransition(() => {
        router.refresh();
        router.push("/login");
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading || pending}
      className="inline-flex size-9 items-center justify-center rounded-full border border-line/80 bg-cream/70 text-ink-soft transition hover:border-moss/30 hover:bg-cream hover:text-moss disabled:opacity-50"
      aria-label="退出登录"
      title="退出登录"
    >
      <LogOut className="size-4" strokeWidth={1.8} />
    </button>
  );
}
