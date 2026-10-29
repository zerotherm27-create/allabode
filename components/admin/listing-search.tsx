import { Icon } from "@/components/icon";

/** Case-insensitive match of every search word against the joined fields. */
export function matchesSearch(q: string, fields: (string | null | undefined)[]): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = fields.filter(Boolean).join(" ").toLowerCase();
  return words.every((w) => hay.includes(w));
}

/** GET search box; `hidden` carries other filters (e.g. approval) through the submit. */
export function ListingSearch({
  q,
  action,
  hidden,
}: {
  q: string;
  action: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form action={action} method="get" role="search" className="mt-5 flex gap-2">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="relative flex-1">
        <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          aria-label="Search properties"
          placeholder="Search properties by title, location, type or status"
          className="min-h-11 w-full rounded-md border border-line bg-surface pl-10 pr-3 text-sm text-ink placeholder:text-slate focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700"
        />
      </div>
      <button type="submit" className="press min-h-11 rounded-md bg-navy px-5 text-sm font-semibold text-white hover:bg-navy-800">
        Search
      </button>
      {q && (
        <a href={action} className="press inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm font-medium text-navy hover:bg-surface-gray">
          Clear
        </a>
      )}
    </form>
  );
}
