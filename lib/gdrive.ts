import { google, type drive_v3 } from "googleapis";
import { Readable } from "stream";

export function isDriveConfigured(): boolean {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID);
}

export function getRootFolderId(): string {
  return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ?? "";
}

export async function initDriveClient(): Promise<drive_v3.Drive> {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not set");

  const key = JSON.parse(keyJson) as {
    client_email: string;
    private_key: string;
  };

  const auth = new google.auth.JWT({
    email: key.client_email,
    key:   key.private_key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

/** Find or create a folder with `name` inside `parentId`. Returns folder ID. */
export async function ensureFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
): Promise<string> {
  const q = `mimeType='application/vnd.google-apps.folder' and name=${JSON.stringify(name)} and '${parentId}' in parents and trashed=false`;
  const { data } = await drive.files.list({ q, fields: "files(id)", pageSize: 1 });
  if (data.files && data.files.length > 0) return data.files[0].id!;

  const { data: created } = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents:  [parentId],
    },
    fields: "id",
  });
  return created.id!;
}

/** Upload a PDF buffer into `parentId` as `fileName`. Overwrites if same name exists. Returns file ID. */
export async function uploadPdf(
  drive: drive_v3.Drive,
  parentId: string,
  fileName: string,
  pdfBuffer: Buffer,
): Promise<string> {
  // Delete existing file with same name so we don't accumulate duplicates
  const q = `name=${JSON.stringify(fileName)} and '${parentId}' in parents and trashed=false`;
  const { data: existing } = await drive.files.list({ q, fields: "files(id)", pageSize: 1 });
  if (existing.files && existing.files.length > 0) {
    await drive.files.delete({ fileId: existing.files[0].id! });
  }

  const stream = Readable.from(pdfBuffer);
  const { data } = await drive.files.create({
    requestBody: {
      name:    fileName,
      parents: [parentId],
    },
    media: {
      mimeType: "application/pdf",
      body:     stream,
    },
    fields: "id",
  });
  return data.id!;
}
