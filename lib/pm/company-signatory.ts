import type { SupabaseClient } from "@supabase/supabase-js";
import { AGREEMENTS_BUCKET } from "@/lib/storage";

export const COMPANY_SIGNATORY = {
  name: "Aremchel M. Cruzado",
  title: "Chief Executive Officer (CEO)",
  idTypeLabel: "PRC",
  idNumber: "0035712",
  idIssuedDate: "June 30, 2025",
  idStoragePath: "company-signatory/aremchel-cruzado-prc.jpeg",
  localIdImagePath: "/Users/jojo/Downloads/a399803e-95ee-4158-a5a3-93593e666d1a.jpeg",
} as const;

export type CompanySignatoryIdImage = {
  dataUri: string | null;
  fileBuffer: Buffer | null;
  mime: string;
};

function imageDataUri(buffer: Buffer, mime: string) {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function readLocalIdImage(): Promise<Buffer | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    return await readFile(/* turbopackIgnore: true */ COMPANY_SIGNATORY.localIdImagePath);
  } catch {
    return null;
  }
}

export async function loadCompanySignatoryIdImage(
  supabase: SupabaseClient,
): Promise<CompanySignatoryIdImage> {
  const mime = "image/jpeg";
  const { data: storedFile } = await supabase.storage
    .from(AGREEMENTS_BUCKET)
    .download(COMPANY_SIGNATORY.idStoragePath);

  if (storedFile) {
    const fileBuffer = Buffer.from(await storedFile.arrayBuffer());
    return { dataUri: imageDataUri(fileBuffer, mime), fileBuffer, mime };
  }

  const fileBuffer = await readLocalIdImage();
  if (!fileBuffer) {
    return { dataUri: null, fileBuffer: null, mime };
  }

  await supabase.storage.from(AGREEMENTS_BUCKET).upload(COMPANY_SIGNATORY.idStoragePath, fileBuffer, {
    contentType: mime,
    upsert: true,
  });

  return { dataUri: imageDataUri(fileBuffer, mime), fileBuffer, mime };
}
