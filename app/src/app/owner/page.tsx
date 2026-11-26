import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createUniversity, setUniversityActive } from "./actions";
import { ActionButton, ActionForm, SubmitButton } from "@/components/admin/kit";
import type { University } from "@/lib/types";

export const metadata = { title: "Owner console" };

export default async function OwnerUniversities() {
  const supabase = await createClient();
  const { data } = await supabase.from("universities").select("*").order("name");
  const unis = (data ?? []) as University[];

  return (
    <main className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-3">University</th><th className="hidden px-4 py-3 sm:table-cell">Domains</th><th className="px-4 py-3">Status</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {unis.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: u.brand_color ?? "#16542F" }} />
                    <span className="font-semibold">{u.name}</span>
                  </div>
                  <div className="text-xs text-muted">/{u.slug}</div>
                </td>
                <td className="hidden px-4 py-3 text-xs text-muted sm:table-cell">{u.email_domains.join(", ")}</td>
                <td className="px-4 py-3">
                  <ActionButton
                    run={setUniversityActive.bind(null, u.id, !u.is_active)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.is_active ? "bg-leaf/15 text-leaf" : "bg-surface-2 text-muted"}`}
                  >
                    {u.is_active ? "Active" : "Hidden"}
                  </ActionButton>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/${u.slug}`} className="text-sm font-semibold text-leaf hover:underline">Manage →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <ActionForm action={createUniversity} resetOnSuccess className="h-fit space-y-3 rounded-2xl border border-line card-glass p-5">
        <h2 className="font-bold">Onboard a university</h2>
        <div>
          <label className="label" htmlFor="u-name">Full name *</label>
          <input id="u-name" name="name" required className="field" placeholder="Lebanese American University" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="u-short">Short name</label>
            <input id="u-short" name="short_name" className="field" placeholder="LAU" />
          </div>
          <div>
            <label className="label" htmlFor="u-slug">URL slug</label>
            <input id="u-slug" name="slug" className="field" placeholder="lau" />
          </div>
          <div>
            <label className="label" htmlFor="u-city">City</label>
            <input id="u-city" name="city" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="u-country">Country</label>
            <input id="u-country" name="country" className="field" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="u-domains">Student email domains</label>
          <input id="u-domains" name="email_domains" className="field" placeholder="lau.edu.lb, lau.edu" />
        </div>
        <div className="grid grid-cols-[1fr_80px] gap-3">
          <div>
            <label className="label" htmlFor="u-web">Website</label>
            <input id="u-web" name="website_url" type="url" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="u-color">Color</label>
            <input id="u-color" name="brand_color" type="color" defaultValue="#16542F" className="field h-12 p-1" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="u-admin">First admin&apos;s email</label>
          <input id="u-admin" name="admin_email" type="email" className="field" placeholder="events@university.edu" />
          <p className="mt-1 text-xs text-muted">They must have signed in to Connect once.</p>
        </div>
        <SubmitButton className="w-full">Create university</SubmitButton>
      </ActionForm>
    </main>
  );
}
