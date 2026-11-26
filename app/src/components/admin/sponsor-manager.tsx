import { ActionButton, ActionForm, ImageUpload, SubmitButton } from "./kit";
import { deleteSponsor, saveSponsor, toggleSponsor } from "@/app/admin/actions";
import type { Sponsor } from "@/lib/types";

export function SponsorManager({ slug, sponsors, events }: { slug: string | null; sponsors: Sponsor[]; events?: { id: string; title: string }[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="space-y-3">
        {sponsors.length === 0 && <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">No sponsors yet.</p>}
        {sponsors.map((s) => (
          <div key={s.id} className="flex items-center gap-4 rounded-2xl border border-line card-glass p-4">
            <div className="flex h-14 w-24 items-center justify-center rounded-xl bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.logo_url} alt={s.name} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{s.name}</div>
              <div className="text-xs capitalize text-muted">
                {s.tier}
                {s.event_id ? " · one event" : ""}
                {s.website_url ? ` · ${s.website_url.replace(/^https?:\/\//, "")}` : ""}
              </div>
            </div>
            <ActionButton
              run={toggleSponsor.bind(null, slug, s.id, !s.is_active)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${s.is_active ? "bg-leaf/15 text-leaf" : "bg-surface-2 text-muted"}`}
            >
              {s.is_active ? "Live" : "Hidden"}
            </ActionButton>
            <ActionButton run={deleteSponsor.bind(null, slug, s.id)} confirmText={`Remove ${s.name}?`} className="text-xs font-semibold text-danger hover:underline">
              Remove
            </ActionButton>
          </div>
        ))}
      </section>

      <ActionForm action={saveSponsor.bind(null, slug)} resetOnSuccess className="h-fit space-y-4 rounded-2xl border border-line card-glass p-5">
        <h2 className="font-bold">Add sponsor</h2>
        <div>
          <label className="label" htmlFor="s-name">Name *</label>
          <input id="s-name" name="name" required className="field" />
        </div>
        <ImageUpload name="logo_url" label="Logo * (transparent PNG/SVG works best)" aspect="aspect-[3/1]" />
        <div>
          <label className="label" htmlFor="s-web">Website</label>
          <input id="s-web" name="website_url" type="url" placeholder="https://" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="s-tag">Tagline</label>
          <input id="s-tag" name="tagline" className="field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="s-tier">Tier</label>
            <select id="s-tier" name="tier" className="field" defaultValue="partner">
              <option value="platinum">Platinum</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="partner">Partner</option>
            </select>
          </div>
          {events && (
            <div>
              <label className="label" htmlFor="s-ev">Only on event</label>
              <select id="s-ev" name="event_id" className="field" defaultValue="">
                <option value="">All pages</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label" htmlFor="s-start">Starts</label>
            <input id="s-start" name="starts_at" type="datetime-local" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="s-end">Ends</label>
            <input id="s-end" name="ends_at" type="datetime-local" className="field" />
          </div>
        </div>
        <SubmitButton className="w-full">Add sponsor</SubmitButton>
      </ActionForm>
    </div>
  );
}
