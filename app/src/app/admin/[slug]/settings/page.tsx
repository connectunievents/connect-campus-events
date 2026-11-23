import { requireUniRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveUniversity } from "@/app/admin/actions";
import { ActionForm, ImageUpload, SubmitButton } from "@/components/admin/kit";
import type { University } from "@/lib/types";

export const metadata = { title: "Settings" };

export default async function UniSettings({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { university } = await requireUniRole(slug, ["admin"]);
  const supabase = await createClient();
  const { data } = await supabase.from("universities").select("*").eq("id", university.id).single();
  const u = data as University;

  return (
    <ActionForm action={saveUniversity.bind(null, slug)} className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" defaultValue={u.name} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="short_name">Short name</label>
          <input id="short_name" name="short_name" defaultValue={u.short_name ?? ""} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="brand_color">Brand color</label>
          <input id="brand_color" name="brand_color" type="color" defaultValue={u.brand_color ?? "#16542F"} className="field h-12 p-1" />
        </div>
        <div>
          <label className="label" htmlFor="city">City</label>
          <input id="city" name="city" defaultValue={u.city ?? ""} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="country">Country</label>
          <input id="country" name="country" defaultValue={u.country ?? ""} className="field" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="website_url">Website</label>
          <input id="website_url" name="website_url" type="url" defaultValue={u.website_url ?? ""} className="field" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="email_domains">Student email domains</label>
          <input id="email_domains" name="email_domains" defaultValue={u.email_domains.join(", ")} className="field" placeholder="lau.edu.lb, lau.edu" />
          <p className="mt-1 text-xs text-muted">People signed in with these domains can see “students only” events and buy student tickets.</p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-4 rounded-2xl border border-line bg-surface p-5">
          <ImageUpload name="cover_url" defaultValue={u.cover_url} label="Cover photo" />
          <ImageUpload name="logo_url" defaultValue={u.logo_url} label="Logo" aspect="aspect-square" />
        </div>
        <SubmitButton className="w-full py-3">Save</SubmitButton>
      </div>
    </ActionForm>
  );
}
