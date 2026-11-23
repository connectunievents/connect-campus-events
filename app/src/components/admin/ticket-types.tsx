"use client";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ActionButton, ActionForm, SubmitButton } from "./kit";
import { deleteTicketType, saveTicketType } from "@/app/admin/actions";
import { money, toLocalInput } from "@/lib/format";
import type { TicketType } from "@/lib/types";

function Fields({ t }: { t?: TicketType }) {
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <div className="sm:col-span-2">
        <label className="label">Name *</label>
        <input name="name" required defaultValue={t?.name} className="field" placeholder="Student" />
      </div>
      <div>
        <label className="label">Price</label>
        <input name="price" type="number" step="0.01" min="0" defaultValue={t ? t.price_cents / 100 : 0} className="field" />
      </div>
      <div>
        <label className="label">Currency</label>
        <select name="currency" defaultValue={t?.currency ?? "usd"} className="field">
          <option value="usd">USD</option>
          <option value="eur">EUR</option>
          <option value="lbp">LBP</option>
          <option value="gbp">GBP</option>
        </select>
      </div>
      <div>
        <label className="label">Quantity</label>
        <input name="quantity" type="number" min={t?.sold ?? 0} defaultValue={t?.quantity ?? 100} className="field" />
      </div>
      <div>
        <label className="label">Max / person</label>
        <input name="max_per_order" type="number" min={1} max={20} defaultValue={t?.max_per_order ?? 4} className="field" />
      </div>
      <div className="sm:col-span-3">
        <label className="label">Description</label>
        <input name="description" defaultValue={t?.description ?? ""} className="field" placeholder="Valid university ID required at the gate" />
      </div>
      <div>
        <label className="label">Sales start</label>
        <input name="sales_start" type="datetime-local" defaultValue={toLocalInput(t?.sales_start)} className="field" suppressHydrationWarning />
      </div>
      <div>
        <label className="label">Sales end</label>
        <input name="sales_end" type="datetime-local" defaultValue={toLocalInput(t?.sales_end)} className="field" suppressHydrationWarning />
      </div>
      <label className="flex items-end gap-2 pb-3 text-sm">
        <input type="checkbox" name="students_only" defaultChecked={t?.students_only} className="h-4 w-4 accent-[#52d483]" />
        Uni email required
      </label>
    </div>
  );
}

export function TicketTypesManager({ slug, eventId, types }: { slug: string; eventId: string; types: TicketType[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(types.length === 0);
  return (
    <div className="space-y-3">
      {types.map((t) =>
        editing === t.id ? (
          <ActionForm key={t.id} action={saveTicketType.bind(null, slug, eventId, t.id)} className="space-y-3 rounded-2xl border border-leaf/50 bg-surface p-4">
            <Fields t={t} />
            <div className="flex gap-2">
              <SubmitButton>Save</SubmitButton>
              <button type="button" onClick={() => setEditing(null)} className="rounded-xl px-4 py-2 text-muted hover:text-text">Close</button>
            </div>
          </ActionForm>
        ) : (
          <div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
            <div>
              <div className="font-semibold">
                {t.name} <span className="ml-2 text-leaf">{money(t.price_cents, t.currency)}</span>
              </div>
              <div className="text-xs text-muted">
                {t.sold} sold of {t.quantity} · max {t.max_per_order}/person{t.students_only ? " · uni email required" : ""}
              </div>
              <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full bg-leaf" style={{ width: `${t.quantity ? Math.min(100, (t.sold / t.quantity) * 100) : 0}%` }} />
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing(t.id)} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text" aria-label="Edit">
                <Pencil size={16} />
              </button>
              {t.sold === 0 && (
                <ActionButton run={deleteTicketType.bind(null, slug, eventId, t.id)} confirmText={`Delete “${t.name}”?`} className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger">
                  <Trash2 size={16} />
                </ActionButton>
              )}
            </div>
          </div>
        ),
      )}
      {adding ? (
        <ActionForm action={saveTicketType.bind(null, slug, eventId, null)} resetOnSuccess className="space-y-3 rounded-2xl border border-dashed border-leaf/50 bg-surface p-4">
          <Fields />
          <div className="flex gap-2">
            <SubmitButton>Add ticket type</SubmitButton>
            <button type="button" onClick={() => setAdding(false)} className="rounded-xl px-4 py-2 text-muted hover:text-text">Cancel</button>
          </div>
        </ActionForm>
      ) : (
        <button onClick={() => setAdding(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line p-4 font-semibold text-muted hover:border-leaf hover:text-leaf">
          <Plus size={18} /> Add ticket type
        </button>
      )}
    </div>
  );
}
