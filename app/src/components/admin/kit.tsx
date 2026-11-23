"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { FormState } from "@/app/admin/actions";

/** Form bound to a server action with toast feedback. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: (prev: FormState, f: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) {
      toast.success(state.message ?? "Saved");
      if (resetOnSuccess) ref.current?.reset();
    }
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className} data-pending={pending || undefined}>
      <TzOffset />
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}

/** Sends the browser's timezone so datetime-local inputs are stored correctly. */
export function TzOffset() {
  const [v, setV] = useState("0");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only value, read after hydration
  useEffect(() => setV(String(new Date().getTimezoneOffset())), []);
  return <input type="hidden" name="tz_offset" value={v} />;
}

export function SubmitButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <button
      type="submit"
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-2.5 font-semibold text-ink transition active:scale-[0.97] disabled:opacity-60 in-data-pending:opacity-70 ${className}`}
    >
      <Loader2 size={16} className="hidden animate-spin in-data-pending:inline" />
      {children}
    </button>
  );
}

/** Button that runs a server action, optionally after a confirm. */
export function ActionButton({
  run,
  children,
  confirmText,
  className = "",
  success,
}: {
  run: () => Promise<{ ok?: boolean; error?: string } | void>;
  children: React.ReactNode;
  confirmText?: string;
  className?: string;
  success?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-1.5 disabled:opacity-50 ${className}`}
      onClick={() => {
        if (confirmText && !confirm(confirmText)) return;
        start(async () => {
          const r = await run();
          if (r && r.error) toast.error(r.error);
          else {
            if (success) toast.success(success);
            router.refresh();
          }
        });
      }}
    >
      {pending && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

/** Uploads to Supabase Storage (bucket "media") and stores the public URL in a hidden input. */
export function ImageUpload({ name, defaultValue, label, aspect = "aspect-[16/9]" }: { name: string; defaultValue?: string | null; label: string; aspect?: string }) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5 MB");
    setBusy(true);
    const supabase = createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const uid = claims?.claims?.sub;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${uid}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
    setBusy(false);
    if (error) return toast.error(error.message);
    setUrl(supabase.storage.from("media").getPublicUrl(path).data.publicUrl);
  }

  return (
    <div>
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div
        className={`relative flex ${aspect} w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-surface-2 text-muted hover:border-leaf`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) upload(f);
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : busy ? (
          <Loader2 className="animate-spin" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-sm">
            <ImagePlus /> Tap or drop an image
          </span>
        )}
        {url && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setUrl("");
            }}
            className="absolute right-2 top-2 rounded-full bg-ink/70 p-1"
            aria-label="Remove image"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <input
        type="url"
        placeholder="…or paste an image URL"
        className="field mt-2 text-sm"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
    </div>
  );
}
