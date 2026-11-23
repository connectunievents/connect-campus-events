import { Mail, Phone, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateInquiry } from "../actions";
import { ActionForm, SubmitButton } from "@/components/admin/kit";

export const metadata = { title: "Sponsor inquiries" };

const STAGES = ["new", "contacted", "negotiating", "won", "lost"] as const;
const TONE: Record<string, string> = {
  new: "bg-leaf text-ink",
  contacted: "bg-warn/20 text-warn",
  negotiating: "bg-sky-400/20 text-sky-300",
  won: "bg-leaf/20 text-leaf",
  lost: "bg-surface-2 text-muted",
};

export default async function Inquiries({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("sponsor_inquiries").select("*, universities(name)").order("created_at", { ascending: false });
  if (status && (STAGES as readonly string[]).includes(status)) q = q.eq("status", status);
  const { data } = await q;
  const { data: all } = await supabase.from("sponsor_inquiries").select("status");
  const counts = Object.fromEntries(STAGES.map((s) => [s, (all ?? []).filter((r) => r.status === s).length]));

  return (
    <main>
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        <a href="/owner/inquiries" className={`rounded-full px-3 py-1.5 text-sm font-semibold ${!status ? "bg-text text-ink" : "border border-line text-muted"}`}>
          All ({all?.length ?? 0})
        </a>
        {STAGES.map((s) => (
          <a key={s} href={`/owner/inquiries?status=${s}`} className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${status === s ? "bg-text text-ink" : "border border-line text-muted"}`}>
            {s} ({counts[s]})
          </a>
        ))}
      </div>

      {!data?.length && <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">No inquiries here yet. Share <b>/sponsor</b> with brands.</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {(data ?? []).map((i) => (
          <article key={i.id} className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{i.company_name}</h3>
                <p className="text-sm text-muted">
                  {i.contact_name} · {new Date(i.created_at).toLocaleDateString()} · {(i.universities as { name: string } | null)?.name ?? "All universities"}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${TONE[i.status]}`}>{i.status}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <a href={`mailto:${i.email}?subject=${encodeURIComponent("Sponsoring on Connect")}`} className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 hover:text-leaf">
                <Mail size={14} /> {i.email}
              </a>
              {i.phone && (
                <a href={`tel:${i.phone}`} className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 hover:text-leaf">
                  <Phone size={14} /> {i.phone}
                </a>
              )}
              {i.website_url && (
                <a href={i.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 hover:text-leaf">
                  <Globe size={14} /> Website
                </a>
              )}
            </div>
            <p className="mt-3 text-xs text-muted">
              Prefers <b className="text-text">{i.preferred_contact}</b> · Budget <b className="text-text">{i.budget_range ?? "—"}</b>
            </p>
            <p className="mt-3 whitespace-pre-line rounded-xl bg-base/60 p-3 text-sm">{i.message}</p>
            <ActionForm action={updateInquiry.bind(null, i.id)} className="mt-4 space-y-2">
              <div className="flex gap-2">
                <select name="status" defaultValue={i.status} className="field w-40 capitalize">
                  {STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <SubmitButton>Update</SubmitButton>
              </div>
              <textarea name="owner_notes" defaultValue={i.owner_notes ?? ""} rows={2} className="field text-sm" placeholder="Call notes, next steps…" />
            </ActionForm>
          </article>
        ))}
      </div>
    </main>
  );
}
