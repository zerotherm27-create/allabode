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

export function openDrivePicker(opts: {
  apiKey: string;
  accessToken: string;
  appId: string;
}): Promise<PickedDoc[]> {
  return new Promise((resolve, reject) => {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS_IMAGES).setSelectFolderEnabled(
      false
    );
    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(opts.accessToken)
      .setDeveloperKey(opts.apiKey)
      // Required by Google whenever the drive.file scope is used: it's what
      // ties the picker to our Cloud project so selecting a file actually
      // grants this app access to it. Without it the picker still lists file
      // names (those come from the user's own Drive session) but every
      // thumbnail — and any later read of the file — is unauthorised.
      .setAppId(opts.appId)
      .setOrigin(window.location.protocol + "//" + window.location.host)
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
  // Fetched via our own API route, not directly from googleapis.com — Drive's
  // alt=media redirect doesn't carry CORS headers, so a browser-side fetch()
  // to it fails silently. See app/api/admin/google-drive-download/route.ts.
  const res = await fetch("/api/admin/google-drive-download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId: doc.id, accessToken }),
  });
  if (!res.ok) {
    throw new Error(`Couldn't download "${doc.name}" from Google Drive.`);
  }
  const blob = await res.blob();
  return new File([blob], doc.name, { type: doc.mimeType });
}
