import { notFound } from "next/navigation";
import { requireUser, getMemberships } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Scanner } from "@/components/scanner";

export const metadata = { title: "Scanning" };

export default async function ScanEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  await requireUser(`/scan/${eventId}`);
  const supabase = await createClient();
  const { data: e } = await supabase.from("events").select("id, title, university_id, venue").eq("id", eventId).maybeSingle();
  if (!e) notFound();
  const memberships = await getMemberships();
  if (!memberships.some((m) => m.universities.id === e.university_id)) notFound();
  return <Scanner eventId={e.id} title={e.title} venue={e.venue} />;
}
