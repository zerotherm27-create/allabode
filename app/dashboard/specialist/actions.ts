"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/role";
import { LISTING_IMAGES_BUCKET, storagePathFromUrl } from "@/lib/storage";
import {
  SPECIALIST_DELETABLE_APPROVALS,
  specialistCanDelete,
  specialistListingRow,
  specialistListingSlug,
  specialistPhotoError,
} from "@/lib/admin/listing-row";
import { revalidatePublicListingPaths } from "@/lib/admin/revalidate";
import { deleteListingImage, reorderListingImages, uploadListingImages } from "@/app/admin/actions";
import { PHOTO_W, PHOTO_H, jpegDimensions } from "@/lib/team/photo";
import {
  PROFILE_LIMITS,
  parseList,
  parseYears,
  portraitError,
  portraitKey,
} from "@/lib/team/profile";
import { PUBLIC_CONTACT_LIMITS, parseHideCallLink, parsePublicContact } from "@/lib/team/public-contact";

export type SpecialistProfileState = { ok: boolean; message: string };

const fail = (message: string): SpecialistProfileState => ({ ok: false, message });
const done = (message: string): SpecialistProfileState => ({ ok: true, message });

/** Public profile pages are ISR-cached (300s): invalidate all of them and the specialist's own. */
function revalidateProfilePages(subdomain: string | null) {
  revalidatePath("/team");
  revalidatePath("/team/[slug]", "page");
  if (subdomain) revalidatePath(`/team/${subdomain}`);
}

function text(fd: FormData, key: string, max: number) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** The caller's own specialist id (resolved server-side) and current status. */
async function ownSpecialist() {
  const { role, specialistId } = await getCurrentRole();
  if (role !== "specialist" || !specialistId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("specialists")
    .select("id,status,subdomain")
    .eq("id", specialistId)
    .maybeSingle();
  if (!data) return null;
  return {
    supabase,
    id: data.id as string,
    status: data.status as string,
    subdomain: (data.subdomain as string | null) ?? null,
  };
}

export async function updateSpecialistProfile(
  _prev: SpecialistProfileState | null,
  fd: FormData,
): Promise<SpecialistProfileState> {
  const me = await ownSpecialist();
  if (!me) return fail("You need to be signed in as a property specialist.");
  if (me.status !== "pending" && me.status !== "approved") {
    return fail("Your account can't be edited right now. Contact All Abode.");
  }

  const displayName = text(fd, "display_name", PROFILE_LIMITS.displayName);
  if (!displayName) return fail("Enter your display name.");

  const years = parseYears(text(fd, "years_experience", 4));
  if (years === undefined) return fail("Years of experience must be a whole number from 0 to 80.");

  // Public contact details (opt-in; blank = use the company details).
  // Over-long input is refused by the validator rather than silently cut.
  const contact = parsePublicContact({
    phone: text(fd, "public_phone", PUBLIC_CONTACT_LIMITS.phone + 1),
    viber: text(fd, "public_viber", PUBLIC_CONTACT_LIMITS.phone + 1),
    facebook: text(fd, "public_facebook_url", PUBLIC_CONTACT_LIMITS.url + 1),
    linkedin: text(fd, "public_linkedin_url", PUBLIC_CONTACT_LIMITS.url + 1),
    email: text(fd, "public_email", PUBLIC_CONTACT_LIMITS.email + 1),
  });
  if (!contact.ok) return fail(contact.error);

  const update: Record<string, unknown> = {
    display_name: displayName,
    tagline: text(fd, "tagline", PROFILE_LIMITS.tagline) || null,
    bio: text(fd, "bio", PROFILE_LIMITS.bio) || null,
    phone: text(fd, "phone", PROFILE_LIMITS.phone) || null,
    years_experience: years,
    areas: parseList(text(fd, "areas", 2000)),
    specialties: parseList(text(fd, "specialties", 2000)),
    languages: parseList(text(fd, "languages", 2000)),
  };

  // Licence details are never sent from here: they are set by All Abode and
  // locked for the specialist (a DB trigger enforces the same rule).

  const { data, error } = await me.supabase
    .from("specialists")
    .update(update)
    .eq("id", me.id)
    .select("id");
  if (error) return fail(error.message);
  if (!data || data.length === 0) return fail("Your profile wasn't saved. Try again.");

  // Written separately so the rest of the profile still saves before the
  // public-contact migration has been run (the columns then don't exist).
  const { data: cData, error: cErr } = await me.supabase
    .from("specialists")
    .update(contact.value)
    .eq("id", me.id)
    .select("id");
  const contactMissing = cErr && (cErr.code === "42703" || cErr.code === "PGRST204");
  const anyContact = Object.values(contact.value).some((v) => v !== null);

  // Own write so a missing column (migration not run) never blocks the contact details above.
  const hide = parseHideCallLink(fd.get("hide_call_link"));
  const { data: hData, error: hErr } = await me.supabase
    .from("specialists")
    .update({ hide_call_link: hide })
    .eq("id", me.id)
    .select("id");
  const hideMissing = hErr && (hErr.code === "42703" || hErr.code === "PGRST204");

  revalidatePath("/dashboard/specialist/profile");
  revalidatePath("/dashboard/specialist");
  revalidateProfilePages(me.subdomain);

  if (hErr && !(hideMissing && !hide)) {
    return fail(
      hideMissing
        ? "Your profile was saved, but the call-link option can't be saved yet. Contact All Abode."
        : `Your profile was saved, but the call-link option wasn't. ${hErr.message}`,
    );
  }
  if (!hErr && (!hData || hData.length === 0)) {
    return fail("Your profile was saved, but the call-link option wasn't. Try again.");
  }

  if (cErr && !(contactMissing && !anyContact)) {
    return fail(
      contactMissing
        ? "Your profile was saved, but public contact details can't be saved yet. Contact All Abode."
        : `Your profile was saved, but the public contact details weren't. ${cErr.message}`,
    );
  }
  if (!cErr && (!cData || cData.length === 0)) {
    return fail("Your profile was saved, but the public contact details weren't. Try again.");
  }
  return done("Profile saved. Changes are live now.");
}

export async function uploadSpecialistPhoto(
  _prev: SpecialistProfileState | null,
  fd: FormData,
): Promise<SpecialistProfileState> {
  const me = await ownSpecialist();
  if (!me) return fail("You need to be signed in as a property specialist.");
  if (me.status !== "pending" && me.status !== "approved") {
    return fail("Your account can't be edited right now. Contact All Abode.");
  }

  const file = fd.get("photo");
  if (!(file instanceof File)) return fail("Choose a photo to upload.");

  // Cheap checks first so an oversized body is never read into memory.
  const early = portraitError(
    { size: file.size, type: file.type },
    { width: PHOTO_W, height: PHOTO_H },
    { width: PHOTO_W, height: PHOTO_H },
  );
  if (early) return fail(early);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const problem = portraitError(
    { size: bytes.length, type: file.type },
    jpegDimensions(bytes),
    { width: PHOTO_W, height: PHOTO_H },
  );
  if (problem) return fail(problem);

  // The only key the app writes: inside the caller's own folder.
  const key = portraitKey(me.id);
  const { error: upErr } = await me.supabase.storage
    .from("specialist-photos")
    .upload(key, bytes, { contentType: "image/jpeg", upsert: true, cacheControl: "3600" });
  if (upErr) return fail(upErr.message);

  const { data, error } = await me.supabase
    .from("specialists")
    .update({ photo_path: key })
    .eq("id", me.id)
    .select("id");
  if (error) return fail(error.message);
  if (!data || data.length === 0) return fail("The photo uploaded but wasn't linked to your profile. Try again.");

  revalidatePath("/dashboard/specialist/profile");
  revalidateProfilePages(me.subdomain);
  return done("Photo updated.");
}

/* ---- Listings ---- */

const LISTINGS_PATH = "/dashboard/specialist/listings";

type Db = Awaited<ReturnType<typeof createClient>>;

/**
 * The caller's specialist id, from the server (never the form). The RPC only
 * returns an id while the account is APPROVED, so a pending, rejected or
 * suspended specialist is refused here as well as by RLS.
 */
async function approvedSpecialistId(supabase: Db): Promise<string> {
  const { data, error } = await supabase.rpc("current_specialist_id");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only approved property specialists can manage listings.");
  return data as string;
}

/** A listing that belongs to the caller. Others' listings may be readable (live ones are
 *  public), so ownership is checked explicitly rather than left to RLS alone. */
async function ownListing(supabase: Db, specialistId: string, id: string) {
  const { data } = await supabase
    .from("listings")
    .select("id,slug,approval_status,ever_approved")
    .eq("id", id)
    .eq("specialist_id", specialistId)
    .maybeSingle();
  if (!data) throw new Error("That listing wasn't found, or it isn't yours.");
  return data as { id: string; slug: string | null; approval_status: string; ever_approved: boolean };
}

function refreshListingViews(id?: string, slug?: string | null) {
  revalidatePath(LISTINGS_PATH);
  revalidatePath("/dashboard/specialist");
  if (id) revalidatePath(`${LISTINGS_PATH}/${id}/edit`);
  revalidatePublicListingPaths(slug);
}

export async function createSpecialistListing(fd: FormData): Promise<void> {
  const supabase = await createClient();
  const specialistId = await approvedSpecialistId(supabase);
  const row = { ...specialistListingRow(fd, "create"), specialist_id: specialistId, approval_status: "draft" };

  const insert = (slug: string) =>
    supabase.from("listings").insert({ ...row, slug }).select("id,slug").single();
  let res = await insert(specialistListingSlug(row.title));
  // A taken slug (23505) is retried once with a short random suffix.
  if (res.error?.code === "23505") {
    res = await insert(specialistListingSlug(row.title, randomUUID().slice(0, 6)));
  }
  if (res.error) throw new Error(res.error.message);

  refreshListingViews(res.data.id, res.data.slug);
  redirect(`${LISTINGS_PATH}/${res.data.id}/edit?created=1`);
}

export async function updateSpecialistListing(id: string, fd: FormData): Promise<void> {
  const supabase = await createClient();
  const specialistId = await approvedSpecialistId(supabase);
  const { data, error } = await supabase
    .from("listings")
    .update(specialistListingRow(fd, "update"))
    .eq("id", id)
    .eq("specialist_id", specialistId)
    .select("id,slug");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("The listing wasn't updated, so it may have been removed or isn't yours.");
  }
  refreshListingViews(id, data[0].slug as string | null);

  if (fd.get("intent") === "submit") {
    await submitListingForApproval(id);
    redirect(`${LISTINGS_PATH}?notice=submitted`);
  }
  redirect(`${LISTINGS_PATH}?notice=saved`);
}

/** Moves a draft or rejected listing into review. Anything else is left alone. */
export async function submitListingForApproval(id: string): Promise<void> {
  const supabase = await createClient();
  const specialistId = await approvedSpecialistId(supabase);
  const { data, error } = await supabase
    .from("listings")
    .update({ approval_status: "submitted" })
    .eq("id", id)
    .eq("specialist_id", specialistId)
    .in("approval_status", ["draft", "rejected"])
    .select("id,slug");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("This listing can't be submitted. It may already be in review or approved, or it isn't yours.");
  }
  refreshListingViews(id, data[0].slug as string | null);
}

/** Which of `paths` still exist in the bucket, by listing each parent folder.
 *  Null when a listing call fails (treated as "can't tell"). */
async function objectsStillPresent(
  bucket: ReturnType<Awaited<ReturnType<typeof createClient>>["storage"]["from"]>,
  paths: string[],
): Promise<string[] | null> {
  const byFolder = new Map<string, string[]>();
  for (const p of paths) {
    const cut = p.lastIndexOf("/");
    const folder = cut === -1 ? "" : p.slice(0, cut);
    byFolder.set(folder, [...(byFolder.get(folder) ?? []), p]);
  }
  const present: string[] = [];
  for (const [folder, inFolder] of byFolder) {
    const { data, error } = await bucket.list(folder, { limit: 1000 });
    if (error) return null;
    const names = new Set((data ?? []).map((o) => (folder ? `${folder}/${o.name}` : o.name)));
    present.push(...inFolder.filter((p) => names.has(p)));
  }
  return present;
}

export async function deleteSpecialistListing(id: string): Promise<void> {
  const supabase = await createClient();
  const specialistId = await approvedSpecialistId(supabase);
  const listing = await ownListing(supabase, specialistId, id);
  // A listing that is or ever was live is archived, not deleted: deleting it
  // would cascade into bookings and inquiries that staff own. Checked before
  // any photo is touched.
  if (!specialistCanDelete(listing.approval_status, listing.ever_approved)) {
    throw new Error("Live listings can't be deleted. Archive it instead.");
  }

  // The storage delete policy depends on the listing row existing, so the photos
  // go first. If they can't all be removed, the listing is kept.
  const { data: images } = await supabase.from("listing_images").select("url").eq("listing_id", id);
  const paths = (images ?? [])
    .map((img) => storagePathFromUrl(LISTING_IMAGES_BUCKET, (img as { url: string }).url))
    .filter((p): p is string => p != null);
  if (paths.length > 0) {
    const bucket = supabase.storage.from(LISTING_IMAGES_BUCKET);
    const { data: removed, error: rmErr } = await bucket.remove(paths);
    if (rmErr) throw new Error(`The photos couldn't be removed, so the listing was kept. ${rmErr.message}`);
    // remove() only reports the objects it deleted, so a photo whose file is
    // already gone looks the same as one it couldn't delete. Look again: only a
    // file that is still there counts as a failure.
    const removedNames = new Set((removed ?? []).map((o) => o.name));
    const notRemoved = [...new Set(paths)].filter((p) => !removedNames.has(p));
    if (notRemoved.length > 0) {
      const stillThere = await objectsStillPresent(bucket, notRemoved);
      if (stillThere === null) {
        throw new Error("The photos couldn't be checked, so the listing was kept. Try again.");
      }
      if (stillThere.length > 0) {
        throw new Error("Some photos couldn't be removed, so the listing was kept. Try again.");
      }
    }
  }

  // Atomic guard: the status filter stops a listing approved in the meantime.
  const { data, error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .eq("specialist_id", specialistId)
    .in("approval_status", [...SPECIALIST_DELETABLE_APPROVALS])
    .eq("ever_approved", false)
    .select("id,slug");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("The listing wasn't deleted. Live listings can't be deleted, so archive it instead.");
  }

  refreshListingViews(undefined, data[0].slug as string | null);
  redirect(`${LISTINGS_PATH}?notice=deleted`);
}

/* ---- Listing photos ----
 * Thin wrappers over the shared admin image actions (same session client, so the
 * specialist storage and listing_images policies apply). They add what the admin
 * versions leave to staff trust: an explicit ownership check, an JPEG/PNG/WebP, size and count
 * check on upload, and revalidation of the specialist's own edit page. */

export async function specialistUploadImages(listingId: string, fd: FormData): Promise<void> {
  const supabase = await createClient();
  const specialistId = await approvedSpecialistId(supabase);
  await ownListing(supabase, specialistId, listingId);

  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const problem = specialistPhotoError(files);
  if (problem) throw new Error(problem);
  await uploadListingImages(listingId, fd);
  revalidatePath(`${LISTINGS_PATH}/${listingId}/edit`);
}

export async function specialistDeleteImage(imageId: string, listingId: string): Promise<void> {
  const supabase = await createClient();
  const specialistId = await approvedSpecialistId(supabase);
  await ownListing(supabase, specialistId, listingId);
  const { data } = await supabase
    .from("listing_images")
    .select("id")
    .eq("id", imageId)
    .eq("listing_id", listingId)
    .maybeSingle();
  if (!data) throw new Error("That photo wasn't found on this listing.");
  await deleteListingImage(imageId, listingId);
  revalidatePath(`${LISTINGS_PATH}/${listingId}/edit`);
}

export async function specialistReorderImages(listingId: string, orderedIds: string[]): Promise<void> {
  const supabase = await createClient();
  const specialistId = await approvedSpecialistId(supabase);
  await ownListing(supabase, specialistId, listingId);
  const { data } = await supabase
    .from("listing_images")
    .select("id")
    .eq("listing_id", listingId)
    .in("id", orderedIds);
  if ((data?.length ?? 0) !== orderedIds.length) throw new Error("Some of those photos aren't on this listing.");
  await reorderListingImages(listingId, orderedIds);
  revalidatePath(`${LISTINGS_PATH}/${listingId}/edit`);
}
