import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, paymentProvider } from "@/lib/payments";
import { SITE_URL } from "@/lib/env";

const Body = z.object({ ticketTypeId: z.string().uuid(), quantity: z.number().int().min(1).max(20) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  // Reserves inventory atomically and enforces all rules inside Postgres.
  const { data: order, error } = await supabase.rpc("create_order", {
    p_ticket_type: parsed.data.ticketTypeId,
    p_quantity: parsed.data.quantity,
  });
  if (error || !order) return NextResponse.json({ error: error?.message ?? "Could not create order" }, { status: 400 });

  if (order.status === "free") {
    return NextResponse.json({ url: `/tickets?order=${order.id}` });
  }

  const admin = createAdminClient();

  if (paymentProvider() === "demo") {
    // Simulated payment for demos — no money moves.
    const { error: fErr } = await admin.rpc("fulfill_order", { p_order: order.id, p_provider: "demo", p_ref: `demo_${order.id}` });
    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });
    return NextResponse.json({ url: `/tickets?order=${order.id}&demo=1` });
  }

  try {
    const { data: info } = await admin
      .from("orders")
      .select("event_id, ticket_types(name, price_cents, currency), events(title, cover_url)")
      .eq("id", order.id)
      .single();
    const tt = info?.ticket_types as unknown as { name: string; price_cents: number; currency: string };
    const ev = info?.events as unknown as { title: string; cover_url: string | null };

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      client_reference_id: order.id,
      customer_email: (claims.claims.email as string | undefined) ?? undefined,
      line_items: [
        {
          quantity: order.quantity,
          price_data: {
            currency: tt.currency,
            unit_amount: tt.price_cents,
            product_data: { name: `${ev.title} — ${tt.name}`, images: ev.cover_url ? [ev.cover_url] : undefined },
          },
        },
      ],
      metadata: { order_id: order.id },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${SITE_URL}/tickets?order=${order.id}&paid=1`,
      cancel_url: `${SITE_URL}/e/${info?.event_id}?cancelled=1`,
    });
    await admin.from("orders").update({ provider: "stripe", provider_ref: session.id }).eq("id", order.id);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    await admin.rpc("fail_order", { p_order: order.id });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
