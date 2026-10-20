export function licenseLine(
  specialist: { licenseMode: "own" | "accredited"; licenseNo: string | null },
  broker: { name: string; licenseNo: string } | null,
): string | null {
  if (specialist.licenseMode === "own") {
    return specialist.licenseNo
      ? `PRC License No. ${specialist.licenseNo}`
      : null;
  }
  if (!broker) return null;
  return `Accredited under ${broker.name}, PRC Lic. No. ${broker.licenseNo}`;
}
