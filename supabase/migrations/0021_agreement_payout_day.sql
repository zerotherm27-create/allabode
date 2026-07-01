-- Payout schedule for a signed Property Management Agreement is always
-- "Monthly" — the owner no longer picks a schedule. The specific day of
-- the month is set by staff (All Abode), not the owner, so it lives in its
-- own column rather than inside the owner-editable annex_c jsonb blob:
-- save_agreement_draft() overwrites annex_c wholesale on every "Next" click
-- during the owner's flow, which would silently wipe an admin-set value if
-- it were stored there instead.
alter table agreements add column if not exists payout_day integer
  check (payout_day is null or (payout_day >= 1 and payout_day <= 31));
