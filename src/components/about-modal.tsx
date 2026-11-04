"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function AboutModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm transition hover:text-ink"
      >
        关于我们
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            className="animate-fade-up relative w-full max-w-md rounded-[1.75rem] border border-line/70 bg-white p-7 shadow-[0_30px_80px_-20px_rgba(24,38,30,0.5)] sm:p-9"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="关闭关于弹窗"
              autoFocus
              className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-ink-faint transition hover:bg-paper hover:text-ink"
            >
              <X className="size-4" strokeWidth={1.8} />
            </button>

            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
              About
            </p>
            <h2
              id="about-title"
              className="mt-2 font-display text-3xl tracking-tight text-ink"
            >
              关于 lexi.
            </h2>
            <p className="mt-1.5 text-sm text-moss">把单词学成自己的。</p>

            <p className="mt-5 text-sm leading-7 text-ink-soft">
              一个轻量级背单词工具，结合 SRS 间隔重复算法与极简设计，帮助你高效专注地记忆单词。
            </p>

            <div className="mt-7 border-t border-line/60 pt-4 text-[11px] text-ink-faint">
              Made with <span className="text-rose">❤️</span> by haoxuanhuang
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
