import { requireUniRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addMember, removeMember } from "@/app/admin/actions";
import { ActionButton, ActionForm, SubmitButton } from "@/components/admin/kit";

export const metadata = { title: "Team" };

const ROLE_HELP = {
  admin: "Everything: events, team, sponsors, settings",
  organizer: "Create & manage events and ticket types",
  scanner: "Scan tickets at the gate only",
};

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { university, user } = await requireUniRole(slug, ["admin"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("university_members")
    .select("role, user_id, created_at, profiles(full_name, email)")
    .eq("university_id", university.id)
    .order("created_at");

  return (
    <main className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Role</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(data ?? []).map((m) => {
              const p = m.profiles as unknown as { full_name: string | null; email: string | null } | null;
              return (
                <tr key={m.user_id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{p?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted">{p?.email}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{m.role}</td>
                  <td className="px-4 py-3 text-right">
                    {m.user_id !== user.id && (
                      <ActionButton run={removeMember.bind(null, slug, m.user_id)} confirmText="Remove this member?" className="text-xs font-semibold text-danger hover:underline">
                        Remove
                      </ActionButton>
                    )}
                  </td>
                </tr>
              );
            })}
            {!data?.length && <tr><td colSpan={3} className="px-4 py-6 text-center text-muted">Only platform owners so far.</td></tr>}
          </tbody>
        </table>
      </section>

      <ActionForm action={addMember.bind(null, slug)} resetOnSuccess className="h-fit space-y-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-bold">Add a team member</h2>
        <p className="text-sm text-muted">They need to sign in to Connect once (Google or Microsoft) before you can add them.</p>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="field" placeholder="staff@university.edu" />
        </div>
        <fieldset className="space-y-2">
          <legend className="label">Role</legend>
          {(Object.keys(ROLE_HELP) as (keyof typeof ROLE_HELP)[]).map((r) => (
            <label key={r} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 has-[:checked]:border-leaf has-[:checked]:bg-leaf/10">
              <input type="radio" name="role" value={r} defaultChecked={r === "scanner"} className="mt-1 accent-[#52d483]" />
              <span>
                <span className="block font-semibold capitalize">{r}</span>
                <span className="block text-xs text-muted">{ROLE_HELP[r]}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <SubmitButton className="w-full">Add member</SubmitButton>
      </ActionForm>
    </main>
  );
}
