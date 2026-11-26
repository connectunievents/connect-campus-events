"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Check, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/format";
import type { ListingPlan } from "@/lib/types";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (s: string, n: number) => {
  const d = new Date(`${s}T12:00:00`);
  d.setDate(d.getDate() + n);
  return ymd(d);
};

/** Pick a listing package; the price shown is quoted by the database (the same function the order uses). */
export function PackagePicker({ plans, renewUntil, demo }: { plans: ListingPlan[]; renewUntil: string | null; demo: boolean }) {
  const router = useRouter();
  const today = ymd(new Date());
  // Renewal: the purchase is added after the current listing ends, so no start date to pick.
  const renewing = Boolean(renewUntil);
  const [plan, setPlan] = useState<ListingPlan["id"]>(plans.find((p) => p.id === "month")?.id ?? plans[0]?.id ?? "week");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(addDays(today, 13));
  const [renewDays, setRenewDays] = useState(14);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep the custom end date in sync with the chosen day count
    if (renewing) setEnd(addDays(today, Math.min(365, Math.max(3, renewDays)) - 1));
  }, [renewing, renewDays, today]);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const [quote, setQuote] = useState<{ days: number; amount_cents: number; currency: string; ends_at: string } | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [buying, setBuying] = useState(false);
  const current = useMemo(() => plans.find((p) => p.id === plan), [plans, plan]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoadingQuote(true);
      const { data, error } = await createClient().rpc("quote_listing", { p_plan: plan, p_start: start, p_end: plan === "custom" ? end : null });
      if (cancelled) return;
      setLoadingQuote(false);
      if (error) {
        setQuote(null);
        setQuoteError(error.message);
      } else {
        setQuoteError(null);
        setQuote((Array.isArray(data) ? data[0] : data) ?? null);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [plan, start, end]);

  async function buy() {
    setBuying(true);
    try {
      const res = await fetch("/api/sponsor-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, start, end: plan === "custom" ? end : undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Payment could not start");
      if (String(body.url).startsWith("http")) window.location.assign(body.url);
      else router.push(body.url);
    } catch (e) {
      toast.error((e as Error).message);
      setBuying(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const on = p.id === plan;
          const perDay = p.days ? Math.round(p.price_cents / p.days) : p.price_cents;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              aria-pressed={on}
              className={`relative rounded-[1.4rem] border p-4 text-left transition ${on ? "border-leaf bg-leaf/10" : "border-line card-glass hover:border-white/20"}`}
            >
              {on && <Check size={18} className="absolute right-3 top-3 text-leaf" />}
              <div className="font-bold">{p.name}</div>
              <div className="mt-1 text-2xl font-extrabold">
                {p.days ? money(p.price_cents, p.currency) : `${money(p.price_cents, p.currency)}`}
                {!p.days && <span className="text-sm font-semibold text-muted"> / day</span>}
              </div>
              <div className="mt-1 text-xs text-muted">
                {p.days ? `${p.days} days · ${money(perDay, p.currency)}/day` : "Pick your dates · 15% off 30+ days, 25% off 90+"}
              </div>
            </button>
          );
        })}
      </div>

      {renewing ? (
        <div className="card-glass space-y-3 rounded-[var(--radius-card)] border border-line p-5">
          {current?.id === "custom" && (
            <div className="max-w-xs">
              <label className="label" htmlFor="renew-days">Number of days (3–365)</label>
              <input id="renew-days" type="number" inputMode="numeric" min={3} max={365} className="field" value={renewDays} onChange={(e) => setRenewDays(Number(e.target.value) || 3)} />
            </div>
          )}
          <p className="flex items-start gap-2 text-sm">
            <CalendarRange size={16} className="mt-0.5 shrink-0 text-leaf" />
            <span>
              Listed until <b>{fmt(new Date(renewUntil!))}</b>
              {quote && (
                <>
                  {" "}→ adds {quote.days} days → new end <b className="text-leaf">{fmt(new Date(new Date(renewUntil!).getTime() + quote.days * 86400_000))}</b>
                </>
              )}
            </span>
          </p>
          <p className="text-xs text-muted">Renewals are added on after your current listing ends, so you never lose days.</p>
        </div>
      ) : (
        <div className="card-glass grid gap-4 rounded-[var(--radius-card)] border border-line p-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="start">Listing starts</label>
            <input id="start" type="date" className="field" value={start} min={today} onChange={(e) => setStart(e.target.value)} />
          </div>
          {current?.id === "custom" ? (
            <div>
              <label className="label" htmlFor="end">Listing ends</label>
              <input id="end" type="date" className="field" value={end} min={addDays(start, 2)} onChange={(e) => setEnd(e.target.value)} />
            </div>
          ) : (
            <div className="flex items-end">
              <p className="flex items-center gap-2 text-sm text-muted">
                <CalendarRange size={16} className="text-leaf" />
                {quote ? `Ends ${fmt(new Date(quote.ends_at))}` : "—"}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="glass flex items-center justify-between gap-3 rounded-[1.75rem] border p-3 pl-5">
        <div>
          <div className="text-xs text-muted">{quote ? `${quote.days} days` : "Total"}</div>
          <div className="text-xl font-extrabold">
            {loadingQuote ? <Loader2 size={18} className="animate-spin" /> : quote ? money(quote.amount_cents, quote.currency) : "—"}
          </div>
        </div>
        <button
          onClick={buy}
          disabled={!quote || buying || loadingQuote}
          className="flex min-h-12 items-center gap-2 rounded-[1.25rem] bg-leaf px-6 font-bold text-ink shadow-[0_8px_24px_-8px_rgb(82_212_131/0.55)] active:scale-[0.97] disabled:opacity-50"
        >
          {buying && <Loader2 size={18} className="animate-spin" />} {renewing ? "Renew listing" : "Pay & go live"}
        </button>
      </div>
      {quoteError && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{quoteError}</p>}
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
        <ShieldCheck size={14} /> Prices are calculated on our server.{demo ? " Demo mode: no real money is charged." : " Secure payment by Stripe."}
      </p>
    </div>
  );
}
