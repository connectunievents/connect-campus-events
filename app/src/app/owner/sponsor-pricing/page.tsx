import { createClient } from "@/lib/supabase/server";
import { ActionForm, SubmitButton } from "@/components/admin/kit";
import { updatePlan } from "@/app/(app)/sponsor-hub/actions";
import { money } from "@/lib/format";
import type { ListingPlan } from "@/lib/types";

export const metadata = { title: "Sponsor pricing" };

export default async function SponsorPricing() {
  const supabase = await createClient();
  const { data } = await supabase.from("listing_plans").select("*").order("sort_order");
  const plans = (data ?? []) as ListingPlan[];
  return (
    <main>
      <p className="mb-4 text-sm text-muted">
        What verified sponsors pay to appear in the directory. The custom plan is priced per day, with 15% off for 30+ days and 25% off for 90+ days.
        Changes apply to new purchases only.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <ActionForm key={p.id} action={updatePlan.bind(null, p.id)} className="card-glass space-y-3 rounded-[var(--radius-card)] border border-line p-5">
            <div>
              <div className="font-bold">{p.name}</div>
              <div className="text-xs text-muted">{p.days ? `${p.days} days` : "Price per day"} · now {money(p.price_cents, p.currency)}</div>
            </div>
            <div>
              <label className="label" htmlFor={`price-${p.id}`}>Price (USD){p.days ? "" : " per day"}</label>
              <input id={`price-${p.id}`} name="price" type="number" min={0} step="0.01" defaultValue={p.price_cents / 100} className="field" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_active" defaultChecked={p.is_active} className="h-4 w-4 accent-[#52d483]" /> Offered
            </label>
            <SubmitButton className="w-full">Save</SubmitButton>
          </ActionForm>
        ))}
      </div>
    </main>
  );
}
