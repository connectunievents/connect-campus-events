import "server-only";
import Stripe from "stripe";

export type PaymentProvider = "demo" | "stripe";

export function paymentProvider(): PaymentProvider {
  const p = (process.env.PAYMENT_PROVIDER ?? "demo").toLowerCase();
  return p === "stripe" ? "stripe" : "demo";
}

let stripe: Stripe | null = null;
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  stripe ??= new Stripe(key);
  return stripe;
}
