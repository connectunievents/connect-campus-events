"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { toggleFollow } from "@/app/actions";

export function FollowButton({
  universityId,
  initial,
  signedIn,
  compact = false,
}: {
  universityId: string;
  initial: boolean;
  signedIn: boolean;
  compact?: boolean;
}) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      disabled={pending}
      onClick={() => {
        if (!signedIn) {
          router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
          return;
        }
        const next = !on;
        setOn(next);
        start(async () => {
          const res = await toggleFollow(universityId, next);
          if (res?.error) {
            setOn(!next);
            toast.error(res.error);
          } else if (next) toast.success("Following — you'll see their events first");
        });
      }}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold transition-colors ${
        compact ? "px-3 py-1.5 text-sm" : "px-4 py-2"
      } ${on ? "border border-leaf/50 bg-leaf/10 text-leaf" : "bg-leaf text-ink"}`}
      aria-pressed={on}
    >
      {on ? <Check size={16} /> : <Plus size={16} />}
      {on ? "Following" : "Follow"}
    </motion.button>
  );
}
