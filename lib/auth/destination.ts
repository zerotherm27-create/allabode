import type { PortalRole } from "@/lib/auth/role";

function isSafeRelativePath(path: string) {
  return path.startsWith("/") && !path.startsWith("//");
}

export function resolvePostAuthRedirect(
  role: PortalRole | null,
  requestedNext: string | null,
  fallback: string
) {
  if (!requestedNext || !isSafeRelativePath(requestedNext)) return fallback;

  if (role === "staff" && requestedNext.startsWith("/admin")) return requestedNext;
  if (role === "owner" && requestedNext.startsWith("/dashboard/owner")) return requestedNext;
  if (role === "tenant" && requestedNext.startsWith("/dashboard/tenant")) return requestedNext;
  if (!role && requestedNext === "/portal") return requestedNext;

  return fallback;
}
