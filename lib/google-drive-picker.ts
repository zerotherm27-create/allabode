/** Browser-only. Wraps Google Identity Services + the Google Picker API so an
 *  admin can pick images from their own Drive. Only ever imported from a
 *  client component — every function here touches `window`/`document`. */

const GIS_SRC = "https://accounts.google.com/gsi/client";
const GAPI_SRC = "https://apis.google.com/js/api.js";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export type PickedDoc = { id: string; name: string; mimeType: string };

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
}

let pickerReady: Promise<void> | null = null;

/** Idempotently loads the GIS + Picker scripts and the `picker` gapi module. */
export function loadGoogleDriveScripts(): Promise<void> {
  if (pickerReady) return pickerReady;
  pickerReady = Promise.all([loadScript(GIS_SRC), loadScript(GAPI_SRC)]).then(
    () =>
      new Promise<void>((resolve) => {
        window.gapi.load("picker", () => resolve());
      })
  );
  return pickerReady;
}

export function getDriveAccessToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error ?? "Google sign-in was cancelled."));
          return;
        }
        resolve(resp.access_token);
      },
    });
    tokenClient.requestAccessToken();
  });
}

export function openDrivePicker(opts: { apiKey: string; accessToken: string }): Promise<PickedDoc[]> {
  return new Promise((resolve, reject) => {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS_IMAGES).setSelectFolderEnabled(
      false
    );
    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(opts.accessToken)
      .setDeveloperKey(opts.apiKey)
      .setCallback((data) => {
        const action = data[window.google.picker.Response.ACTION];
        if (action === window.google.picker.Action.PICKED) {
          const docs = (data[window.google.picker.Response.DOCUMENTS] as Record<string, string>[]) ?? [];
          resolve(
            docs.map((doc) => ({
              id: doc[window.google.picker.Document.ID],
              name: doc[window.google.picker.Document.NAME],
              mimeType: doc[window.google.picker.Document.MIME_TYPE],
            }))
          );
        } else if (action === window.google.picker.Action.CANCEL) {
          resolve([]);
        }
      })
      .build();
    try {
      picker.setVisible(true);
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Could not open the Google Drive picker."));
    }
  });
}

export async function downloadDriveFile(doc: PickedDoc, accessToken: string): Promise<File> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Couldn't download "${doc.name}" from Google Drive.`);
  }
  const blob = await res.blob();
  return new File([blob], doc.name, { type: doc.mimeType });
}
