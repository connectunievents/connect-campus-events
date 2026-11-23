"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, Minus, Plus, ShieldCheck, Lock, X } from "lucide-react";
import { toast } from "sonner";
import type { TicketType } from "@/lib/types";
import { money } from "@/lib/format";

export function TicketPicker({
  eventId,
  types,
  signedIn,
  disabled,
  disabledReason,
}: {
  eventId: string;
  types: TicketType[];
  signedIn: boolean;
  disabled: boolean;
  disabledReason: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(types.find((t) => t.quantity - t.sold > 0)?.id ?? null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  const type = types.find((t) => t.id === selected);
  const left = type ? type.quantity - type.sold : 0;
  const maxQty = type ? Math.min(type.max_per_order, left) : 1;
  const total = type ? type.price_cents * qty : 0;
  const allSoldOut = types.length > 0 && types.every((t) => t.quantity - t.sold <= 0);
  const minPrice = useMemo(() => (types.length ? Math.min(...types.map((t) => t.price_cents)) : 0), [types]);

  async function checkout() {
    if (!type) return;
    if (!signedIn) {
      router.push(`/login?next=/e/${eventId}`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketTypeId: type.id, quantity: qty }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong");
      if (body.url.startsWith("http")) window.location.assign(body.url);
      else router.push(body.url);
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  }

  if (types.length === 0) return null;

  return (
    <>
      {/* Sticky bar */}
      <div
        className="fixed inset-x-0 z-30 mx-auto max-w-md px-3 md:max-w-2xl"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.4rem)" }}
      >
        <div className="glass flex items-center justify-between gap-3 rounded-2xl border border-line p-3 pl-4 shadow-2xl shadow-black/50">
          <div>
            <div className="text-xs text-muted">{minPrice === 0 ? "Tickets" : "From"}</div>
            <div className="text-lg font-bold">{money(minPrice, types[0].currency)}</div>
          </div>
          <button
            disabled={disabled || allSoldOut}
            onClick={() => setOpen(true)}
            className="rounded-xl bg-leaf px-6 py-3 font-bold text-ink shadow-lg shadow-leaf/25 transition active:scale-95 disabled:bg-surface-2 disabled:text-muted disabled:shadow-none"
          >
            {disabled ? disabledReason : allSoldOut ? "Sold out" : "Get tickets"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !busy && setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-label="Choose tickets"
              className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88dvh] max-w-md overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 md:max-w-2xl"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => info.offset.y > 120 && !busy && setOpen(false)}
            >
              <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Choose tickets</h2>
                <button onClick={() => setOpen(false)} className="rounded-full p-1 text-muted" aria-label="Close">
                  <X />
                </button>
              </div>

              <div className="space-y-2">
                {types.map((t) => {
                  const l = t.quantity - t.sold;
                  const on = t.id === selected;
                  return (
                    <button
                      key={t.id}
                      disabled={l <= 0}
                      onClick={() => {
                        setSelected(t.id);
                        setQty(1);
                      }}
                      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                        on ? "border-leaf bg-leaf/10" : "border-line hover:border-muted"
                      } disabled:opacity-40`}
                    >
                      <div>
                        <div className="flex items-center gap-2 font-semibold">
                          {t.name}
                          {t.students_only && (
                            <span className="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                              <Lock size={10} /> Uni email
                            </span>
                          )}
                        </div>
                        {t.description && <div className="text-sm text-muted">{t.description}</div>}
                        <div className="mt-1 text-xs text-muted">
                          {l <= 0 ? "Sold out" : l <= 25 ? <span className="text-warn">Only {l} left</span> : `Max ${t.max_per_order} per person`}
                        </div>
                      </div>
                      <div className="text-lg font-bold">{money(t.price_cents, t.currency)}</div>
                    </button>
                  );
                })}
              </div>

              {type && (
                <div className="mt-5 flex items-center justify-between">
                  <span className="font-semibold">Quantity</span>
                  <div className="flex items-center gap-4 rounded-full border border-line p-1">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="rounded-full p-2 hover:bg-surface-2" aria-label="Fewer">
                      <Minus size={18} />
                    </button>
                    <motion.span key={qty} initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-5 text-center text-lg font-bold">
                      {qty}
                    </motion.span>
                    <button onClick={() => setQty((q) => Math.min(maxQty, q + 1))} className="rounded-full p-2 hover:bg-surface-2" aria-label="More">
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={checkout}
                disabled={!type || busy || left <= 0}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-leaf py-4 text-lg font-bold text-ink shadow-lg shadow-leaf/25 active:scale-[0.98] disabled:opacity-50"
              >
                {busy ? <Loader2 className="animate-spin" /> : null}
                {!signedIn ? "Sign in to continue" : total === 0 ? "Get free ticket" + (qty > 1 ? "s" : "") : `Pay ${money(total, type?.currency)}`}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
                <ShieldCheck size={14} /> Secure checkout · Your QR ticket appears instantly in the app
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
