-- Allow a notice to carry a PDF attachment, stored via the existing
-- `documents` table/bucket (entity_type = 'notice'). Published notices are
-- already readable by any authenticated portal user with no ownership
-- scoping (see 0007's "published notices visible" policy) — this mirrors
-- that same rule for a notice's attached document so it's downloadable by
-- the same audience that can see the notice itself.

create policy "portal reads notice-attached documents" on documents for select
  using (
    entity_type = 'notice' and exists (
      select 1 from notices n
      where n.id = documents.entity_id
        and n.published_at is not null
        and (n.expires_at is null or n.expires_at > now())
    )
  );
