/** Connect mark: two linked rings forming a "C". */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#52D483" />
      <path d="M21.5 11.2a7 7 0 1 0 0 9.6" stroke="#07130C" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="22" cy="16" r="2.3" fill="#07130C" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="text-lg font-bold tracking-tight">
        connect<span className="text-leaf">.</span>
      </span>
    </span>
  );
}
