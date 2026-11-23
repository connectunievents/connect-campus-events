import { requireUniRole } from "@/lib/auth";
import { saveEvent } from "@/app/admin/actions";
import { EventForm } from "@/components/admin/event-form";

export const metadata = { title: "New event" };

export default async function NewEvent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireUniRole(slug, ["admin", "organizer"]);
  return (
    <main>
      <h2 className="mb-4 text-2xl font-bold">New event</h2>
      <EventForm action={saveEvent.bind(null, slug, null)} />
    </main>
  );
}
