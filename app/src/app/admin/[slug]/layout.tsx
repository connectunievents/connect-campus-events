import { requireUniRole } from "@/lib/auth";
import { AdminTabs } from "@/components/admin/tabs";

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
        <span
          className="flex h-11 w-11 items-center justify-center rounded-xl text-xs font-extrabold text-white"
          style={{ background: `linear-gradient(145deg, ${university.brand_color ?? "#16542F"}, #07130c)` }}
        >
          {university.short_name ?? university.name.slice(0, 3)}
        </span>
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
