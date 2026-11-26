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

/** Floating liquid-glass tab bar that sits above the home indicator on any phone. */
export function BottomNav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <nav className="bottom-nav fixed inset-x-0 z-40 mx-auto w-full max-w-md px-3 md:max-w-lg" aria-label="Main">
      <div className="glass flex h-[4.5rem] items-center justify-around rounded-[2rem] border px-1.5">
        {TABS.map(({ href, label, icon: Icon }) => {
          const on = active(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch
              className="relative flex h-[3.75rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.6rem] active:scale-[0.94]"
              aria-current={on ? "page" : undefined}
            >
              {on && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-[1.6rem] bg-white/[0.09] shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]"
                  transition={{ type: "spring", stiffness: 520, damping: 42, mass: 0.8 }}
                />
              )}
              <Icon size={23} strokeWidth={on ? 2.3 : 1.8} className={`relative ${on ? "text-leaf" : "text-muted"}`} />
              <span className={`relative text-[0.7rem] font-semibold ${on ? "text-leaf" : "text-muted"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
