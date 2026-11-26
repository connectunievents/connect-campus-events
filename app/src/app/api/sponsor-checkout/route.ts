import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, paymentProvider } from "@/lib/payments";
import { SITE_URL } from "@/lib/env";

const Body = z.object({
  plan: z.enum(["week", "month", "quarter", "custom"]),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Buy a sponsor listing. Price and eligibility are enforced in Postgres (create_listing_order). */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { plan, start, end } = parsed.data;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  const { data: order, error } = await supabase.rpc("create_listing_order", {
    p_plan: plan,
    p_start: start,
    p_end: plan === "custom" ? end ?? null : null,
  });
  if (error || !order) return NextResponse.json({ error: error?.message ?? "Could not create the order" }, { status: 400 });

  const admin = createAdminClient();
  if (paymentProvider() === "demo" || order.amount_cents === 0) {
    const { error: fErr } = await admin.rpc("fulfill_listing", { p_listing: order.id, p_provider: "demo", p_ref: `demo_${order.id}` });
    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });
    return NextResponse.json({ url: `/sponsor-hub?paid=1&demo=1` });
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      client_reference_id: order.id,
      customer_email: (claims.claims.email as string | undefined) ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: order.currency,
            unit_amount: order.amount_cents,
            product_data: { name: `Connect sponsor listing — ${order.days} days` },
          },
        },
      ],
      metadata: { listing_id: order.id },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${SITE_URL}/sponsor-hub?paid=1`,
      cancel_url: `${SITE_URL}/sponsor-hub?cancelled=1`,
    });
    await admin.from("sponsor_listings").update({ provider: "stripe", provider_ref: session.id }).eq("id", order.id);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    await admin.rpc("fail_listing", { p_listing: order.id });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
