import Link from "next/link";
import { ExternalLink, Inbox } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getMySponsorProfile, getSponsorContact, getUnreadCount } from "@/lib/sponsors";
import { SponsorProfileForm } from "@/components/sponsor-profile-form";
import { PageTitle, buttonClass } from "@/components/ui";

export const metadata = { title: "Sponsor profile" };

export default async function SponsorHub() {
  await requireUser("/sponsor-hub");
  const profile = await getMySponsorProfile();
  const [contact, unread] = await Promise.all([profile ? getSponsorContact(profile.id) : Promise.resolve(null), getUnreadCount()]);

  return (
    <main className="animate-fade-up pb-10">
      <PageTitle
        title={profile ? "Your sponsor profile" : "Become a sponsor"}
        subtitle={profile ? "Keep it up to date — universities read this before reaching out." : "Create a free public profile so universities and clubs can find you and invite you to their events."}
      />
      {profile && (
        <div className="mx-4 mb-4 flex flex-wrap gap-2">
          <Link href={`/sponsors/${profile.slug}`} className={buttonClass("outline", "sm")}>
            <ExternalLink size={14} /> View public profile
          </Link>
          <Link href="/inbox" className={buttonClass("outline", "sm")}>
            <Inbox size={14} /> Inbox{unread ? ` (${unread})` : ""}
          </Link>
        </div>
      )}
      <SponsorProfileForm profile={profile} contact={contact} />
    </main>
  );
}
