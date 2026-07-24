-- Phase: multi-axis property taxonomy — extend transaction_type enum.
-- Must be a separate migration from column/backfill SQL: PostgreSQL forbids using
-- new enum labels in the same transaction that ADD VALUE runs in (0024 uses auction).

ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'auction';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'bare_ownership';
