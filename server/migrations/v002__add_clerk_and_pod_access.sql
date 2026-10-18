-- Existing records are deliberately unclaimed and private; no email/ID inference.
ALTER TABLE app_user ADD COLUMN clerk_user_id VARCHAR(255);
ALTER TABLE app_user ADD CONSTRAINT uq_user_clerk UNIQUE (clerk_user_id);
ALTER TABLE pod ADD COLUMN owner_user_id BIGINT REFERENCES app_user(user_id);
ALTER TABLE pod ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pod ADD CONSTRAINT chk_public_pod_owner CHECK (NOT is_public OR owner_user_id IS NOT NULL);
