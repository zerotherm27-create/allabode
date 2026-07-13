-- Adds a bank-details section to quotations, matching the same "Bank Details
-- for Payment" table already shown on the Tenancy/Parking/Short-Term-Rental
-- agreement PDFs. Default matches lib/pm/tenancy-clauses.ts's
-- DEFAULT_BANK_DETAILS exactly, so a freshly created quotation prints the
-- same account info as the other flows unless staff override it.

alter table quotations
  add column bank_details jsonb not null default
    '{"name":"All Abode Brokerage and Valuation OPC","bank":"Union Bank of the Philippines","branch":"JTKC Building, Pasong Tamo Branch","accountNumber":"0020 2003 7938"}'::jsonb;
