"use server";
import { z } from "zod";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";

export type InquiryState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

const Schema = z.object({
  company_name: z.string().trim().min(2, "Too short").max(120),
  contact_name: z.string().trim().min(2, "Too short").max(120),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  website_url: z.string().trim().url("Include https://").optional().or(z.literal("")),
  budget_range: z.string().max(40).optional().or(z.literal("")),
  university_id: z.string().uuid().optional().or(z.literal("")),
  preferred_contact: z.enum(["email", "phone"]).default("email"),
  message: z.string().trim().min(10, "Tell us a bit more (10+ characters)").max(4000),
});

export async function submitSponsorInquiry(_prev: InquiryState, form: FormData): Promise<InquiryState> {
  const values = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  if (values.website2) return { ok: true }; // honeypot hit — pretend success

  const parsed = Schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors, values };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("sponsor_inquiries").insert({
    company_name: d.company_name,
    contact_name: d.contact_name,
    email: d.email,
    phone: d.phone || null,
    website_url: d.website_url || null,
    budget_range: d.budget_range || null,
    university_id: d.university_id || null,
    preferred_contact: d.preferred_contact,
    message: d.message,
  });
  if (error) return { error: "Could not send right now. Please try again.", values };

  // Optional email alert to the owners.
  const key = process.env.RESEND_API_KEY;
  const to = process.env.OWNER_NOTIFY_EMAIL;
  if (key && to) {
    try {
      await new Resend(key).emails.send({
        from: process.env.EMAIL_FROM ?? "Connect <onboarding@resend.dev>",
        to: to.split(",").map((s) => s.trim()),
        replyTo: d.email,
        subject: `New sponsor inquiry: ${d.company_name}`,
        text: `${d.contact_name} <${d.email}>${d.phone ? ` · ${d.phone}` : ""}\nPrefers: ${d.preferred_contact}\nBudget: ${d.budget_range || "—"}\nWebsite: ${d.website_url || "—"}\n\n${d.message}\n\nManage: ${SITE_URL}/owner/inquiries`,
      });
    } catch {
      // The inquiry is saved; email is best-effort.
    }
  }
  return { ok: true };
}
