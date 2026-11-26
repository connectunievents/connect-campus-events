"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import QRCode from "qrcode";
import { CheckCircle2, ChevronLeft, ChevronRight, ShieldCheck, Sun, WifiOff, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { WINDOW_SECONDS, buildPayload } from "@/lib/rolling-code";
import { fmtLongDay, fmtTime } from "@/lib/format";

export type LiveTicketData = {
  id: string;
  code: string;
  status: "valid" | "used" | "void";
  holder_name: string | null;
  checked_in_at: string | null;
  ticket_types: { name: string } | null;
  events: {
    title: string;
    starts_at: string;
    ends_at: string | null;
    time_tbc?: boolean;
    venue: string | null;
    campus: string | null;
    universities: { name: string; short_name: string | null; brand_color: string | null } | null;
  } | null;
};

const secretKey = (id: string) => `connect:ticket-secret:${id}`;

async function loadSecret(id: string): Promise<string | null> {
  try {
    const cached = localStorage.getItem(secretKey(id));
    if (cached) return cached;
  } catch {}
  const { data } = await createClient().rpc("my_ticket_secret", { p_ticket: id });
  if (typeof data === "string") {
    try {
      localStorage.setItem(secretKey(id), data);
    } catch {}
    return data;
  }
  return null;
}

function RotatingQR({ ticket }: { ticket: LiveTicketData }) {
  const [svg, setSvg] = useState<string>("");
  const [progress, setProgress] = useState(1);
  const [offline, setOffline] = useState(false);
  const [missing, setMissing] = useState(false);
  const secret = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    let lastPayload = "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- connectivity is only known in the browser
    setOffline(!navigator.onLine);
    loadSecret(ticket.id).then((s) => {
      secret.current = s;
      if (!s) setMissing(true);
    });
    const tick = async () => {
      const now = Date.now();
      setProgress(1 - ((now / 1000) % WINDOW_SECONDS) / WINDOW_SECONDS);
      if (!secret.current) return;
      const payload = await buildPayload(ticket.code, secret.current, now);
      if (payload !== lastPayload && alive) {
        lastPayload = payload;
        setSvg(await QRCode.toString(payload, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#07130c", light: "#ffffff" } }));
      }
    };
    tick();
    const t = setInterval(tick, 250);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [ticket.id, ticket.code]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative rounded-3xl bg-white p-4 shadow-[0_0_60px_rgba(82,212,131,0.25)]">
        {svg ? (
          <div className="h-64 w-64" dangerouslySetInnerHTML={{ __html: svg }} aria-label={`Ticket QR code ${ticket.code}`} role="img" />
        ) : (
          <div className="skeleton h-64 w-64 rounded-xl" />
        )}
        {/* scanning shimmer to show it's live, not a screenshot */}
        <motion.div
          className="pointer-events-none absolute inset-x-4 h-10 bg-gradient-to-b from-transparent via-leaf/25 to-transparent"
          animate={{ top: ["8%", "82%", "8%"] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className="mt-4 h-1.5 w-64 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-leaf transition-[width] duration-200 ease-linear" style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
        <ShieldCheck size={14} className="text-leaf" /> Live code refreshes every {WINDOW_SECONDS}s — screenshots won&apos;t work
      </p>
      {offline && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-warn">
          <WifiOff size={14} /> Offline — your ticket still works
        </p>
      )}
      {missing && <p className="mt-1 text-xs text-danger">Couldn&apos;t load this ticket. Connect to the internet once and reopen.</p>}
    </div>
  );
}

export function LiveTicket({ tickets, startIndex }: { tickets: LiveTicketData[]; startIndex: number }) {
  const [i, setI] = useState(startIndex);
  const [dir, setDir] = useState(0);
  const t = tickets[i];
  const e = t.events!;
  const color = e.universities?.brand_color ?? "#16542F";

  // Keep the screen awake while showing the ticket.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => undefined);
    return () => {
      lock?.release().catch(() => undefined);
    };
  }, []);

  const go = (d: number) => {
    const n = i + d;
    if (n < 0 || n >= tickets.length) return;
    setDir(d);
    setI(n);
  };

  return (
    <div className="px-4 pb-8">
      <AnimatePresence mode="popLayout" custom={dir} initial={false}>
        <motion.div
          key={t.id}
          custom={dir}
          initial={{ x: dir * 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: dir * -300, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          drag={tickets.length > 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => (info.offset.x < -80 ? go(1) : info.offset.x > 80 ? go(-1) : null)}
          className="overflow-hidden rounded-[2rem] border border-line card-glass"
        >
          <div className="p-5 text-white" style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
            <div className="text-xs font-bold uppercase tracking-widest text-white/80">{e.universities?.name}</div>
            <div className="mt-1 text-2xl font-bold leading-tight">{e.title}</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-white/70">Date</div>
                <div className="font-semibold">{fmtLongDay(e.starts_at)}</div>
              </div>
              <div>
                <div className="text-white/70">Time</div>
                <div className="font-semibold">{e.time_tbc ? "TBC" : fmtTime(e.starts_at)}</div>
              </div>
              <div>
                <div className="text-white/70">Venue</div>
                <div className="font-semibold">{e.venue ?? e.campus ?? "Campus"}</div>
              </div>
              <div>
                <div className="text-white/70">Ticket</div>
                <div className="font-semibold">{t.ticket_types?.name}</div>
              </div>
            </div>
          </div>

          <div className="relative flex items-center">
            <span className="absolute -left-4 h-8 w-8 rounded-full bg-base" />
            <span className="mx-5 flex-1 border-t-2 border-dashed border-line" />
            <span className="absolute -right-4 h-8 w-8 rounded-full bg-base" />
          </div>

          <div className="flex flex-col items-center p-6">
            {t.status === "valid" ? (
              <RotatingQR ticket={t} />
            ) : t.status === "used" ? (
              <div className="flex h-72 flex-col items-center justify-center text-center">
                <CheckCircle2 size={72} className="text-leaf" />
                <p className="mt-3 text-xl font-bold">Checked in</p>
                {t.checked_in_at && <p className="text-sm text-muted">{fmtTime(t.checked_in_at)} · Enjoy the event!</p>}
              </div>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center text-center">
                <XCircle size={72} className="text-danger" />
                <p className="mt-3 text-xl font-bold">Ticket voided</p>
                <p className="text-sm text-muted">Contact the organizer if this is a mistake.</p>
              </div>
            )}
            <div className="mt-5 text-center">
              <div className="text-xs text-muted">{t.holder_name}</div>
              <div className="font-mono text-lg tracking-[0.3em]">{t.code.match(/.{1,4}/g)?.join(" ")}</div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {tickets.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <button onClick={() => go(-1)} disabled={i === 0} className="rounded-full bg-surface p-2 disabled:opacity-30" aria-label="Previous ticket">
            <ChevronLeft />
          </button>
          <div className="flex gap-1.5">
            {tickets.map((x, k) => (
              <span key={x.id} className={`h-2 rounded-full transition-all ${k === i ? "w-6 bg-leaf" : "w-2 bg-line"}`} />
            ))}
          </div>
          <button onClick={() => go(1)} disabled={i === tickets.length - 1} className="rounded-full bg-surface p-2 disabled:opacity-30" aria-label="Next ticket">
            <ChevronRight />
          </button>
        </div>
      )}
      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <Sun size={14} /> Turn your brightness up at the gate
      </p>
    </div>
  );
}
