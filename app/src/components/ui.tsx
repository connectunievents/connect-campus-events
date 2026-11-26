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
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold duration-200 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50",
    size === "sm" && "min-h-9 rounded-[0.9rem] px-3.5 text-sm",
    size === "md" && "min-h-11 rounded-[1.1rem] px-4",
    size === "lg" && "min-h-[3.25rem] rounded-[1.25rem] px-5 text-lg",
    variant === "primary" && "bg-leaf text-ink shadow-[0_8px_24px_-8px_rgb(82_212_131/0.55),inset_0_1px_0_rgb(255_255_255/0.35)] hover:bg-pale",
    variant === "ghost" && "text-text hover:bg-surface-2",
    variant === "outline" && "border border-white/10 bg-white/[0.04] text-text shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] hover:border-leaf/60 hover:text-leaf",
    variant === "danger" && "bg-danger/15 text-danger hover:bg-danger/25",
  );
}

export function Button({ variant, size, className, ...rest }: BtnProps) {
  return <button {...rest} className={clsx(buttonClass(variant, size), className)} />;
}

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div {...rest} className={clsx("card-glass rounded-[var(--radius-card)] border border-line", className)} />;
}

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="pt-safe flex items-end justify-between gap-3 px-4 pb-4">
      <div className="min-w-0">
        <h1 className="text-[clamp(1.6rem,7vw,2.1rem)] font-bold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
