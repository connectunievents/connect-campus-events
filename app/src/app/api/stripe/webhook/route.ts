import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe → (checkout.session.completed | checkout.session.expired) → fulfil or release the order.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await req.text(), sig, secret);
  } catch (err) {
    return NextResponse.json({ error: `Bad signature: ${(err as Error).message}` }, { status: 400 });
  }

  const admin = createAdminClient();
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status === "paid" && s.metadata?.order_id) {
      const { error } = await admin.rpc("fulfill_order", { p_order: s.metadata.order_id, p_provider: "stripe", p_ref: s.id });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.metadata?.order_id) await admin.rpc("fail_order", { p_order: s.metadata.order_id });
  }
  return NextResponse.json({ received: true });
}
