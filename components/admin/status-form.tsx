/** Inline status + internal-notes editor used by the lead managers.
 *  Renders a <form> bound to a server action (no client JS needed). */
export function StatusForm({
  action,
  statuses,
  current,
  notes,
}: {
  action: (fd: FormData) => void | Promise<void>;
  statuses: string[];
  current: string;
  notes: string | null;
}) {
  const ctrl =
    "rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15";
  return (
    <form action={action} className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end">
      <label className="flex flex-col gap-1 text-xs font-medium text-slate">
        Status
        <select name="status" defaultValue={current} className={`${ctrl} h-10`}>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-slate">
        Internal notes
        <input name="internal_notes" defaultValue={notes ?? ""} className={`${ctrl} h-10`} placeholder="Add a note…" />
      </label>
      <button
        type="submit"
        className="h-10 rounded-md bg-navy px-5 text-sm font-semibold text-white hover:bg-navy-800"
      >
        Save
      </button>
    </form>
  );
}
