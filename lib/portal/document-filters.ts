export type MonthOption = { value: string; label: string };
export type YearArchive<T> = { year: string; items: T[] };

export const MONTH_OPTIONS: MonthOption[] = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export function monthFromDate(date: string) {
  return date.slice(5, 7);
}

export function yearFromDate(date: string) {
  return date.slice(0, 4);
}

export function availableYears<T>(items: T[], getDate: (item: T) => string) {
  return Array.from(new Set(items.map((item) => yearFromDate(getDate(item)))))
    .filter(Boolean)
    .sort((a, b) => Number(b) - Number(a));
}

export function filterByMonthYear<T>(
  items: T[],
  getDate: (item: T) => string,
  month?: string,
  year?: string
) {
  return items.filter((item) => {
    const date = getDate(item);
    if (year && yearFromDate(date) !== year) return false;
    if (month && monthFromDate(date) !== month) return false;
    return true;
  });
}

export function archiveByYear<T>(items: T[], getDate: (item: T) => string): YearArchive<T>[] {
  const years = availableYears(items, getDate);
  return years.map((year) => ({
    year,
    items: items.filter((item) => yearFromDate(getDate(item)) === year),
  }));
}
