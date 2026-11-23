import { Eye, MapPin, Sparkles, Users } from "lucide-react";
import { searchUniversities } from "@/lib/queries";
import { SponsorForm } from "@/components/sponsor-form";

export const metadata = { title: "Become a sponsor" };

export default async function SponsorPage() {
  const unis = await searchUniversities(undefined, 100);
  const perks = [
    { icon: <Eye size={20} />, title: "Logo on every screen", body: "Home feed, university pages and event pages." },
    { icon: <Users size={20} />, title: "Reach students directly", body: "Target one campus or every university on Connect." },
    { icon: <MapPin size={20} />, title: "Event partnerships", body: "Present a concert, hackathon or career fair." },
  ];
  return (
    <main className="animate-fade-up px-4">
      <header className="pt-safe pb-6 pt-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf/12 px-3 py-1 text-xs font-semibold text-leaf">
          <Sparkles size={14} /> Sponsorships
        </span>
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight">
          Put your brand <span className="font-display italic text-leaf">on campus.</span>
        </h1>
        <p className="mt-2 text-muted">Tell us about your company. Our team will reach out by email or phone within 2 business days.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {perks.map((p) => (
          <div key={p.title} className="rounded-2xl border border-line bg-surface p-4">
            <span className="text-leaf">{p.icon}</span>
            <p className="mt-2 font-semibold">{p.title}</p>
            <p className="text-sm text-muted">{p.body}</p>
          </div>
        ))}
      </div>

      <SponsorForm universities={unis.map((u) => ({ id: u.id, name: u.name }))} />
    </main>
  );
}
