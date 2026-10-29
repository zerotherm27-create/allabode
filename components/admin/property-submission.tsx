import { parseProperty, LONG_FACT } from "@/lib/leads/property-message";

type Fact = { label: string; value: string };

const COVERED = ["location", "floor area", "bedrooms", "bathrooms", "price"];

function detailFacts(d: Record<string, unknown> | null): Fact[] {
  const v = (k: string) => (d?.[k] == null || d[k] === "" ? null : String(d[k]));
  const rows: [string, string | null][] = [
    ["Location", v("propertyLocation")],
    ["Property type", v("propertyType")],
    ["Service", v("intendedService")],
    ["Bedrooms", v("bedrooms")],
    ["Bathrooms", v("bathrooms")],
    ["Floor area", v("floorArea")],
    ["Expected price / rent", v("price")],
  ];
  return rows.filter((r): r is [string, string] => r[1] != null).map(([label, value]) => ({ label, value }));
}

/** Tidy layout for a "list your property" submission: facts grid, then description in sections. */
export function PropertySubmission({
  message,
  details,
}: {
  message: string | null;
  details: Record<string, unknown> | null;
}) {
  const parsed = parseProperty(message);
  const structured = detailFacts(details);
  const have = new Set(structured.map((f) => f.label.toLowerCase()));
  const extra = parsed.facts.filter((f) => {
    const l = f.label.toLowerCase();
    return !(COVERED.some((c) => l.startsWith(c) || c.startsWith(l)) && structured.length > 0) && !have.has(l);
  });
  const all = [...structured, ...extra];
  const short = all.filter((f) => f.value.length <= LONG_FACT);
  const long = all.filter((f) => f.value.length > LONG_FACT);
  const description = [parsed.intro, ...long.map((f) => `${f.label}: ${f.value}`)].filter(Boolean);
  const hasMore = description.length > 0 || parsed.sections.length > 0;

  return (
    <div className="mt-4 rounded-md border border-line bg-cream p-4">
      <p className="label-caps text-gold-ink">Property submission</p>
      {short.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {short.map((f) => (
            <div key={f.label}>
              <dt className="text-xs text-slate">{f.label}</dt>
              <dd className="text-sm font-medium text-navy">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {hasMore && (
        <details className="group mt-4 border-t border-line pt-3">
          <summary className="cursor-pointer text-sm font-medium text-navy-700 hover:text-navy">
            <span className="group-open:hidden">Show full description</span>
            <span className="hidden group-open:inline">Hide description</span>
          </summary>
          <div className="mt-3 space-y-4 text-sm text-slate">
            {description.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {parsed.sections.map((s, i) => (
              <section key={i}>
                {s.title && <h3 className="font-semibold text-navy">{s.title}</h3>}
                {s.text && <p className="mt-1">{s.text}</p>}
                {s.items.length > 0 && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {s.items.map((it, j) => (
                      <li key={j}>{it}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
