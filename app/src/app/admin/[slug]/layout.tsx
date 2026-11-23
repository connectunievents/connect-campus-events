import { requireUniRole } from "@/lib/auth";
import { AdminTabs } from "@/components/admin/tabs";
import { UniLogo } from "@/components/uni-logo";

export default async function UniAdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { university, role } = await requireUniRole(slug, ["admin", "organizer"]);
  const tabs = [
    { href: `/admin/${slug}`, label: "Events" },
    ...(role === "admin"
      ? [
          { href: `/admin/${slug}/team`, label: "Team" },
          { href: `/admin/${slug}/sponsors`, label: "Sponsors" },
          { href: `/admin/${slug}/settings`, label: "Settings" },
        ]
      : []),
  ];
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <UniLogo uni={university} size={44} />
        <div>
          <h1 className="text-xl font-bold leading-tight">{university.name}</h1>
          <p className="text-xs capitalize text-muted">{role} console</p>
        </div>
      </div>
      <AdminTabs tabs={tabs} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
