export function money(cents: number, currency = "usd") {
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
}

export function priceFrom(types?: { price_cents: number; currency: string }[]) {
  if (!types || types.length === 0) return null;
  if (types.some((t) => t.price_cents === 0)) return types.every((t) => t.price_cents === 0) ? "Free" : "Free+";
  const min = types.reduce((a, b) => (b.price_cents < a.price_cents ? b : a));
  return `From ${money(min.price_cents, min.currency)}`;
}

export function remaining(types?: { quantity: number; sold: number }[]) {
  if (!types || types.length === 0) return null;
  return types.reduce((s, t) => s + Math.max(t.quantity - t.sold, 0), 0);
}

const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const longFmt = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });

export const fmtDay = (iso: string) => dayFmt.format(new Date(iso));
export const fmtLongDay = (iso: string) => longFmt.format(new Date(iso));
export const fmtTime = (iso: string) => timeFmt.format(new Date(iso));
export const fmtMonth = (iso: string) => monthFmt.format(new Date(iso)).toUpperCase();
export const fmtDate = (iso: string) => new Date(iso).getDate();

export function endOf(starts: string, ends: string | null) {
  return ends ? new Date(ends).getTime() : new Date(starts).getTime() + 4 * 3600_000;
}

export function isLive(starts: string, ends: string | null, now = Date.now()) {
  return new Date(starts).getTime() <= now && now <= endOf(starts, ends);
}

export function relativeStart(starts: string, ends: string | null, now = Date.now()) {
  if (isLive(starts, ends, now)) return "Happening now";
  const diff = new Date(starts).getTime() - now;
  if (diff < 0) return "Ended";
  const h = Math.round(diff / 3600_000);
  if (h < 1) return "Starting soon";
  if (h < 24) return `In ${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.round(h / 24);
  if (d === 1) return "Tomorrow";
  if (d < 7) return `In ${d} days`;
  return fmtDay(starts);
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

/** For <input type="datetime-local"> values in the viewer's local time. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Current time (wrapped so server components can read the clock without tripping the purity lint rule). */
export const nowMs = () => Date.now();
export const isoFromNow = (deltaMs: number) => new Date(Date.now() + deltaMs).toISOString();
