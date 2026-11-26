"use client";
import { useEffect, useState } from "react";
import { ActionForm, ImageUpload, SubmitButton } from "./kit";
import type { FormState } from "@/app/admin/actions";
import { CATEGORIES, type EventRow } from "@/lib/types";
import { toLocalInput } from "@/lib/format";

export function EventForm({ action, event }: { action: (p: FormState, f: FormData) => Promise<FormState>; event?: EventRow | null }) {
  // Datetime values must be rendered in the viewer's timezone, so fill them on the client.
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- timezone-dependent values must be computed after hydration
    setStarts(toLocalInput(event?.starts_at));
    setEnds(toLocalInput(event?.ends_at));
  }, [event?.starts_at, event?.ends_at]);

  return (
    <ActionForm action={action} className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4 rounded-2xl border border-line card-glass p-5">
        <div>
          <label className="label" htmlFor="title">Title *</label>
          <input id="title" name="title" required defaultValue={event?.title} className="field text-lg font-semibold" placeholder="Spring Career Fair" />
        </div>
        <div>
          <label className="label" htmlFor="summary">One-line summary</label>
          <input id="summary" name="summary" defaultValue={event?.summary ?? ""} className="field" placeholder="60+ companies hiring interns and grads." maxLength={160} />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={6} defaultValue={event?.description ?? ""} className="field" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="starts_at">Starts *</label>
            <input id="starts_at" name="starts_at" type="datetime-local" required value={starts} onChange={(e) => setStarts(e.target.value)} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="ends_at">Ends</label>
            <input id="ends_at" name="ends_at" type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="venue">Venue</label>
            <input id="venue" name="venue" defaultValue={event?.venue ?? ""} className="field" placeholder="Irwin Hall" />
          </div>
          <div>
            <label className="label" htmlFor="campus">Campus</label>
            <input id="campus" name="campus" defaultValue={event?.campus ?? ""} className="field" placeholder="Beirut" />
          </div>
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select id="category" name="category" defaultValue={event?.category ?? "general"} className="field">
              {CATEGORIES.slice(1).map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="visibility">Who can see it</label>
            <select id="visibility" name="visibility" defaultValue={event?.visibility ?? "public"} className="field">
              <option value="public">Everyone</option>
              <option value="students">Students of this university only</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="gate">Gate opens (minutes before start)</label>
            <input id="gate" name="gate_opens_minutes_before" type="number" min={0} max={1440} defaultValue={event?.gate_opens_minutes_before ?? 120} className="field" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl border border-line card-glass p-5">
          <ImageUpload name="cover_url" defaultValue={event?.cover_url} label="Cover image" aspect="aspect-[4/5]" />
        </div>
        <SubmitButton className="w-full py-3">{event ? "Save changes" : "Create draft"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
