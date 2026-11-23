"use client";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

export function ShareButton({ title }: { title: string }) {
  return (
    <button
      onClick={async () => {
        const url = location.href;
        if (navigator.share) {
          await navigator.share({ title, url }).catch(() => undefined);
        } else {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied");
        }
      }}
      className="rounded-full bg-ink/60 p-2 backdrop-blur"
      aria-label="Share"
    >
      <Share2 size={20} />
    </button>
  );
}
