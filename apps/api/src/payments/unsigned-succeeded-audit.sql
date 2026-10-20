-- EC-APP-1-API-WEBHOOK — read-only.
-- stripe_webhook_events stores the Stripe event id (evt_…) only.
-- It does not store the PaymentIntent id, so a join to a signed event is impossible.
-- A signed payment_intent.succeeded path sets provider_ref to Stripe's pi_… id
-- before the webhook runs. Anything SUCCEEDED without a pi_ ref did not come
-- from that signed handler (the unsigned DEV body uses dev_pi_…).
-- This does not prove every pi_ row was signed. It counts the rows that
-- cannot have been.

SELECT count(*) AS succeeded_without_stripe_pi_ref
FROM payment_intents
WHERE status = 'succeeded'
  AND (provider_ref IS NULL OR provider_ref NOT LIKE 'pi_%');
