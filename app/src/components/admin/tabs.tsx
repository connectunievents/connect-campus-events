"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

export function AdminTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const path = usePathname();
  const base = tabs[0]?.href;
  const isActive = (href: string) => (href === base ? path === base || path.startsWith(`${base}/events`) : path.startsWith(href));
  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => {
        const on = isActive(t.href);
        return (
          <Link key={t.href} href={t.href} className={`relative px-4 py-2.5 text-sm font-semibold ${on ? "text-text" : "text-muted hover:text-text"}`}>
            {t.label}
            {on && <motion.span layoutId="admin-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-leaf" />}
          </Link>
        );
      })}
    </nav>
  );
}
