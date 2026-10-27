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

const ID_FOLDER = COMPANY_SIGNATORY.idStoragePath.split("/")[0];

function mimeFor(name: string, blobType: string | undefined): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return blobType === "image/png" ? "image/png" : "image/jpeg";
}

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

async function downloadStored(supabase: SupabaseClient, path: string): Promise<CompanySignatoryIdImage | null> {
  const { data, error } = await supabase.storage.from(AGREEMENTS_BUCKET).download(path);
  if (error || !data) {
    if (error) console.warn(`[company-signatory] could not download ${path}:`, error.message);
    return null;
  }
  const fileBuffer = Buffer.from(await data.arrayBuffer());
  if (!fileBuffer.length) return null;
  const mime = mimeFor(path, data.type);
  return { dataUri: imageDataUri(fileBuffer, mime), fileBuffer, mime };
}

/**
 * The broker/signatory ID photo attached to every contract PDF. Looks for the
 * canonical path first; if the file was uploaded under a different name or
 * extension (e.g. via the dashboard), falls back to the first image in the
 * `company-signatory/` folder, preferring one that looks like the PRC card.
 */
export async function loadCompanySignatoryIdImage(
  supabase: SupabaseClient,
): Promise<CompanySignatoryIdImage> {
  const canonical = await downloadStored(supabase, COMPANY_SIGNATORY.idStoragePath);
  if (canonical) return canonical;

  const { data: files, error: listErr } = await supabase.storage.from(AGREEMENTS_BUCKET).list(ID_FOLDER, { limit: 50 });
  if (listErr) console.warn(`[company-signatory] could not list ${ID_FOLDER}/:`, listErr.message);
  const images = (files ?? []).filter((f) => /\.(jpe?g|png)$/i.test(f.name));
  const preferred = images.find((f) => /prc|cruzado|aremchel/i.test(f.name)) ?? images[0];
  if (preferred) {
    const found = await downloadStored(supabase, `${ID_FOLDER}/${preferred.name}`);
    if (found) return found;
  }

  const localBuffer = await readLocalIdImage();
  if (localBuffer) {
    const mime = "image/jpeg";
    await supabase.storage.from(AGREEMENTS_BUCKET).upload(COMPANY_SIGNATORY.idStoragePath, localBuffer, {
      contentType: mime,
      upsert: true,
    });
    return { dataUri: imageDataUri(localBuffer, mime), fileBuffer: localBuffer, mime };
  }

  console.warn(`[company-signatory] no ID image found in ${AGREEMENTS_BUCKET}/${ID_FOLDER}/ — the broker ID page will print "ID image unavailable."`);
  return { dataUri: null, fileBuffer: null, mime: "image/jpeg" };
}
