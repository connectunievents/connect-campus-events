"use client";
import { useActionState, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { startThread, type SponsorFormState } from "@/app/(app)/sponsors/actions";
import { fmtDay } from "@/lib/format";

type Uni = { id: string; name: string; events: { id: string; title: string; starts_at: string }[] };

/**
 * mode "university": staff writing to a sponsor (pick which of their universities + optional event).
 * mode "sponsor": a sponsor proposing to one university (university fixed, optional event).
 */
export function StartThreadForm({
  mode,
  sponsorId,
  sponsorName,
  universities,
  defaultEventId,
}: {
  mode: "university" | "sponsor";
  sponsorId: string;
  sponsorName: string;
  universities: Uni[];
  defaultEventId?: string;
}) {
  const [state, action, pending] = useActionState<SponsorFormState, FormData>(startThread, {});
  const [uniId, setUniId] = useState(universities[0]?.id ?? "");
  const events = useMemo(() => universities.find((u) => u.id === uniId)?.events ?? [], [universities, uniId]);
  const [eventId, setEventId] = useState(defaultEventId && events.some((e) => e.id === defaultEventId) ? defaultEventId : "");
  const eventTitle = events.find((e) => e.id === eventId)?.title;

  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="sponsor_id" value={sponsorId} />
      {mode === "university" && universities.length > 1 ? (
        <div>
          <label className="label" htmlFor="university_id">Writing on behalf of</label>
          <select id="university_id" name="university_id" className="field" value={uniId} onChange={(e) => { setUniId(e.target.value); setEventId(""); }}>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="university_id" value={uniId} />
      )}
      <div>
        <label className="label" htmlFor="event_id">About an event (optional)</label>
        <select id="event_id" name="event_id" className="field" value={eventId} onChange={(e) => setEventId(e.target.value)}>
          <option value="">General partnership</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.title} · {fmtDay(e.starts_at)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="subject">Subject</label>
        <input
          id="subject"
          name="subject"
          required
          minLength={3}
          maxLength={140}
          className="field"
          key={eventTitle ?? "general"}
          defaultValue={eventTitle ? `Sponsorship for ${eventTitle}` : mode === "university" ? `Partnership with ${sponsorName}` : "Sponsorship proposal"}
        />
      </div>
      <div>
        <label className="label" htmlFor="body">Message</label>
        <textarea
          id="body"
          name="body"
          required
          rows={5}
          maxLength={4000}
          className="field"
          placeholder={
            mode === "university"
              ? "Tell them about your event: audience size, dates, what you're looking for (cash, products, a stand…)."
              : "Introduce your company and what you'd like to offer this university's students."
          }
        />
      </div>
      {state.error && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-leaf py-3 font-bold text-ink active:scale-[0.98] disabled:opacity-60">
        {pending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Send message
      </button>
    </form>
  );
}
