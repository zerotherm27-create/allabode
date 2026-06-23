// Deterministic receipt validation (spec §10.5). Pure functions — no DB access —
// so they are easy to test and never depend on the AI being correct. The caller
// supplies duplicate flags (computed from DB) and the normalized extraction.

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type Severity = "info" | "warning" | "error" | "critical";

export type ValidationResult = {
  code: string;
  severity: Severity;
  passed: boolean;
  message: string;
};

export type ValidationInput = {
  normalized: {
    vendor_name?: unknown;
    receipt_number?: unknown;
    receipt_date?: unknown;
    subtotal?: number | null;
    vat_amount?: number | null;
    service_charge?: number | null;
    discount?: number | null;
    total_amount?: number | null;
    line_items?: Array<{ amount?: number | null }> | unknown;
  };
  confidence: number | null;
  duplicate: { byHash: boolean; byVendorTotal: boolean };
};

export type ValidationOutcome = {
  results: ValidationResult[];
  risk: RiskLevel;
  status: string; // receipt_status enum value
};

const TOL = 1.0; // peso tolerance for rounding
const approx = (a: number, b: number) => Math.abs(a - b) <= TOL;
const isValidDate = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export function runValidations(input: ValidationInput): ValidationOutcome {
  const { normalized: d, confidence, duplicate } = input;
  const results: ValidationResult[] = [];
  const add = (code: string, severity: Severity, passed: boolean, message: string) =>
    results.push({ code, severity, passed, message });

  // Duplicates
  add("duplicate_file_hash", "critical", !duplicate.byHash,
    duplicate.byHash ? "Identical file already uploaded" : "No identical file found");
  add("duplicate_vendor_total", "error", !duplicate.byVendorTotal,
    duplicate.byVendorTotal ? "Same vendor + receipt no. + total already exists" : "No matching prior receipt");

  // Required fields
  add("has_total", "error", d.total_amount != null, d.total_amount != null ? "Total present" : "Total amount missing");
  add("has_date", "warning", isValidDate(d.receipt_date), isValidDate(d.receipt_date) ? "Date present" : "Receipt date missing/unreadable");

  // Date sanity
  if (isValidDate(d.receipt_date)) {
    const future = Date.parse(d.receipt_date) > Date.now() + 24 * 3600 * 1000;
    add("date_not_future", "error", !future, future ? "Receipt date is in the future" : "Date not in the future");
  }

  // Math: line items → subtotal
  const items = Array.isArray(d.line_items) ? (d.line_items as Array<{ amount?: number | null }>) : [];
  if (items.length > 0 && d.subtotal != null) {
    const sum = items.reduce((s, it) => s + Number(it.amount ?? 0), 0);
    add("math_lineitems_subtotal", "error", approx(sum, d.subtotal),
      approx(sum, d.subtotal) ? "Line items match subtotal" : `Line items (${sum.toFixed(2)}) ≠ subtotal (${d.subtotal.toFixed(2)})`);
  }

  // Math: subtotal + vat + service − discount = total
  if (d.total_amount != null && (d.subtotal != null || d.vat_amount != null)) {
    const computed = Number(d.subtotal ?? 0) + Number(d.vat_amount ?? 0) + Number(d.service_charge ?? 0) - Number(d.discount ?? 0);
    add("math_total", "error", approx(computed, d.total_amount),
      approx(computed, d.total_amount) ? "Totals reconcile" : `Computed (${computed.toFixed(2)}) ≠ total (${d.total_amount.toFixed(2)})`);
  }

  // Confidence
  const confOk = confidence != null && confidence >= 0.9;
  add("confidence_threshold", "warning", confOk,
    confOk ? `Confidence ${(confidence! * 100).toFixed(0)}%` : `Low confidence${confidence != null ? ` (${(confidence * 100).toFixed(0)}%)` : ""}`);

  // Risk level from worst failed severity
  const failed = results.filter((r) => !r.passed);
  let risk: RiskLevel = "low";
  if (failed.some((r) => r.severity === "critical")) risk = "critical";
  else if (failed.some((r) => r.severity === "error")) risk = "high";
  else if (failed.some((r) => r.severity === "warning")) risk = "medium";

  // Status — anything other than a clean low-risk pass routes to human review.
  let status = "reviewed";
  if (duplicate.byHash) status = "duplicate_suspected";
  else if (risk === "critical" || risk === "high") status = "validation_failed";
  else if (risk === "medium") status = "needs_review";

  return { results, risk, status };
}
