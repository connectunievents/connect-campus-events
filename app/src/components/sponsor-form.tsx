"use client";
import { useActionState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { submitSponsorInquiry, type InquiryState } from "@/app/(app)/sponsor/actions";

export function SponsorForm({ universities }: { universities: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(submitSponsorInquiry, {});

  if (state.ok) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="my-8 flex flex-col items-center rounded-[var(--radius-card)] border border-leaf/40 bg-leaf/10 p-8 text-center"
      >
        <CheckCircle2 size={56} className="text-leaf" />
        <p className="mt-3 text-xl font-bold">Thanks — we got it!</p>
        <p className="mt-1 text-muted">Our partnerships team will contact you soon.</p>
      </motion.div>
    );
  }

  const err = (k: string) => state.fieldErrors?.[k] && <p className="mt-1 text-xs text-danger">{state.fieldErrors[k]}</p>;

  return (
    <form action={action} className="my-8 space-y-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
      {/* Honeypot: bots fill this, humans never see it. */}
      <input type="text" name="website2" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="company_name">Company *</label>
          <input id="company_name" name="company_name" required className="field" defaultValue={state.values?.company_name} />
          {err("company_name")}
        </div>
        <div>
          <label className="label" htmlFor="contact_name">Your name *</label>
          <input id="contact_name" name="contact_name" required className="field" defaultValue={state.values?.contact_name} />
          {err("contact_name")}
        </div>
        <div>
          <label className="label" htmlFor="email">Work email *</label>
          <input id="email" name="email" type="email" required className="field" defaultValue={state.values?.email} />
          {err("email")}
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" className="field" defaultValue={state.values?.phone} />
        </div>
        <div>
          <label className="label" htmlFor="website_url">Website</label>
          <input id="website_url" name="website_url" type="url" placeholder="https://" className="field" defaultValue={state.values?.website_url} />
          {err("website_url")}
        </div>
        <div>
          <label className="label" htmlFor="budget_range">Budget</label>
          <select id="budget_range" name="budget_range" className="field" defaultValue={state.values?.budget_range ?? ""}>
            <option value="">Not sure yet</option>
            <option>Under $500</option>
            <option>$500 – $2,000</option>
            <option>$2,000 – $10,000</option>
            <option>$10,000+</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="university_id">Where do you want to appear?</label>
          <select id="university_id" name="university_id" className="field" defaultValue={state.values?.university_id ?? ""}>
            <option value="">All universities</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="message">Tell us about your goals *</label>
          <textarea id="message" name="message" required rows={4} className="field" defaultValue={state.values?.message} placeholder="Products, audience, campaigns, dates…" />
          {err("message")}
        </div>
        <fieldset className="sm:col-span-2">
          <legend className="label">Preferred contact</legend>
          <div className="flex gap-3">
            {["email", "phone"].map((v) => (
              <label key={v} className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-line p-3 capitalize has-[:checked]:border-leaf has-[:checked]:bg-leaf/10">
                <input type="radio" name="preferred_contact" value={v} defaultChecked={v === (state.values?.preferred_contact ?? "email")} className="accent-[#52d483]" />
                {v}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      {state.error && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-leaf py-3.5 font-bold text-ink active:scale-[0.98] disabled:opacity-60">
        {pending ? <Loader2 className="animate-spin" size={20} /> : <Send size={18} />} Send to the Connect team
      </button>
    </form>
  );
}
