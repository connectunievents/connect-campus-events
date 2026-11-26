/** Shown instantly while a page's data loads, so taps feel immediate instead of frozen. */
export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Loading" className="px-4">
      <div className="pt-safe pb-4">
        <div className="skeleton h-8 w-40 rounded-xl" />
        <div className="skeleton mt-3 h-4 w-64 max-w-full rounded-lg" />
      </div>
      <div className="skeleton h-12 w-full rounded-2xl" />
      <div className="no-scrollbar mt-6 flex gap-3 overflow-hidden">
        {[0, 1].map((i) => (
          <div key={i} className="skeleton aspect-[4/5] w-[78vw] max-w-[300px] shrink-0 rounded-[var(--radius-card)]" />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton h-20 w-20 shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-24 rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-3 w-32 rounded" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
