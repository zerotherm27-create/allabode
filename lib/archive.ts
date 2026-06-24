import { isDriveConfigured, getRootFolderId, initDriveClient, ensureFolder, uploadPdf } from "./gdrive";

export type OwnerArchiveParams = {
  pdf:           Buffer;
  ownerName:     string;
  propertyName?: string; // omit for legacy SOAs without unit data
  unitLabel?:    string;
  periodStart:   string;
};

export type TenantArchiveParams = {
  pdf:         Buffer;
  tenantName:  string;
  periodStart: string;
};

export type ArchiveResult = {
  fileId:    string;
  folderUrl: string;
};

/**
 * Archive an owner SOA PDF to Google Drive.
 * Full path: root / ownerName [/ propertyName [/ unitLabel]] / SOA_YYYY-MM.pdf
 * Returns null (never throws) if Drive is not configured or upload fails.
 */
export async function archiveOwnerSoaToDrive(params: OwnerArchiveParams): Promise<ArchiveResult | null> {
  if (!isDriveConfigured()) return null;
  try {
    const drive  = await initDriveClient();
    const rootId = getRootFolderId();

    let folderId = await ensureFolder(drive, rootId, sanitize(params.ownerName));
    const ownerFolderId = folderId;

    if (params.propertyName) {
      folderId = await ensureFolder(drive, folderId, sanitize(params.propertyName));
    }
    if (params.unitLabel) {
      folderId = await ensureFolder(drive, folderId, sanitize(params.unitLabel));
    }

    const fileName = `SOA_${params.periodStart}.pdf`;
    const fileId   = await uploadPdf(drive, folderId, fileName, params.pdf);

    return {
      fileId,
      folderUrl: `https://drive.google.com/drive/folders/${ownerFolderId}`,
    };
  } catch (err) {
    console.error("[Drive] Owner SOA archive failed:", err);
    return null;
  }
}

/**
 * Archive a tenant SOA PDF to Google Drive.
 * Path: root / Tenants / tenantName / SOA_YYYY-MM.pdf
 * Returns null (never throws) if Drive is not configured or upload fails.
 */
export async function archiveTenantSoaToDrive(params: TenantArchiveParams): Promise<ArchiveResult | null> {
  if (!isDriveConfigured()) return null;
  try {
    const drive  = await initDriveClient();
    const rootId = getRootFolderId();

    const tenantRootId   = await ensureFolder(drive, rootId, "Tenants");
    const tenantFolderId = await ensureFolder(drive, tenantRootId, sanitize(params.tenantName));

    const fileName = `SOA_${params.periodStart}.pdf`;
    const fileId   = await uploadPdf(drive, tenantFolderId, fileName, params.pdf);

    return {
      fileId,
      folderUrl: `https://drive.google.com/drive/folders/${tenantFolderId}`,
    };
  } catch (err) {
    console.error("[Drive] Tenant SOA archive failed:", err);
    return null;
  }
}

function sanitize(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "-").trim() || "Unknown";
}
