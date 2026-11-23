import Link from "next/link";
import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";

export function SectionHeader({ title, href, action }: { title: string; href?: string; action?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between px-4">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {href && (
        <Link href={href} className="text-sm font-semibold text-leaf">
          {action ?? "See all"}
        </Link>
      )}
    </div>
  );
}

export function Rail({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2">{children}</div>;
}

export function EmptyState({ icon, title, body, children }: { icon?: ReactNode; title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="mx-4 flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="mb-3 text-leaf">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-xs text-sm text-muted">{body}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

type BtnProps = ComponentProps<"button"> & { variant?: "primary" | "ghost" | "outline" | "danger"; size?: "sm" | "md" | "lg" };

export function buttonClass(variant: BtnProps["variant"] = "primary", size: BtnProps["size"] = "md") {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    size === "sm" && "px-3 py-1.5 text-sm",
    size === "md" && "px-4 py-2.5",
    size === "lg" && "px-5 py-3.5 text-lg",
    variant === "primary" && "bg-leaf text-ink hover:bg-pale shadow-lg shadow-leaf/20",
    variant === "ghost" && "text-text hover:bg-surface-2",
    variant === "outline" && "border border-line text-text hover:border-leaf hover:text-leaf",
    variant === "danger" && "bg-danger/15 text-danger hover:bg-danger/25",
  );
}

export function Button({ variant, size, className, ...rest }: BtnProps) {
  return <button {...rest} className={clsx(buttonClass(variant, size), className)} />;
}

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div {...rest} className={clsx("rounded-[var(--radius-card)] border border-line bg-surface", className)} />;
}

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="pt-safe flex items-end justify-between gap-3 px-4 pb-4 pt-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
