-- Expand payout_status to allow 'carried_forward'
DO $$
BEGIN
  ALTER TABLE statements_of_account
    DROP CONSTRAINT IF EXISTS soa_payout_status_check;

  ALTER TABLE statements_of_account
    ADD CONSTRAINT soa_payout_status_check
    CHECK (payout_status IN (
      'pending','processing','paid','collected','refund_pending','carried_forward'
    ));
END $$;
