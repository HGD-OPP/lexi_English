"use client";

import {
  ArrowRight,
  CircleCheck,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "login" | "register";

function friendlyAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) {
    return "邮箱或密码不正确，请再试一次。";
  }
  if (/email not confirmed/i.test(message)) {
    return "邮箱还没有确认，请先打开注册邮件里的确认链接。";
  }
  if (/user already registered/i.test(message)) {
    return "这个邮箱已经注册过了，直接登录即可。";
  }
  if (/password should be at least/i.test(message)) {
    return "密码至少需要 6 个字符。";
  }
  if (/rate limit|too many/i.test(message)) {
    return "尝试次数有点多，请稍等一分钟再试。";
  }
  return message;
}

export function AuthForm({ next = "/" }: { next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setInfo(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("请填写邮箱和密码。");
      return;
    }
    if (password.length < 6) {
      setError("密码至少需要 6 个字符。");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }
    if (!isSupabaseConfigured) {
      setError(
        "认证服务还没有配置。请在 .env 中填写 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。",
      );
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) {
          throw signInError;
        }
        router.replace(next);
        router.refresh();
        return;
      }

      const callback = new URL("/auth/callback", window.location.origin);
      if (next !== "/") {
        callback.searchParams.set("next", next);
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: callback.toString(),
          data: {
            full_name: name.trim() || null,
          },
        },
      });
      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        router.replace(next);
        router.refresh();
        return;
      }

      setInfo(
        `确认邮件已发送到 ${normalizedEmail}。打开邮件里的链接后即可登录。`,
      );
      setPassword("");
      setConfirmPassword("");
      setMode("login");
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "操作失败，请稍后再试。";
      setError(friendlyAuthError(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-paper-deep p-1">
        <button
          type="button"
          onClick={() => switchMode("login")}
          aria-pressed={mode === "login"}
          className={`h-8 rounded-full text-xs transition ${
            mode === "login"
              ? "bg-cream text-ink shadow-sm"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          登录
        </button>
        <button
          type="button"
          onClick={() => switchMode("register")}
          aria-pressed={mode === "register"}
          className={`h-8 rounded-full text-xs transition ${
            mode === "register"
              ? "bg-cream text-ink shadow-sm"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          注册
        </button>
      </div>

      <div className="mt-7">
        <h1 className="font-display text-3xl tracking-tight">
          {mode === "login" ? "欢迎回来" : "建立你的词汇花园"}
        </h1>
        <p className="mt-1.5 text-xs leading-6 text-ink-soft">
          {mode === "login"
            ? "登录后，学习进度和生词本会同步到你的账号。"
            : "用邮箱注册，学习记录会安全地保存在 Supabase。"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "register" ? (
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] text-ink-soft">
              <User className="size-3.5" strokeWidth={1.7} />
              昵称（可选）
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              maxLength={40}
              placeholder="怎么称呼你？"
              className="h-11 w-full rounded-xl border border-line bg-paper/50 px-3.5 text-sm outline-none transition placeholder:text-ink-faint/60 focus:border-moss/40 focus:bg-cream"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] text-ink-soft">
            <Mail className="size-3.5" strokeWidth={1.7} />
            邮箱
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="h-11 w-full rounded-xl border border-line bg-paper/50 px-3.5 text-sm outline-none transition placeholder:text-ink-faint/60 focus:border-moss/40 focus:bg-cream"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] text-ink-soft">
            <LockKeyhole className="size-3.5" strokeWidth={1.7} />
            密码
          </span>
          <span className="relative block">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              placeholder="至少 6 个字符"
              className="h-11 w-full rounded-xl border border-line bg-paper/50 px-3.5 pr-11 text-sm outline-none transition placeholder:text-ink-faint/60 focus:border-moss/40 focus:bg-cream"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
              className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-faint transition hover:bg-ink/5 hover:text-ink"
            >
              {showPassword ? (
                <EyeOff className="size-4" strokeWidth={1.7} />
              ) : (
                <Eye className="size-4" strokeWidth={1.7} />
              )}
            </button>
          </span>
        </label>

        {mode === "register" ? (
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] text-ink-soft">
              <LockKeyhole className="size-3.5" strokeWidth={1.7} />
              确认密码
            </span>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="再输入一次"
              className="h-11 w-full rounded-xl border border-line bg-paper/50 px-3.5 text-sm outline-none transition placeholder:text-ink-faint/60 focus:border-moss/40 focus:bg-cream"
            />
          </label>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-[#c97363]/30 bg-rose/30 px-3 py-2.5 text-xs leading-5 text-[#8b4036]">
            {error}
          </p>
        ) : null}

        {info ? (
          <p className="flex gap-2 rounded-xl border border-moss/20 bg-lime/30 px-3 py-2.5 text-xs leading-5 text-moss-deep">
            <CircleCheck className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
            {info}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink text-sm font-medium text-paper transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              请稍候…
            </>
          ) : mode === "login" ? (
            <>
              登录
              <ArrowRight className="size-4" strokeWidth={1.8} />
            </>
          ) : (
            <>
              创建账号
              <ArrowRight className="size-4" strokeWidth={1.8} />
            </>
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-[10px] leading-5 text-ink-faint">
        {mode === "register"
          ? "注册即表示你同意仅将本站用于个人学习。若开启了邮箱确认，需要先验证邮箱。"
          : "还没有账号？切换到「注册」，一分钟就能开始。"}
      </p>
    </div>
  );
}
