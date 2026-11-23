"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Share, SquarePlus, X, Download } from "lucide-react";
import { LogoMark } from "./logo";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "connect:install-dismissed";

/** "Add to Home Screen" coach mark: native prompt on Android/desktop, step-by-step on iOS Safari. */
export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [bip, setBip] = useState<BIPEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    let dismissed = 0;
    try {
      dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    } catch {}
    if (Date.now() - dismissed < 3 * 24 * 3600_000) return;

    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- user agent is only known in the browser
    setIos(isIos);
    const onBip = (e: Event) => {
      e.preventDefault();
      setBip(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    const t = isIos ? setTimeout(() => setShow(true), 2500) : undefined;
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      if (t) clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 140, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 140, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="fixed inset-x-3 z-50 mx-auto max-w-md rounded-2xl border border-line glass p-4 shadow-2xl shadow-black/50"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.75rem)" }}
          role="dialog"
          aria-label="Install Connect"
        >
          <button onClick={dismiss} className="absolute right-3 top-3 rounded-full p-1 text-muted hover:text-text" aria-label="Dismiss">
            <X size={18} />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <LogoMark size={44} />
            <div>
              <p className="font-semibold">Get the Connect app</p>
              {ios ? (
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  Tap <Share size={15} className="mx-0.5 inline -translate-y-0.5 text-leaf" /> <b className="text-text">Share</b>, then{" "}
                  <SquarePlus size={15} className="mx-0.5 inline -translate-y-0.5 text-leaf" /> <b className="text-text">Add to Home Screen</b>. Your
                  tickets will work even offline.
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted">Install it on your home screen — faster, full-screen, and your tickets work offline.</p>
              )}
            </div>
          </div>
          {!ios && bip && (
            <button
              onClick={async () => {
                await bip.prompt();
                await bip.userChoice;
                dismiss();
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-leaf py-2.5 font-semibold text-ink active:scale-[0.98]"
            >
              <Download size={18} /> Install app
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
