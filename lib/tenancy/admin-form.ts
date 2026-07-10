import type { InventoryRow } from "@/lib/pm/tenancy-clauses";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function adminOccupantsInitial(occupants: string[] | null | undefined): string[] {
  const filled = adminOccupantsForAgreement(occupants);
  return filled.length > 0 ? filled : [""];
}

export function adminOccupantSlots(occupants: string[] | null | undefined): string[] {
  const slots = (occupants ?? []).filter((name): name is string => typeof name === "string");
  return slots.length > 0 ? slots : [""];
}

export function appendAdminOccupantSlot(occupants: string[] | null | undefined): string[] {
  return [...adminOccupantSlots(occupants), ""];
}

export function adminOccupantsForAgreement(occupants: string[] | null | undefined): string[] {
  return (occupants ?? [])
    .map((name) => text(name))
    .filter((name) => name.length > 0);
}

export function normalizeInventoryRows(rows: unknown): InventoryRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row): InventoryRow => {
      const value = row && typeof row === "object" ? row as Record<string, unknown> : {};
      return {
        quantity: text(value.quantity),
        particulars: text(value.particulars),
        brand: text(value.brand),
        remarks: text(value.remarks),
      };
    })
    .filter((row) => row.particulars.length > 0);
}

export function parseInventoryJson(raw: string | null): InventoryRow[] {
  if (!raw) return [];
  return normalizeInventoryRows(JSON.parse(raw));
}
