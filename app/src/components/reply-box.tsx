"use client";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, type SponsorFormState } from "@/app/(app)/sponsors/actions";

/** Composer for a sponsor/university conversation; refreshes live when the other side replies. */
export function ReplyBox({ threadId }: { threadId: string }) {
  const [state, action, pending] = useActionState<SponsorFormState, FormData>(sendMessage.bind(null, threadId), {});
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.ok) form.current?.reset();
  }, [state]);

  // Realtime: refresh when a new message lands in this thread.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`thread-${threadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sponsor_messages", filter: `thread_id=eq.${threadId}` }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, router]);

  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight });
  }, []);

  return (
    <form
      ref={form}
      action={action}
      className="glass sticky bottom-[calc(var(--nav-h)+var(--safe-bottom))] z-20 mx-3 mb-3 flex items-end gap-2 squircle-lg border border-line p-2"
    >
      <textarea
        name="body"
        required
        rows={1}
        maxLength={4000}
        placeholder="Write a message…"
        className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 outline-none placeholder:text-muted/70 [field-sizing:content]"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) form.current?.requestSubmit();
        }}
      />
      <button disabled={pending} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-leaf text-ink active:scale-95 disabled:opacity-60" aria-label="Send">
        {pending ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={20} />}
      </button>
    </form>
  );
}
