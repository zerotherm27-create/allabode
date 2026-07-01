// Shared display labels for the Property Management Agreement's Annex C
// authority matrix + government ID types. Kept isomorphic (no server-only
// imports) so both the PDF template (lib/pdf/agreement.tsx) and the public
// signing wizard's full-text review can import it without pulling
// Node-only code (fs, @react-pdf/renderer) into the browser bundle.

export const LEASE_TERM_LABEL: Record<string, string> = { "6": "6 Months", "12": "12 Months", "24": "24 Months" };
export const PET_LABEL: Record<string, string> = { allowed: "Pets Allowed", small_pets: "Small Pets Only", no_pets: "No Pets" };
export const SMOKING_LABEL: Record<string, string> = { allowed: "Allowed", balcony_only: "Balcony Only", no_smoking: "Strictly No Smoking" };
export const YN_LABEL: Record<string, string> = { allowed: "Allowed", not_allowed: "Not Allowed", subject_to_rules: "Subject to Condo Rules" };
export const FURNISHING_LABEL: Record<string, string> = { fully: "Fully Furnished", semi: "Semi Furnished", bare: "Bare Unit" };
export const COMMS_LABEL: Record<string, string> = { call: "Call", sms: "SMS", viber: "Viber", whatsapp: "WhatsApp", email: "Email" };
export const RESPONSE_LABEL: Record<string, string> = { anytime: "Anytime", office_hours: "Office Hours", weekdays: "Weekdays Only" };
export const PAYOUT_LABEL: Record<string, string> = { monthly: "Monthly", "15th": "Every 15th", "30th": "Every 30th" };

export const ID_TYPE_LABEL: Record<string, string> = {
  passport: "Passport",
  drivers_license: "Driver's License",
  national_id: "Philippine National ID",
  umid: "UMID",
  other: "Government ID",
};

export function ownerIdTypeLabel(type: string | null | undefined): string {
  return ID_TYPE_LABEL[type || ""] || "Government ID";
}
