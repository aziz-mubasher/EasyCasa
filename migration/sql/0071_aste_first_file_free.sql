-- First-file-free grant uses the same credit ledger as a paid pack.
ALTER TABLE aste_credit_ledger
  DROP CONSTRAINT IF EXISTS aste_credit_ledger_reason_chk;

ALTER TABLE aste_credit_ledger
  ADD CONSTRAINT aste_credit_ledger_reason_chk CHECK (
    reason IN ('stripe_purchase', 'report_unlock', 'admin_adjust', 'first_file_free')
  );
