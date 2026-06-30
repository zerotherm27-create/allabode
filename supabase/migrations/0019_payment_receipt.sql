-- Add payment_for (description of what the payment covers) and
-- receipt_pdf_path (storage key for the generated acknowledgement receipt PDF)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_for text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_pdf_path text;
