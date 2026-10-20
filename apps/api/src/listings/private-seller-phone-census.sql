-- EC-APP-1-API-M1 — read-only census. Do not UPDATE.
-- Published listings whose agentId user has no verified, unexpired REA_MEDIATORE.
-- A private seller is that user. Phone exposure is the second count.
--
-- Production read 2026-09-28 on easycasa-ita-db-1 (SELECT only):
--   published_without_rea = 118
--   published_private_with_phone = 0
--   published listings total = 118
--   share_links with a non-empty agent_snapshot phone = 0
-- Seller-notification decision (v1 §4): no stored private phone was found.
-- Re-run these statements before deploy if the data may have changed.

-- 1. Published listings whose publisher has no professional REA credential.
SELECT count(*) AS published_without_rea
FROM listings l
JOIN users u ON u.id = l.agent_id
WHERE l.status = 'published'
  AND NOT EXISTS (
    SELECT 1
    FROM professionals p
    JOIN credentials c ON c.professional_id = p.id
    WHERE p.user_id = u.id
      AND c.type = 'REA_MEDIATORE'
      AND c.status = 'verified'
      AND (c.expires_at IS NULL OR c.expires_at > now())
  );

-- 2. Of those, how many have a non-empty users.phone (the number the slug page could show).
SELECT count(*) AS published_private_with_phone
FROM listings l
JOIN users u ON u.id = l.agent_id
WHERE l.status = 'published'
  AND u.phone IS NOT NULL
  AND btrim(u.phone) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM professionals p
    JOIN credentials c ON c.professional_id = p.id
    WHERE p.user_id = u.id
      AND c.type = 'REA_MEDIATORE'
      AND c.status = 'verified'
      AND (c.expires_at IS NULL OR c.expires_at > now())
  );
