import { inputCls } from "@/components/admin/form-kit";
import { KEY_ITEMS, FURNITURE_ITEMS, APPLIANCE_ITEMS, FIXTURE_ITEMS, CONDITION_AREAS } from "@/lib/pm/annex-b-fields";

type QtyCond = { qty?: string; condition?: string; remarks?: string; brand?: string };
type AnnexBValue = {
  keys?: Record<string, QtyCond>;
  furniture?: Record<string, QtyCond>;
  appliances?: Record<string, QtyCond>;
  fixtures?: string[];
  conditionReport?: Record<string, string>;
} | null;

function QtyCondRow({
  prefix, id, label, fields, values,
}: {
  prefix: string; id: string; label: string;
  fields: { key: string; placeholder: string }[];
  values?: QtyCond;
}) {
  return (
    <div className="grid grid-cols-[1fr_repeat(2,140px)] items-center gap-2 border-b border-line py-2 last:border-0">
      <span className="text-sm text-ink">{label}</span>
      {fields.map((f) => (
        <input
          key={f.key}
          name={`${prefix}_${id}_${f.key}`}
          placeholder={f.placeholder}
          defaultValue={values?.[f.key as keyof QtyCond]}
          className={`${inputCls} h-9`}
        />
      ))}
    </div>
  );
}

export function AnnexBForm({ action, initial }: { action: (fd: FormData) => void | Promise<void>; initial: AnnexBValue }) {
  return (
    <details className="rounded-lg border border-line bg-surface">
      <summary className="cursor-pointer select-none px-5 py-4 font-display text-sm font-semibold text-navy">
        Pre-fill Inventory (Annex B) — optional, only if a walkthrough was already done
      </summary>
      <form action={action} className="flex flex-col gap-6 border-t border-line p-5">
        <p className="text-xs text-slate">
          Leave everything blank to print the original blank checklist template (to be completed in person at
          turnover). Fill in only what you already inspected.
        </p>

        <input type="hidden" name="key_ids" value={KEY_ITEMS.map(([id]) => id).join(",")} />
        <div>
          <h3 className="mb-2 text-sm font-semibold text-navy">Keys and Access</h3>
          {KEY_ITEMS.map(([id, label]) => (
            <QtyCondRow
              key={id} prefix="key" id={id} label={label} values={initial?.keys?.[id]}
              fields={[{ key: "qty", placeholder: "Qty" }, { key: "remarks", placeholder: "Remarks" }]}
            />
          ))}
        </div>

        <input type="hidden" name="furniture_ids" value={FURNITURE_ITEMS.map(([id]) => id).join(",")} />
        <div>
          <h3 className="mb-2 text-sm font-semibold text-navy">Furniture</h3>
          {FURNITURE_ITEMS.map(([id, label]) => (
            <QtyCondRow
              key={id} prefix="furniture" id={id} label={label} values={initial?.furniture?.[id]}
              fields={[{ key: "qty", placeholder: "Qty" }, { key: "condition", placeholder: "Condition" }]}
            />
          ))}
        </div>

        <input type="hidden" name="appliance_ids" value={APPLIANCE_ITEMS.map(([id]) => id).join(",")} />
        <div>
          <h3 className="mb-2 text-sm font-semibold text-navy">Appliances</h3>
          {APPLIANCE_ITEMS.map(([id, label]) => (
            <QtyCondRow
              key={id} prefix="appliance" id={id} label={label} values={initial?.appliances?.[id]}
              fields={[{ key: "brand", placeholder: "Brand" }, { key: "condition", placeholder: "Condition" }]}
            />
          ))}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-navy">Fixtures Present</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FIXTURE_ITEMS.map(([id, label]) => (
              <label key={id} className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="fixtures" value={id} defaultChecked={initial?.fixtures?.includes(id)} className="h-4 w-4 accent-navy" />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-navy">Initial Condition Report</h3>
          {CONDITION_AREAS.map(([id, label]) => (
            <div key={id} className="mb-2">
              <label className="mb-1 block text-xs text-slate">{label}</label>
              <input name={`condition_${id}`} defaultValue={initial?.conditionReport?.[id]} className={inputCls} />
            </div>
          ))}
        </div>

        <button type="submit" className="self-start rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
          Save inventory pre-fill
        </button>
      </form>
    </details>
  );
}
