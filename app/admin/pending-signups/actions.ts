"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AssignRole = "owner" | "tenant" | "staff";

export type AssignPendingSignupState = {
  ok?: boolean;
  message?: string;
};

function field(fd: FormData, key: string) {
  const value = fd.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function assertStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) throw new Error("Staff access required");
}

async function getAuthUser(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw new Error(error.message);
  if (!data.user?.email) throw new Error("Auth user has no email");
  return data.user;
}

async function assertNoConflictingLink(table: "owners" | "tenants", email: string, userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(table)
    .select("id,auth_user_id")
    .ilike("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.auth_user_id && data.auth_user_id !== userId) {
    throw new Error(`That ${table.slice(0, -1)} email is already linked to another account`);
  }
  return data as { id: string; auth_user_id: string | null } | null;
}

async function assignPendingSignupCore(fd: FormData) {
  await assertStaff();

  const userId = field(fd, "user_id");
  const role = field(fd, "role") as AssignRole;
  if (!userId) throw new Error("Missing user id");
  if (!["owner", "tenant", "staff"].includes(role)) throw new Error("Invalid role");

  const admin = createAdminClient();
  const authUser = await getAuthUser(admin, userId);
  const email = authUser.email!.trim().toLowerCase();
  const name =
    field(fd, "name") ||
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    email;

  if (role === "staff") {
    const { error } = await admin.from("users").upsert({
      id: authUser.id,
      email,
      name,
      role: "staff",
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/pending-signups");
    revalidatePath("/admin");
    return { role, email };
  }

  const table = role === "owner" ? "owners" : "tenants";
  const existing = await assertNoConflictingLink(table, email, authUser.id);

  const payload = { name, email, auth_user_id: authUser.id };
  const { error } = existing
    ? await admin.from(table).update(payload).eq("id", existing.id)
    : await admin.from(table).insert(payload);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/pending-signups");
  revalidatePath(role === "owner" ? "/admin/owners" : "/admin/tenants");

  return { role, email };
}

export async function assignPendingSignup(fd: FormData) {
  await assignPendingSignupCore(fd);
}

export async function assignPendingSignupWithState(
  _prevState: AssignPendingSignupState,
  fd: FormData
): Promise<AssignPendingSignupState> {
  try {
    const { role, email } = await assignPendingSignupCore(fd);
    return {
      ok: true,
      message: `Assigned ${email} as ${role}.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not assign this signup.",
    };
  }
}
