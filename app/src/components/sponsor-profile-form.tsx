"use client";
import { useActionState, useEffect, useTransition } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/admin/kit";
import { deleteSponsorProfile, saveSponsorProfile, type SponsorFormState } from "@/app/(app)/sponsors/actions";
import { CATEGORIES, INDUSTRIES, type SponsorProfile } from "@/lib/types";

const BUDGETS = ["Under $500", "$500 – $2,000", "$2,000 – $10,000", "$10,000+", "In-kind only (products / services)"];

export function SponsorProfileForm({
  profile,
  contact,
}: {
  profile: SponsorProfile | null;
  contact: { contact_email: string | null; contact_phone: string | null } | null;
}) {
  const [state, action, pending] = useActionState<SponsorFormState, FormData>(saveSponsorProfile, {});
  const [deleting, startDelete] = useTransition();
  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) toast.success(state.message ?? "Saved");
  }, [state]);

  const p = profile;
  return (
    <form action={action} className="space-y-5 px-4">
      <section className="space-y-4 rounded-[var(--radius-card)] border border-line card-glass p-5">
        <h2 className="font-bold">Company</h2>
        <div>
          <label className="label" htmlFor="name">Company name *</label>
          <input id="name" name="name" required minLength={2} maxLength={120} defaultValue={p?.name} className="field" placeholder="Cedar Coffee Co." />
        </div>
        <div>
          <label className="label" htmlFor="tagline">Tagline</label>
          <input id="tagline" name="tagline" maxLength={160} defaultValue={p?.tagline ?? ""} className="field" placeholder="One line about your brand" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="industry">Industry</label>
            <select id="industry" name="industry" defaultValue={p?.industry ?? "other"} className="field">
              {INDUSTRIES.map((i) => (
                <option key={i.id} value={i.id}>{i.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="website_url">Website</label>
            <input id="website_url" name="website_url" defaultValue={p?.website_url ?? ""} className="field" placeholder="https://" />
          </div>
          <div>
            <label className="label" htmlFor="city">City</label>
            <input id="city" name="city" defaultValue={p?.city ?? ""} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="country">Country</label>
            <input id="country" name="country" defaultValue={p?.country ?? ""} className="field" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="about">About</label>
          <textarea id="about" name="about" rows={5} maxLength={4000} defaultValue={p?.about ?? ""} className="field" placeholder="Who you are, your audience, past events you sponsored…" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUpload name="logo_url" defaultValue={p?.logo_url} label="Logo (square works best)" aspect="aspect-square" />
          <ImageUpload name="cover_url" defaultValue={p?.cover_url} label="Cover image" aspect="aspect-[16/9]" />
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius-card)] border border-line card-glass p-5">
        <h2 className="font-bold">Sponsorship</h2>
        <fieldset>
          <legend className="label">Events you like to sponsor</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.slice(1).map((c) => (
              <label key={c.id} className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-muted has-[:checked]:border-leaf has-[:checked]:bg-leaf/10 has-[:checked]:text-leaf">
                <input type="checkbox" name="interests" value={c.id} defaultChecked={p?.interests.includes(c.id)} className="sr-only" />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="label" htmlFor="offer">What you can offer</label>
          <textarea id="offer" name="offer" rows={3} maxLength={1000} defaultValue={p?.offer ?? ""} className="field" placeholder="Cash prizes, free products, a booth, internships, venue…" />
        </div>
        <div>
          <label className="label" htmlFor="budget_range">Typical budget per event</label>
          <select id="budget_range" name="budget_range" defaultValue={p?.budget_range ?? ""} className="field">
            <option value="">Prefer not to say</option>
            {BUDGETS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius-card)] border border-line card-glass p-5">
        <h2 className="font-bold">Contact & visibility</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="contact_email">Contact email</label>
            <input id="contact_email" name="contact_email" type="email" defaultValue={contact?.contact_email ?? ""} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="contact_phone">Contact phone</label>
            <input id="contact_phone" name="contact_phone" type="tel" defaultValue={contact?.contact_phone ?? ""} className="field" />
          </div>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="show_contact" defaultChecked={p?.show_contact ?? false} className="mt-0.5 h-4 w-4 accent-[#52d483]" />
          <span>
            <b>Show my email and phone to everyone.</b>
            <span className="block text-muted">If unticked, only university staff on Connect can see them. Anyone can still message you through Connect.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="is_published" defaultChecked={p?.is_published ?? true} className="mt-0.5 h-4 w-4 accent-[#52d483]" />
          <span>
            <b>Show my profile in the sponsors directory while my listing is active.</b>
            <span className="block text-muted">Your profile only appears after your business is verified and you have an active listing package.</span>
          </span>
        </label>
      </section>

      <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-leaf py-3.5 text-lg font-bold text-ink active:scale-[0.98] disabled:opacity-60">
        {pending ? <Loader2 className="animate-spin" /> : <Save size={20} />} {p ? "Save profile" : "Continue to verification"}
      </button>

      {p && (
        <button
          type="button"
          disabled={deleting}
          onClick={() => {
            if (!confirm("Delete your sponsor profile and all its conversations? This can't be undone.")) return;
            startDelete(async () => {
              const r = await deleteSponsorProfile();
              if (r?.error) toast.error(r.error);
            });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line py-3 text-sm font-semibold text-danger hover:bg-danger/10"
        >
          <Trash2 size={16} /> Delete sponsor profile
        </button>
      )}
    </form>
  );
}
