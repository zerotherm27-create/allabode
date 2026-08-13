-- The public listing page's "Highlights" section hardcoded "Clean title &
-- documents" for every listing, regardless of whether that was actually
-- true — a compliance-risky claim to make unconditionally. Make it a
-- per-listing flag instead. Defaults to true so every existing listing
-- keeps showing it exactly as before; staff can uncheck it per listing
-- going forward.
alter table listings add column if not exists clean_title boolean not null default true;
