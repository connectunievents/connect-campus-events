import Link from "next/link";
import { BadgeCheck, CheckCircle2, Clock3, ExternalLink, Inbox, PartyPopper, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMySponsorProfile, getSponsorContact, getUnreadCount } from "@/lib/sponsors";
import { paymentProvider } from "@/lib/payments";
import { SponsorProfileForm } from "@/components/sponsor-profile-form";
import { SponsorVerify } from "@/components/sponsor-verify";
import { PackagePicker } from "@/components/package-picker";
import { PageTitle, buttonClass } from "@/components/ui";
import { fmtDay, money, nowMs } from "@/lib/format";
import { isSponsorLive, type ListingPlan } from "@/lib/types";

export const metadata = { title: "Sponsor profile" };

const STEPS = ["Profile", "Verify business", "Review", "Listing"];

function Stepper({ step }: { step: number }) {
  return (
    <ol className="no-scrollbar mx-4 mb-5 flex gap-2 overflow-x-auto">
      {STEPS.map((s, i) => {
        const done = i < step;
        const on = i === step;
        return (
          <li
            key={s}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${
              on ? "bg-leaf text-ink" : done ? "bg-leaf/15 text-leaf" : "border border-line text-muted"
            }`}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${on ? "bg-ink/15" : done ? "bg-leaf/20" : "bg-surface-2"}`}>
              {done ? "✓" : i + 1}
            </span>
            {s}
          </li>
        );
      })}
    </ol>
  );
}

export default async function SponsorHub({ searchParams }: { searchParams: Promise<{ paid?: string; demo?: string; cancelled?: string }> }) {
  const sp = await searchParams;
  await requireUser("/sponsor-hub");
  const profile = await getMySponsorProfile();
  const supabase = await createClient();

  const [contact, unread, docsRes, plansRes, listingsRes] = await Promise.all([
    profile ? getSponsorContact(profile.id) : Promise.resolve(null),
    getUnreadCount(),
    profile ? supabase.from("sponsor_documents").select("id, kind, file_name, uploaded_at").eq("profile_id", profile.id).order("uploaded_at") : Promise.resolve({ data: [] }),
    supabase.from("listing_plans").select("*").eq("is_active", true).order("sort_order"),
    profile
      ? supabase.from("sponsor_listings").select("id, plan_id, starts_at, ends_at, days, amount_cents, currency, status, created_at").eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(20)
      : Promise.resolve({ data: [] }),
  ]);
  const documents = (docsRes.data ?? []) as { id: string; kind: string; file_name: string; uploaded_at: string }[];
  const plans = (plansRes.data ?? []) as ListingPlan[];
  const listings = (listingsRes.data ?? []) as { id: string; plan_id: string; starts_at: string; ends_at: string; days: number; amount_cents: number; currency: string; status: string }[];

  const status = profile?.verification_status ?? "draft";
  const live = profile ? isSponsorLive(profile, nowMs()) : false;
  const step = !profile ? 0 : status === "draft" || status === "rejected" ? 1 : status === "pending" ? 2 : 3;
  const renewUntil = profile?.listed_until && new Date(profile.listed_until).getTime() > nowMs() ? profile.listed_until : null;

  return (
    <main className="animate-fade-up pb-10">
      <PageTitle
        title={profile ? "Sponsor hub" : "Become a sponsor"}
        subtitle={profile ? profile.name : "Verified businesses get listed in the sponsors directory, where universities and clubs invite them to events."}
      />
      <Stepper step={step} />

      {profile && (
        <div className="mx-4 mb-5 flex flex-wrap gap-2">
          {live && (
            <Link href={`/sponsors/${profile.slug}`} className={buttonClass("outline", "sm")}>
              <ExternalLink size={14} /> Public profile
            </Link>
          )}
          <Link href="/inbox" className={buttonClass("outline", "sm")}>
            <Inbox size={14} /> Inbox{unread ? ` (${unread})` : ""}
          </Link>
        </div>
      )}

      {sp.paid && (
        <p className="mx-4 mb-5 flex items-center gap-2 rounded-2xl border border-leaf/40 bg-leaf/10 p-4 font-semibold">
          <PartyPopper className="text-leaf" /> Payment received — your listing is active{sp.demo ? " (demo payment, nothing charged)" : ""}.
        </p>
      )}
      {sp.cancelled && <p className="mx-4 mb-5 rounded-2xl border border-line p-4 text-sm text-muted">Payment cancelled. Nothing was charged.</p>}

      {/* Step 1: public profile */}
      {!profile ? (
        <SponsorProfileForm profile={null} contact={null} />
      ) : (
        <>
          {/* Step 2–4 status */}
          <section className="mx-4 mb-6">
            {status === "rejected" && (
              <div className="mb-4 flex gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-4">
                <XCircle className="shrink-0 text-danger" />
                <div>
                  <p className="font-semibold">Verification was not approved</p>
                  {profile.review_notes && <p className="mt-1 text-sm">Reason: {profile.review_notes}</p>}
                  <p className="mt-1 text-sm text-muted">Fix the details or upload better documents, then submit again.</p>
                </div>
              </div>
            )}
            {status === "pending" && (
              <div className="mb-4 flex gap-3 rounded-2xl border border-warn/40 bg-warn/10 p-4">
                <Clock3 className="shrink-0 text-warn" />
                <div>
                  <p className="font-semibold">Under review</p>
                  <p className="mt-1 text-sm text-muted">
                    Submitted {profile.submitted_at ? fmtDay(profile.submitted_at) : "recently"}. The Connect team checks your documents, usually within 2 business days.
                    Your profile stays hidden until then.
                  </p>
                </div>
              </div>
            )}
            {status === "approved" && (
              <div className="mb-4 flex gap-3 rounded-2xl border border-leaf/40 bg-leaf/10 p-4">
                <BadgeCheck className="shrink-0 text-leaf" />
                <div>
                  <p className="font-semibold">Verified business{profile.verified_at ? ` · ${fmtDay(profile.verified_at)}` : ""}</p>
                  <p className="mt-1 text-sm text-muted">
                    {live
                      ? `Listed in the sponsors directory until ${fmtDay(profile.listed_until!)}.`
                      : "Choose a listing package below to appear in the sponsors directory and message universities."}
                  </p>
                </div>
              </div>
            )}

            {status === "approved" ? (
              <>
                <h2 className="mb-3 text-lg font-bold">{live ? "Extend your listing" : "Choose a listing package"}</h2>
                <PackagePicker plans={plans} renewUntil={renewUntil} demo={paymentProvider() === "demo"} />
                {listings.length > 0 && (
                  <div className="mt-6">
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted">Purchases</h3>
                    <ul className="space-y-2">
                      {listings.map((l) => (
                        <li key={l.id} className="card-glass flex items-center justify-between gap-3 rounded-2xl border border-line p-3 text-sm">
                          <span>
                            <span className="font-semibold">{plans.find((p) => p.id === l.plan_id)?.name ?? l.plan_id}</span>
                            <span className="text-muted"> · {l.days} days from {fmtDay(l.starts_at)}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            {money(l.amount_cents, l.currency)}
                            {l.status === "paid" ? <CheckCircle2 size={16} className="text-leaf" /> : <span className="text-xs capitalize text-muted">{l.status}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="mb-3 text-lg font-bold">Verify your business</h2>
                <SponsorVerify
                  status={status}
                  details={{ legal_name: profile.legal_name, registration_number: profile.registration_number, registration_country: profile.registration_country }}
                  documents={documents}
                />
              </>
            )}
          </section>

          {status === "approved" && (
            <section className="mx-4 mb-6">
              <details className="card-glass rounded-[var(--radius-card)] border border-line p-5">
                <summary className="cursor-pointer font-bold">Legal details &amp; documents</summary>
                <div className="mt-4">
                  <SponsorVerify
                    status={status}
                    details={{ legal_name: profile.legal_name, registration_number: profile.registration_number, registration_country: profile.registration_country }}
                    documents={documents}
                  />
                </div>
              </details>
            </section>
          )}

          <section className="mb-2">
            <h2 className="mx-4 mb-3 text-lg font-bold">Public profile</h2>
            <SponsorProfileForm profile={profile} contact={contact} />
          </section>
        </>
      )}
    </main>
  );
}
