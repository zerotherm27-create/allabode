// Peso-amount-to-words for the Tenancy Agreement's rent/deposit blanks
// ("Seventy Six Thousand PHILIPPINE PESO (PHP 76,000.00)"). Isomorphic —
// used by the admin terms form (client) to auto-fill the words fields,
// which staff can still override before sending.

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const SCALE = ["", " Thousand", " Million", " Billion"];

function threeDigits(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (rest >= 20) {
    const t = TENS[Math.floor(rest / 10)];
    const o = ONES[rest % 10];
    parts.push(o ? `${t} ${o}` : t);
  } else if (rest > 0) {
    parts.push(ONES[rest]);
  }
  return parts.join(" ");
}

/** Whole number → words, e.g. 76000 → "Seventy Six Thousand". */
export function numberToWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  if (n === 0) return "Zero";
  const groups: string[] = [];
  let rest = Math.floor(n);
  let scale = 0;
  while (rest > 0 && scale < SCALE.length) {
    const g = rest % 1000;
    if (g) groups.unshift(`${threeDigits(g)}${SCALE[scale]}`);
    rest = Math.floor(rest / 1000);
    scale += 1;
  }
  return groups.join(" ");
}

/**
 * Peso amount → contract words (currency name is printed by the template,
 * not included here), e.g. 76000 → "Seventy Six Thousand",
 * 25500.5 → "Twenty Five Thousand Five Hundred and 50/100".
 */
export function pesoAmountInWords(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return "";
  const whole = Math.floor(amount);
  const centavos = Math.round((amount - whole) * 100);
  const words = numberToWords(whole);
  return centavos > 0 ? `${words} and ${String(centavos).padStart(2, "0")}/100` : words;
}

/** Peso amount → figures, e.g. 76000 → "76,000.00". */
export function pesoAmountFigures(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  return amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
