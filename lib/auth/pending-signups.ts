type AuthUser = {
  id: string;
  email?: string | null;
  created_at?: string;
  app_metadata?: { provider?: string; providers?: string[] };
  email_confirmed_at?: string | null;
  user_metadata?: {
    full_name?: string;
    name?: string;
    display_name?: string;
    avatar_url?: string;
  };
};

type LinkedRecord = {
  id: string;
  email?: string | null;
  auth_user_id?: string | null;
};

export type PendingSignup = {
  id: string;
  email: string;
  displayName: string;
  providers: string[];
  confirmed: boolean;
  createdAt: string;
};

function normalizeEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase();
}

function displayNameFor(user: AuthUser, email: string) {
  return (
    user.user_metadata?.full_name?.trim() ||
    user.user_metadata?.name?.trim() ||
    user.user_metadata?.display_name?.trim() ||
    email
  );
}

function providersFor(user: AuthUser) {
  const providers = user.app_metadata?.providers;
  if (providers && providers.length > 0) return providers;
  return user.app_metadata?.provider ? [user.app_metadata.provider] : [];
}

function hasRecordForUser(records: LinkedRecord[], userId: string, email: string) {
  return records.some((record) => {
    if (record.auth_user_id === userId) return true;
    if (record.id === userId) return true;
    return normalizeEmail(record.email) === email;
  });
}

export function buildPendingSignups({
  authUsers,
  owners,
  tenants,
  staff,
}: {
  authUsers: AuthUser[];
  owners: LinkedRecord[];
  tenants: LinkedRecord[];
  staff: LinkedRecord[];
}): PendingSignup[] {
  return authUsers
    .filter((user) => {
      const email = normalizeEmail(user.email);
      if (!email) return false;
      return !(
        hasRecordForUser(owners, user.id, email) ||
        hasRecordForUser(tenants, user.id, email) ||
        hasRecordForUser(staff, user.id, email)
      );
    })
    .map((user) => {
      const email = normalizeEmail(user.email);
      return {
        id: user.id,
        email,
        displayName: displayNameFor(user, email),
        providers: providersFor(user),
        confirmed: Boolean(user.email_confirmed_at),
        createdAt: user.created_at ?? "",
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

