"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Lock, Send, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { deleteDocument, recordDocument, saveBusinessDetails, submitForReview, type VerifyState } from "@/app/(app)/sponsor-hub/actions";
import { DOCUMENT_KINDS } from "@/lib/types";

type Doc = { id: string; kind: string; file_name: string; uploaded_at: string };

const COUNTRIES = ["Lebanon", "United Arab Emirates", "Saudi Arabia", "Qatar", "Jordan", "Egypt", "Cyprus", "France", "United Kingdom", "United States", "Other"];

export function SponsorVerify({
  status,
  details,
  documents,
}: {
  status: "draft" | "pending" | "approved" | "rejected";
  details: { legal_name: string | null; registration_number: string | null; registration_country: string | null };
  documents: Doc[];
}) {
  const locked = status === "pending" || status === "approved";
  const [state, action, pending] = useActionState<VerifyState, FormData>(saveBusinessDetails, {});
  const [submitting, startSubmit] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) toast.success(state.message ?? "Saved");
  }, [state]);

  const hasRegistration = documents.some((d) => d.kind === "registration");
  const detailsDone = Boolean(details.legal_name && details.registration_number && details.registration_country);

  return (
    <div className="space-y-4">
      <form action={action} className="card-glass space-y-4 rounded-[var(--radius-card)] border border-line p-5">
        <div>
          <h3 className="font-bold">Business details</h3>
          <p className="text-sm text-muted">As written on your official registration documents.</p>
        </div>
        <div>
          <label className="label" htmlFor="legal_name">Registered legal name *</label>
          <input id="legal_name" name="legal_name" required defaultValue={details.legal_name ?? ""} className="field" placeholder="Cedar Coffee S.A.R.L." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="registration_number">Commercial registration / licence no. *</label>
            <input id="registration_number" name="registration_number" required defaultValue={details.registration_number ?? ""} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="registration_country">Country of registration *</label>
            <select id="registration_country" name="registration_country" required defaultValue={details.registration_country ?? ""} className="field">
              <option value="" disabled>Choose…</option>
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        {status === "approved" && (
          <p className="rounded-xl bg-warn/10 p-3 text-xs text-warn">Changing these details sends your business back to review, and it stays hidden until it is approved again.</p>
        )}
        <button disabled={pending || status === "pending"} className="flex min-h-11 items-center justify-center gap-2 rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 font-semibold disabled:opacity-50">
          {pending && <Loader2 size={16} className="animate-spin" />} Save details
        </button>
      </form>

      <div className="card-glass space-y-3 rounded-[var(--radius-card)] border border-line p-5">
        <div>
          <h3 className="font-bold">Proof of business</h3>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Lock size={14} /> Stored privately. Only the Connect review team can open these files.
          </p>
        </div>
        {DOCUMENT_KINDS.map((k) => (
          <DocumentSlot key={k.id} kind={k.id} label={k.label} required={k.required} docs={documents.filter((d) => d.kind === k.id)} locked={locked} onChange={() => router.refresh()} />
        ))}
      </div>

      {(status === "draft" || status === "rejected") && (
        <button
          disabled={submitting || !detailsDone || !hasRegistration}
          onClick={() =>
            startSubmit(async () => {
              const r = await submitForReview();
              if (r.error) toast.error(r.error);
              else {
                toast.success(r.message ?? "Submitted");
                router.refresh();
              }
            })
          }
          className="flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-[1.25rem] bg-leaf text-lg font-bold text-ink active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? <Loader2 className="animate-spin" /> : <Send size={20} />} Submit for verification
        </button>
      )}
      {(status === "draft" || status === "rejected") && (!detailsDone || !hasRegistration) && (
        <p className="text-center text-xs text-muted">Save your business details and upload your commercial registration to submit.</p>
      )}
    </div>
  );
}

function DocumentSlot({ kind, label, required, docs, locked, onChange }: { kind: string; label: string; required: boolean; docs: Doc[]; locked: boolean; onChange: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (file.size > 10 * 1024 * 1024) return toast.error("Max 10 MB per file");
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: c } = await supabase.auth.getClaims();
      const uid = c?.claims?.sub;
      if (!uid) throw new Error("Please sign in again");
      const ext = (file.name.split(".").pop() ?? "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("sponsor-docs").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error(error.message.includes("mime") ? "Upload a PDF or image (JPG, PNG, HEIC)" : error.message);
      const r = await recordDocument(kind, path, file.name);
      if (r.error) throw new Error(r.error);
      toast.success("Document uploaded");
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-line p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">
            {label} {required && <span className="text-danger">*</span>}
          </div>
          {docs.length === 0 && <div className="text-xs text-muted">PDF or photo, up to 10 MB</div>}
        </div>
        {!locked && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-[0.9rem] bg-leaf/15 px-3 text-sm font-semibold text-leaf disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload
          </button>
        )}
      </div>
      {docs.map((d) => (
        <DocRow key={d.id} d={d} locked={locked} onChange={onChange} />
      ))}
      <input ref={input} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
    </div>
  );
}

function DocRow({ d, locked, onChange }: { d: Doc; locked: boolean; onChange: () => void }) {
  const [busy, start] = useTransition();
  return (
    <div className="mt-2 flex items-center gap-2 rounded-xl bg-surface-2/60 px-3 py-2 text-sm">
      <FileText size={16} className="shrink-0 text-leaf" />
      <span className="min-w-0 flex-1 truncate">{d.file_name}</span>
      {!locked && (
        <button
          type="button"
          aria-label={`Remove ${d.file_name}`}
          disabled={busy}
          onClick={() =>
            start(async () => {
              const r = await deleteDocument(d.id);
              if (r.error) toast.error(r.error);
              else onChange();
            })
          }
          className="text-muted hover:text-danger"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      )}
    </div>
  );
}
