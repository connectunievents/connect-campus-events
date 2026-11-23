"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Compass, Home, Ticket, UserRound } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function BottomNav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.6rem)" }}
      aria-label="Main"
    >
      <div className="glass flex items-center justify-around rounded-2xl border border-line px-2 py-1.5 shadow-xl shadow-black/40">
        {TABS.map(({ href, label, icon: Icon }) => {
          const on = active(href);
          return (
            <Link key={href} href={href} className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5" aria-current={on ? "page" : undefined}>
              {on && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl bg-leaf/12"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <Icon size={22} strokeWidth={on ? 2.4 : 1.8} className={on ? "text-leaf" : "text-muted"} />
              <span className={`text-[11px] font-semibold ${on ? "text-leaf" : "text-muted"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
