import { isSupabaseConfigured } from "@/lib/env";

/** Shown only until the Supabase env vars are configured. */
export function SetupBanner() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="m-3 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
      <b>Setup needed:</b> add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
      <code>.env.local</code> (see docs/SETUP.md).
    </div>
  );
}
