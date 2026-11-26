import Link from "next/link";
import { Eye, MapPin, Megaphone, Sparkles, Store, Users } from "lucide-react";
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
        <p className="mt-2 text-muted">Two ways to work with students on Connect:</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/sponsor-hub" className="squircle-lg group border border-leaf/40 bg-gradient-to-br from-leaf/15 to-transparent p-5 transition hover:border-leaf">
          <Store className="text-leaf" />
          <p className="mt-2 text-lg font-bold">Get verified &amp; listed as a sponsor</p>
          <p className="mt-1 text-sm text-muted">
            Verify your business with official documents, choose a listing package (1 week, 1 month, 3 months or custom dates) and appear in the <b className="text-text">sponsors directory</b>, where universities and clubs message you about their events.
          </p>
          <span className="mt-3 inline-block text-sm font-semibold text-leaf group-hover:underline">Get started →</span>
        </Link>
        <a href="#advertise" className="squircle-lg group border border-line card-glass p-5 transition hover:border-leaf/60">
          <Megaphone className="text-leaf" />
          <p className="mt-2 text-lg font-bold">Advertise on Connect</p>
          <p className="mt-1 text-sm text-muted">Logo placement across the app or on one campus. Tell us your goals and our team will contact you.</p>
          <span className="mt-3 inline-block text-sm font-semibold text-leaf group-hover:underline">Contact our team ↓</span>
        </a>
      </div>
      <p className="mt-3 text-center text-sm text-muted">
        Looking for sponsors for your event? <Link href="/sponsors" className="font-semibold text-leaf">Browse the directory</Link>
      </p>

      <h2 id="advertise" className="mt-10 scroll-mt-6 text-xl font-bold">Advertise on Connect</h2>
      <p className="mt-1 text-sm text-muted">Our partnerships team replies by email or phone within 2 business days.</p>

      <div className="grid gap-3 sm:grid-cols-3">
        {perks.map((p) => (
          <div key={p.title} className="rounded-2xl border border-line card-glass p-4">
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
