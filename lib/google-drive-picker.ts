/** Browser-only. Wraps Google Identity Services + the Google Picker API so an
 *  admin can pick images from their own Drive. Only ever imported from a
 *  client component — every function here touches `window`/`document`. */

const GIS_SRC = "https://accounts.google.com/gsi/client";
const GAPI_SRC = "https://apis.google.com/js/api.js";
/** Read-only access to the whole Drive. Deliberately broader than the
 *  per-file `drive.file`, and the only way to get preview thumbnails: the
 *  Picker renders them only for `drive`/`drive.readonly`, because under
 *  `drive.file` an app has no read access to a file until *after* it's picked
 *  — and a thumbnail is file content.
 *
 *  This is a Google "restricted" scope, but it needs no verification or paid
 *  CASA assessment here: an unverified project may still request unapproved
 *  restricted scopes, at the cost of an "unverified app" consent screen and a
 *  lifetime cap of 100 users who can grant them (per project, never resets).
 *  Only staff importing photos consume that cap — portal sign-in grants just
 *  basic profile scopes, which don't count against it. */
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

/** Canvas-decodable web image formats — `optimizeImageFile` re-encodes every
 *  pick through a <canvas>, so formats a browser can't decode (HEIC, RAW)
 *  would fail silently after selection. */
const IMAGE_MIME_TYPES = "image/jpeg,image/png,image/webp,image/gif";

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

/** Stops the page behind the picker from scrolling, and returns an idempotent
 *  release. Padding compensates for the scrollbar's width so hiding it doesn't
 *  shift the layout underneath on platforms that reserve space for one. */
function lockPageScroll(): () => void {
  const { body } = document;
  const prevOverflow = body.style.overflow;
  const prevPaddingRight = body.style.paddingRight;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  body.style.overflow = "hidden";
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    body.style.overflow = prevOverflow;
    body.style.paddingRight = prevPaddingRight;
  };
}

export function openDrivePicker(opts: {
  apiKey: string;
  accessToken: string;
  appId: string;
}): Promise<PickedDoc[]> {
  return new Promise((resolve, reject) => {
    const gp = window.google.picker;
    const releaseScroll = lockPageScroll();

    /* Backstop for the scroll lock. The callback below covers the normal
       PICKED/CANCEL exits, but any dismissal path that fires neither would
       otherwise strand the page permanently unscrollable — a worse hang than
       the one this is fixing. Watch for the dialog leaving the DOM instead.
       The `seen` flag matters: unrelated <body> mutations fire before Google
       has inserted the dialog, and releasing on those would undo the lock
       immediately. */
    let seen = false;
    const observer = new MutationObserver(() => {
      if (document.querySelector(".picker-dialog")) {
        seen = true;
      } else if (seen) {
        releaseScroll();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true });

    const settle = (docs: PickedDoc[]) => {
      releaseScroll();
      observer.disconnect();
      resolve(docs);
    };

    /** A browsable Drive view filtered to images. `ViewId.DOCS` (rather than
     *  `DOCS_IMAGES`) is what makes it a real folder tree — `DOCS_IMAGES`
     *  renders one flat list of every image in the account with no way to
     *  narrow it down. Folders are shown so they can be opened, but selecting
     *  one is disabled: clicking a folder should navigate into it, not return
     *  the folder itself as the pick.
     *
     *  GRID mode gives the thumbnail previews needed to choose photos by sight
     *  rather than by filename. It only renders them because DRIVE_SCOPE is
     *  `drive.readonly` — revert this to `DocsViewMode.LIST` if that ever
     *  narrows back to `drive.file`, or every tile becomes a broken-image
     *  placeholder. */
    const browsable = (label: string) =>
      new gp.DocsView(gp.ViewId.DOCS)
        .setMimeTypes(IMAGE_MIME_TYPES)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false)
        .setMode(gp.DocsViewMode.GRID)
        .setLabel(label);

    const myDrive = browsable("My Drive").setParent("root").setOwnedByMe(true);
    const sharedWithMe = browsable("Shared with me").setOwnedByMe(false);
    const sharedDrives = browsable("Shared drives").setEnableDrives(true);

    const picker = new window.google.picker.PickerBuilder()
      .addView(myDrive)
      .addView(sharedWithMe)
      .addView(sharedDrives)
      // The caller uploads an array of files, so let the user pick a whole
      // folder's worth in one pass instead of reopening the picker per photo.
      .enableFeature(gp.Feature.MULTISELECT_ENABLED)
      .setTitle("Select listing photos")
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
          settle(
            docs.map((doc) => ({
              id: doc[window.google.picker.Document.ID],
              name: doc[window.google.picker.Document.NAME],
              mimeType: doc[window.google.picker.Document.MIME_TYPE],
            }))
          );
        } else if (action === window.google.picker.Action.CANCEL) {
          settle([]);
        }
      })
      .build();
    try {
      picker.setVisible(true);
    } catch (err) {
      releaseScroll();
      observer.disconnect();
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
