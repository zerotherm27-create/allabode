export function leaseOccupiesUnit(status: string | null | undefined): boolean {
  return status === "active";
}

export function unitIdsToResyncForLeaseChange({
  previousUnitId,
  nextUnitId,
}: {
  previousUnitId?: string | null;
  nextUnitId?: string | null;
}): string[] {
  return Array.from(new Set([previousUnitId, nextUnitId].filter(Boolean) as string[]));
}
