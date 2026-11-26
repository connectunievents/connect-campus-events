"use client";
import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 23 23" aria-hidden>
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  );
}

export function LoginButtons({ next }: { next: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const redirectTo = () => `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function oauth(provider: "google" | "azure") {
    setBusy(provider);
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo(),
        scopes: provider === "azure" ? "email openid profile" : undefined,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      toast.error(error.message);
      setBusy(null);
    }
  }

  async function magic(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    setBusy(null);
    if (error) toast.error(error.message);
    else toast.success("Check your inbox for a sign-in link ✉️");
  }

  const base =
    "flex w-full items-center justify-center gap-3 rounded-2xl py-3.5 font-semibold transition active:scale-[0.98] disabled:opacity-60";

  return (
    <div className="mt-8 space-y-3">
      <button onClick={() => oauth("google")} disabled={!!busy} className={`${base} bg-white text-[#1f1f1f]`}>
        {busy === "google" ? <Loader2 className="animate-spin" size={20} /> : <GoogleIcon />} Continue with Google
      </button>
      {/* Live once the Azure provider is configured in Supabase (docs/SETUP.md §3); "Coming soon" until then. */}
      {process.env.NEXT_PUBLIC_AUTH_MICROSOFT === "1" ? (
        <button onClick={() => oauth("azure")} disabled={!!busy} className={`${base} bg-[#2f2f2f] text-white`}>
          {busy === "azure" ? <Loader2 className="animate-spin" size={20} /> : <MicrosoftIcon />} Continue with Microsoft
        </button>
      ) : (
        <button disabled aria-disabled className={`${base} cursor-not-allowed bg-[#2f2f2f] text-white/60`} title="Microsoft sign-in is coming soon">
          <MicrosoftIcon /> Continue with Microsoft
          <span className="rounded-full bg-warn/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-warn">Coming soon</span>
        </button>
      )}

      {/* Email magic link is off for now; set NEXT_PUBLIC_AUTH_EMAIL=1 to offer it. */}
      {process.env.NEXT_PUBLIC_AUTH_EMAIL !== "1" ? null : showEmail ? (
        <form onSubmit={magic} className="space-y-3 pt-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            className="field"
            autoComplete="email"
          />
          <button disabled={!!busy} className={`${base} border border-line card-glass`}>
            {busy === "email" ? <Loader2 className="animate-spin" size={20} /> : <Mail size={20} />} Email me a sign-in link
          </button>
        </form>
      ) : (
        <button onClick={() => setShowEmail(true)} className="w-full py-2 text-sm font-semibold text-muted hover:text-text">
          Use email instead
        </button>
      )}
    </div>
  );
}
