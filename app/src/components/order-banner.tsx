"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Loader2, PartyPopper } from "lucide-react";

/** Celebrates a new order; while a card payment is still confirming, refreshes until tickets arrive. */
export function OrderBanner({ pending, demo }: { pending: boolean; demo: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!pending) {
      navigator.vibrate?.([30, 40, 30]);
      return;
    }
    const t = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(t);
  }, [pending, router]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", damping: 18 }}
      className="mx-4 mb-4 flex items-center gap-3 rounded-2xl border border-leaf/40 bg-leaf/10 p-4"
    >
      {pending ? <Loader2 className="animate-spin text-leaf" /> : <PartyPopper className="text-leaf" />}
      <div>
        <p className="font-semibold">{pending ? "Confirming your payment…" : "You're in! 🎉"}</p>
        <p className="text-sm text-muted">
          {pending ? "Your tickets will appear here in a moment." : "Tap your ticket to show the QR code at the gate."}
          {demo && " (Demo payment — no money was charged.)"}
        </p>
      </div>
    </motion.div>
  );
}
