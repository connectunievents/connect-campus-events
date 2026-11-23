"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";

/** Debounced search that updates ?q= in the URL. */
export function SearchBox({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [pending, start] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const p = new URLSearchParams(params.toString());
      if (value.trim()) p.set("q", value.trim());
      else p.delete("q");
      start(() => router.replace(`/explore${p.size ? `?${p}` : ""}`, { scroll: false }));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 focus-within:border-leaf focus-within:ring-4 focus-within:ring-leaf/15">
      {pending ? <Loader2 size={20} className="animate-spin text-leaf" /> : <Search size={20} className="text-leaf" />}
      <input
        autoFocus={!defaultValue}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="LAU, AUB, hackathon, concert…"
        className="flex-1 bg-transparent outline-none placeholder:text-muted/70"
        enterKeyHint="search"
        aria-label="Search"
      />
      {value && (
        <button type="button" onClick={() => setValue("")} aria-label="Clear" className="text-muted">
          <X size={18} />
        </button>
      )}
    </label>
  );
}
