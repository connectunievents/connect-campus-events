import Link from "next/link";
import { BadgeCheck, Clock3, FileText, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ActionButton, ActionForm } from "@/components/admin/kit";
import { SponsorAvatar } from "@/components/sponsor-card";
import { setSponsorHidden } from "@/app/(app)/sponsors/actions";
import { reviewSponsor } from "@/app/(app)/sponsor-hub/actions";
import { SPONSOR_PRIVATE_SELECT, industryLabel, isSponsorLive, type SponsorPrivate } from "@/lib/types";
import { fmtDay, nowMs } from "@/lib/format";

export const metadata = { title: "Sponsor profiles" };

const KIND: Record<string, string> = { registration: "Commercial registration", tax: "Tax certificate", other: "Other" };
const BADGE: Record<string, string> = {
  draft: "bg-surface-2 text-muted",
  pending: "bg-warn/15 text-warn",
  approved: "bg-leaf/15 text-leaf",
  rejected: "bg-danger/15 text-danger",
};

export default async function OwnerSponsorProfiles() {
  const supabase = await createClient();
  const [{ data }, { data: docs }] = await Promise.all([
    supabase.from("sponsor_profiles").select(SPONSOR_PRIVATE_SELECT).order("submitted_at", { ascending: false, nullsFirst: false }),
    supabase.from("sponsor_documents").select("id, profile_id, kind, file_name, file_path, uploaded_at").order("uploaded_at"),
  ]);
  const rows = (data ?? []) as SponsorPrivate[];
  const pending = rows.filter((p) => p.verification_status === "pending");
  const others = rows.filter((p) => p.verification_status !== "pending");
  const now = nowMs();

  // Short-lived links to the private documents (owners are allowed by the storage policy).
  const paths = (docs ?? []).map((d) => d.file_path as string);
  const { data: signed } = paths.length ? await supabase.storage.from("sponsor-docs").createSignedUrls(paths, 600) : { data: [] };
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const docsFor = (id: string) => (docs ?? []).filter((d) => d.profile_id === id);

  return (
    <main className="space-y-8">
      <section>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><Clock3 size={18} className="text-warn" /> Verification queue ({pending.length})</h2>
        <p className="mb-4 text-sm text-muted">Check the registration number and documents against the legal name before approving. Document links expire after 10 minutes.</p>
        {pending.length === 0 && <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">Nothing waiting for review.</p>}
        <div className="grid gap-4 lg:grid-cols-2">
          {pending.map((p) => (
            <article key={p.id} className="card-glass space-y-4 rounded-[var(--radius-card)] border border-warn/40 p-5">
              <div className="flex items-center gap-3">
                <SponsorAvatar p={p} size={48} />
                <div className="min-w-0">
                  <div className="font-bold">{p.name}</div>
                  <div className="text-xs text-muted">{industryLabel(p.industry)} · submitted {p.submitted_at ? fmtDay(p.submitted_at) : "—"}</div>
                </div>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted">Legal name</dt><dd className="font-semibold">{p.legal_name}</dd>
                <dt className="text-muted">Registration no.</dt><dd className="font-mono">{p.registration_number}</dd>
                <dt className="text-muted">Country</dt><dd>{p.registration_country}</dd>
                <dt className="text-muted">Website</dt>
                <dd>{p.website_url ? <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="text-leaf underline">{p.website_url.replace(/^https?:\/\//, "")}</a> : "—"}</dd>
              </dl>
              <div className="space-y-2">
                {docsFor(p.id).map((d) => (
                  <a key={d.id} href={urlFor.get(d.file_path) ?? "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl bg-surface-2/60 px-3 py-2 text-sm hover:text-leaf">
                    <FileText size={16} className="shrink-0 text-leaf" />
                    <span className="shrink-0 text-muted">{KIND[d.kind] ?? d.kind}:</span>
                    <span className="truncate">{d.file_name}</span>
                  </a>
                ))}
                {docsFor(p.id).length === 0 && <p className="text-sm text-danger">No documents uploaded.</p>}
              </div>
              <ActionForm action={reviewSponsor.bind(null, p.id)} className="space-y-3">
                <textarea name="notes" rows={2} className="field text-sm" placeholder="Note to the business (required when rejecting)" />
                <div className="flex gap-2">
                  <button name="decision" value="approved" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[1.1rem] bg-leaf font-semibold text-ink">
                    <BadgeCheck size={18} /> Approve
                  </button>
                  <button name="decision" value="rejected" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[1.1rem] bg-danger/15 font-semibold text-danger">
                    <XCircle size={18} /> Reject
                  </button>
                </div>
              </ActionForm>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">All sponsor profiles</h2>
        <div className="space-y-2">
          {others.map((p) => {
            const live = isSponsorLive(p, now);
            return (
              <div key={p.id} className="card-glass flex flex-wrap items-center gap-3 rounded-2xl border border-line p-3">
                <SponsorAvatar p={p} size={44} />
                <div className="min-w-0 flex-1">
                  <Link href={`/sponsors/${p.slug}`} className="font-semibold hover:text-leaf">{p.name}</Link>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${BADGE[p.verification_status]}`}>{p.verification_status}</span>
                    {live ? <span className="text-leaf">Listed until {fmtDay(p.listed_until!)}</span> : <span>Not listed</span>}
                    {p.legal_name && <span>· {p.legal_name}</span>}
                  </div>
                </div>
                {p.verification_status === "approved" && (
                  <ActionForm action={reviewSponsor.bind(null, p.id)} className="contents">
                    <input type="hidden" name="notes" value="Verification revoked by the Connect team" />
                    <button name="decision" value="rejected" className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted hover:text-danger">Revoke</button>
                  </ActionForm>
                )}
                <ActionButton
                  run={setSponsorHidden.bind(null, p.id, !p.is_hidden)}
                  confirmText={p.is_hidden ? undefined : `Hide ${p.name} everywhere?`}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${p.is_hidden ? "bg-danger/15 text-danger" : "bg-surface-2 text-muted"}`}
                >
                  {p.is_hidden ? "Hidden — unhide" : "Hide"}
                </ActionButton>
              </div>
            );
          })}
          {others.length === 0 && <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">No other profiles.</p>}
        </div>
      </section>
    </main>
  );
}
