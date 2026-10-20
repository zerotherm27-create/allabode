// Pure, import-free (unit tested directly via tests/helpers/load-ts.mjs).

/** The licensed broker the specialists are accredited under, when settings leave it blank. */
export const DEFAULT_BROKER_NAME = "Aremchel M. Cruzado";

/** A trimmed broker name, falling back to the default when empty or whitespace. */
export function resolveBrokerName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  return trimmed || DEFAULT_BROKER_NAME;
}

export function licenseLine(
  specialist: { licenseMode: "own" | "accredited"; licenseNo: string | null },
  broker: { name: string; licenseNo: string } | null,
): string | null {
  if (specialist.licenseMode === "own") {
    const no = (specialist.licenseNo ?? "").trim();
    return no ? `PRC License No. ${no}` : null;
  }
  if (!broker) return null;
  const brokerNo = (broker.licenseNo ?? "").trim();
  if (!brokerNo) return null;
  return `Accredited under ${resolveBrokerName(broker.name)}, PRC Lic. No. ${brokerNo}`;
}
