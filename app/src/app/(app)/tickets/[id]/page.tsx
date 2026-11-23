import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LiveTicket, type LiveTicketData } from "@/components/live-ticket";

export const metadata = { title: "Ticket" };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/tickets/${id}`);
  const supabase = await createClient();
  const { data: first } = await supabase.from("tickets").select("event_id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!first) notFound();

  // All of this user's tickets for the same event (swipe between them).
  const { data } = await supabase
    .from("tickets")
    .select("id, code, status, holder_name, checked_in_at, ticket_types(name), events(title, starts_at, ends_at, venue, campus, universities(name, short_name, brand_color))")
    .eq("user_id", user.id)
    .eq("event_id", first.event_id)
    .order("created_at");

  const tickets = (data ?? []) as unknown as LiveTicketData[];
  const start = Math.max(0, tickets.findIndex((t) => t.id === id));

  return (
    <main className="min-h-dvh">
      <header className="pt-safe flex items-center gap-3 px-4 pb-2 pt-3">
        <Link href="/tickets" className="rounded-full bg-surface p-2" aria-label="Back">
          <ArrowLeft size={20} />
        </Link>
        <span className="font-semibold">Your ticket{tickets.length > 1 ? "s" : ""}</span>
      </header>
      <LiveTicket tickets={tickets} startIndex={start} />
    </main>
  );
}
