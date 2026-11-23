"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import QrScanner from "qr-scanner";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Flashlight, Keyboard, Loader2, RefreshCcw, XCircle } from "lucide-react";
import type { ScanResponse } from "@/app/api/scan/route";

type Result = ScanResponse & { at: number; raw: string };

const COPY: Record<ScanResponse["result"], { title: string; tone: "ok" | "warn" | "bad" }> = {
  admitted: { title: "Admit", tone: "ok" },
  already_used: { title: "Already scanned", tone: "warn" },
  invalid: { title: "Not a valid ticket", tone: "bad" },
  wrong_event: { title: "Wrong event", tone: "bad" },
  void: { title: "Ticket voided", tone: "bad" },
  expired_code: { title: "Expired code — screenshot?", tone: "bad" },
  not_today: { title: "Gate not open for this event", tone: "warn" },
  forbidden: { title: "You're not staff for this event", tone: "bad" },
};

function beep(ok: boolean) {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = ok ? 880 : 220;
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (ok ? 0.18 : 0.45));
    o.start();
    o.stop(ctx.currentTime + 0.5);
  } catch {}
  navigator.vibrate?.(ok ? 60 : [120, 80, 120]);
}

export function Scanner({ eventId, title, venue }: { eventId: string; title: string; venue: string | null }) {
  const video = useRef<HTMLVideoElement>(null);
  const scanner = useRef<QrScanner | null>(null);
  const busy = useRef(false);
  const last = useRef<{ raw: string; at: number }>({ raw: "", at: 0 });
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<Result[]>([]);
  const [stats, setStats] = useState<{ checkedIn: number; sold: number } | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);

  const submit = useCallback(
    async (raw: string) => {
      if (busy.current) return;
      const now = Date.now();
      if (raw === last.current.raw && now - last.current.at < 3000) return;
      last.current = { raw, at: now };
      busy.current = true;
      setChecking(true);
      try {
        const res = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, raw }) });
        const body = (await res.json()) as ScanResponse & { error?: string };
        const r: Result = { ...(body.result ? body : { result: "invalid" }), at: Date.now(), raw };
        if (body.stats) setStats(body.stats);
        setResult(r);
        setHistory((h) => [r, ...h].slice(0, 30));
        beep(r.result === "admitted");
      } catch {
        setResult({ result: "invalid", at: Date.now(), raw, holder: "Network error — try again" });
        beep(false);
      } finally {
        setChecking(false);
        setTimeout(() => {
          busy.current = false;
          setResult(null);
        }, 1800);
      }
    },
    [eventId],
  );

  useEffect(() => {
    if (!video.current) return;
    const s = new QrScanner(video.current, (r) => submit(r.data), {
      preferredCamera: "environment",
      maxScansPerSecond: 10,
      highlightScanRegion: false,
      returnDetailedScanResult: true,
    });
    scanner.current = s;
    s.start()
      .then(async () => setHasTorch(await s.hasFlash()))
      .catch((e) => setCamError(String(e?.message ?? e ?? "Camera unavailable")));
    return () => {
      s.stop();
      s.destroy();
    };
  }, [submit]);

  // Live counter: load now and refresh every 10 s (other gates may be scanning too).
  useEffect(() => {
    const load = () =>
      fetch(`/api/scan?eventId=${eventId}`)
        .then((r) => r.json())
        .then((b) => b.stats && setStats(b.stats))
        .catch(() => undefined);
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [eventId]);

  const tone = result ? COPY[result.result]?.tone : null;
  const visibleResult = result;

  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      <video ref={video} className="absolute inset-0 h-full w-full object-cover" muted playsInline />

      {/* Viewfinder */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-64 w-64">
          {["left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl"].map((c) => (
            <span key={c} className={`absolute h-12 w-12 border-leaf ${c}`} />
          ))}
          <motion.span
            className="absolute inset-x-3 h-0.5 bg-leaf shadow-[0_0_16px_4px_rgba(82,212,131,0.6)]"
            animate={{ top: ["6%", "94%", "6%"] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.45)] [clip-path:polygon(0_0,100%_0,100%_100%,0_100%,0_0,calc(50%-8rem)_calc(50%-8rem),calc(50%-8rem)_calc(50%+8rem),calc(50%+8rem)_calc(50%+8rem),calc(50%+8rem)_calc(50%-8rem),calc(50%-8rem)_calc(50%-8rem))]" />

      {/* Top bar */}
      <header className="pt-safe absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent px-4 pb-8 pt-3">
        <Link href="/scan" className="rounded-full bg-white/10 p-2 backdrop-blur" aria-label="Back">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 text-center">
          <div className="truncate font-semibold">{title}</div>
          <div className="text-xs text-white/60">{venue}</div>
        </div>
        <div className="rounded-2xl bg-white/10 px-3 py-1.5 text-center backdrop-blur">
          <div className="text-lg font-bold leading-none text-leaf">{stats ? stats.checkedIn : "–"}</div>
          <div className="text-[10px] text-white/70">of {stats?.sold ?? "–"} in</div>
        </div>
      </header>

      {camError && (
        <div className="absolute inset-x-4 top-1/3 rounded-2xl bg-surface p-5 text-center">
          <AlertTriangle className="mx-auto text-warn" />
          <p className="mt-2 font-semibold">Camera not available</p>
          <p className="mt-1 text-sm text-muted">{camError}. Allow camera access in your browser settings, or type the ticket code.</p>
        </div>
      )}

      {/* Bottom controls */}
      <footer className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-4 pt-10" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}>
        {manual ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) submit(code.trim());
              setCode("");
            }}
            className="mb-3 flex gap-2"
          >
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ticket code e.g. 8F3A 91C2 7D04"
              className="field flex-1 font-mono tracking-widest"
              autoCapitalize="characters"
            />
            <button className="rounded-xl bg-leaf px-4 font-semibold text-ink">Check</button>
          </form>
        ) : null}
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setManual((m) => !m)} className="flex flex-col items-center gap-1 rounded-2xl bg-white/10 px-4 py-2 text-xs backdrop-blur">
            <Keyboard size={22} /> Type code
          </button>
          {hasTorch && (
            <button
              onClick={async () => {
                await scanner.current?.toggleFlash();
                setTorch((t) => !t);
              }}
              className={`flex flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs backdrop-blur ${torch ? "bg-leaf text-ink" : "bg-white/10"}`}
            >
              <Flashlight size={22} /> Torch
            </button>
          )}
          <button onClick={() => location.reload()} className="flex flex-col items-center gap-1 rounded-2xl bg-white/10 px-4 py-2 text-xs backdrop-blur">
            <RefreshCcw size={22} /> Restart
          </button>
        </div>
        {history.length > 0 && (
          <ul className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {history.map((h) => (
                <li key={h.at} className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${COPY[h.result].tone === "ok" ? "bg-leaf/20 text-leaf" : COPY[h.result].tone === "warn" ? "bg-warn/20 text-warn" : "bg-danger/20 text-danger"}`}>
                  {h.holder ?? COPY[h.result].title}
                </li>
              ))}
          </ul>
        )}
      </footer>

      {checking && !visibleResult && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Loader2 size={48} className="animate-spin text-leaf" />
        </div>
      )}

      {/* Full-screen verdict */}
      <AnimatePresence>
        {visibleResult && (
          <motion.div
            key={visibleResult.at}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={`absolute inset-0 flex flex-col items-center justify-center px-8 text-center ${
              tone === "ok" ? "bg-[#12a150]" : tone === "warn" ? "bg-[#d89614]" : "bg-[#d83a3a]"
            }`}
            onClick={() => setResult(null)}
          >
            <motion.div initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 12 }}>
              {tone === "ok" ? <CheckCircle2 size={120} strokeWidth={2.2} /> : tone === "warn" ? <Clock size={120} /> : <XCircle size={120} />}
            </motion.div>
            <p className="mt-4 text-4xl font-extrabold uppercase tracking-tight">{COPY[visibleResult.result].title}</p>
            {visibleResult.holder && <p className="mt-2 text-2xl font-semibold">{visibleResult.holder}</p>}
            {visibleResult.ticketType && <p className="mt-1 text-lg opacity-90">{visibleResult.ticketType}</p>}
            {visibleResult.result === "already_used" && visibleResult.checkedInAt && (
              <p className="mt-2 opacity-90">at {new Date(visibleResult.checkedInAt).toLocaleTimeString()}</p>
            )}
            {visibleResult.manual && visibleResult.result === "admitted" && (
              <p className="mt-4 rounded-full bg-black/20 px-3 py-1 text-sm">Manual entry — check their ID</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
