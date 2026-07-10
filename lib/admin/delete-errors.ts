const blockedDeleteMessages: Record<string, string> = {
  owners:
    "This owner still has related properties, documents, statements, or other records. Remove or reassign those records first, then try deleting the owner again.",
  properties:
    "This property still has related units, leases, documents, tickets, or financial records. Remove or reassign those records first, then try deleting the property again.",
};

export function blockedDeleteMessage(table: string) {
  return (
    blockedDeleteMessages[table] ??
    "This record still has related data. Remove or reassign those records first, then try deleting it again."
  );
}
