export default function BookDetailLoading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8"
      role="status"
      aria-busy="true"
      aria-label="正在加载词书"
    >
      <span className="sr-only">正在加载词书和单词列表…</span>

      <div className="animate-pulse">
        <div className="h-3.5 w-20 rounded-full bg-stone-300/80" />

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <div className="rounded-[2rem] border border-line/70 bg-cream/65 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="size-14 rounded-2xl bg-stone-300/75" />
              <div className="h-6 w-20 rounded-full bg-stone-300/65" />
            </div>

            <div className="mt-7 h-10 w-52 max-w-full rounded-xl bg-stone-300/80 sm:h-12" />
            <div className="mt-3 h-5 w-40 max-w-full rounded-lg bg-stone-200" />

            <div className="mt-5 space-y-2.5">
              <div className="h-3.5 w-full rounded-full bg-stone-200" />
              <div className="h-3.5 w-11/12 rounded-full bg-stone-200" />
              <div className="h-3.5 w-2/3 rounded-full bg-stone-200" />
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {[64, 76, 62, 70].map((width) => (
                <div
                  key={width}
                  className="h-4 rounded-full bg-stone-300/70"
                  style={{ width }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-ink/90 p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded-full bg-paper/15" />
              <div className="size-4 rounded bg-paper/15" />
            </div>
            <div className="mt-7 h-16 w-32 rounded-xl bg-paper/15" />
            <div className="mt-3 h-3.5 w-36 rounded-full bg-paper/10" />
            <div className="mt-7 h-1.5 w-full rounded-full bg-paper/10" />

            <div className="mt-7 grid grid-cols-2 gap-3 border-t border-paper/10 pt-5">
              <div>
                <div className="h-7 w-12 rounded-lg bg-paper/15" />
                <div className="mt-2 h-2.5 w-14 rounded-full bg-paper/10" />
              </div>
              <div>
                <div className="h-7 w-12 rounded-lg bg-paper/15" />
                <div className="mt-2 h-2.5 w-20 rounded-full bg-paper/10" />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-10 flex items-end justify-between gap-4">
          <div>
            <div className="h-3 w-20 rounded-full bg-stone-300/70" />
            <div className="mt-2 h-8 w-36 rounded-lg bg-stone-300/80" />
          </div>
          <div className="hidden h-3 w-40 rounded-full bg-stone-200 sm:block" />
        </div>

        <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-line/80 bg-cream/70 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-3 border-b border-line/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex gap-2">
              {[52, 52, 68].map((width, index) => (
                <div
                  key={`${width}-${index}`}
                  className="h-9 rounded-full bg-stone-300/65"
                  style={{ width }}
                />
              ))}
            </div>
            <div className="h-9 w-full rounded-full bg-stone-200 sm:w-44" />
          </div>

          <div className="divide-y divide-line/60">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 px-4 py-4 sm:gap-5 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="h-5 w-28 rounded-md bg-stone-300/80 sm:w-36" />
                    <div className="h-3 w-16 rounded-full bg-stone-200" />
                  </div>
                  <div className="mt-2 h-3.5 w-3/5 rounded-full bg-stone-200" />
                </div>
                <div className="hidden h-5 w-16 rounded-full bg-stone-200 sm:block" />
                <div className="size-8 rounded-full bg-stone-200/80" />
              </div>
            ))}
          </div>

          <div className="border-t border-line/60 px-4 py-3 sm:px-6">
            <div className="h-3 w-36 rounded-full bg-stone-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
