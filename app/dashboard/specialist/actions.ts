"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/role";
import { PHOTO_W, PHOTO_H, jpegDimensions } from "@/lib/team/photo";
import {
  PROFILE_LIMITS,
  parseDateOnly,
  parseList,
  parseYears,
  portraitError,
  portraitKey,
} from "@/lib/team/profile";

export type SpecialistProfileState = { ok: boolean; message: string };

const fail = (message: string): SpecialistProfileState => ({ ok: false, message });
const done = (message: string): SpecialistProfileState => ({ ok: true, message });

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
    .select("id,status")
    .eq("id", specialistId)
    .maybeSingle();
  if (!data) return null;
  return { supabase, id: data.id as string, status: data.status as string };
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

  // Licence details are only editable while the application is pending; after
  // approval they are locked (a DB trigger enforces the same rule).
  if (me.status === "pending") {
    const mode = text(fd, "license_mode", 20);
    if (mode !== "own" && mode !== "accredited") return fail("Choose how you're licensed.");
    const expiry = parseDateOnly(text(fd, "license_expiry", 10));
    if (expiry === undefined) return fail("Enter the licence expiry as a valid date.");
    const licenseNo = text(fd, "license_no", PROFILE_LIMITS.licenseNo) || null;
    if (mode === "own" && !licenseNo) return fail("Enter your PRC licence number.");
    update.license_mode = mode;
    update.license_no = licenseNo;
    update.license_expiry = expiry;
  }

  const { data, error } = await me.supabase
    .from("specialists")
    .update(update)
    .eq("id", me.id)
    .select("id");
  if (error) return fail(error.message);
  if (!data || data.length === 0) return fail("Your profile wasn't saved. Try again.");

  revalidatePath("/dashboard/specialist/profile");
  revalidatePath("/dashboard/specialist");
  revalidatePath("/team");
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
  revalidatePath("/team");
  return done("Photo updated.");
}
