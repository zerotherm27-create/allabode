export type SigningIdOption = {
  value: string;
  label: string;
};

export const SIGNING_ID_TYPES: SigningIdOption[] = [
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "national_id", label: "Philippine National ID" },
  { value: "umid", label: "UMID" },
  { value: "school_id", label: "School ID (students 18+ only)" },
  { value: "other", label: "Other government ID" },
];

type TenantDetailsLike = {
  name?: string | null;
  address?: string | null;
  contact?: string | null;
  email?: string | null;
};

export type TenantPrefillSource = {
  tenant_email?: string | null;
  tenant_name_hint?: string | null;
  tenant_details?: TenantDetailsLike | null;
};

export type TenantContactForm = {
  name: string;
  address: string;
  contact: string;
  email: string;
};

export function tenantContactPrefill(record: TenantPrefillSource): TenantContactForm {
  const details = record.tenant_details ?? {};
  return {
    name: details.name ?? record.tenant_name_hint ?? "",
    address: details.address ?? "",
    contact: details.contact ?? "",
    email: details.email ?? record.tenant_email ?? "",
  };
}

export type OccupantIdUpload = {
  occupantIndex: number;
  occupantName: string;
  path: string;
  fileName?: string;
  uploadedAt?: string;
};

export function normalizeOccupantIdUploads(value: unknown): OccupantIdUpload[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is OccupantIdUpload => {
    if (!item || typeof item !== "object") return false;
    const upload = item as Partial<OccupantIdUpload>;
    return typeof upload.occupantIndex === "number" && typeof upload.path === "string" && upload.path.length > 0;
  });
}

export function namedOccupants(occupants: string[]): string[] {
  return occupants.map((o) => o.trim()).filter(Boolean);
}

export function missingAdditionalOccupantIdNames(occupants: string[], uploads: OccupantIdUpload[]): string[] {
  const names = namedOccupants(occupants);
  return names
    .map((name, index) => ({ name, index }))
    .filter(({ index }) => index > 0)
    .filter(({ index }) => !uploads.some((upload) => upload.occupantIndex === index && upload.path))
    .map(({ name }) => name);
}
