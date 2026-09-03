/** Phase 0 metric names — counters only. No PII in labels. */

export const TRIAL_METRIC_NAMES = {
  grantsTotal: 'aste_trial_grants_total',
  grantsByDecision: 'aste_trial_grants_decision',
  distinctCanonical: 'aste_trial_distinct_canonical',
  distinctAccounts: 'aste_trial_distinct_accounts',
  ipBucketsMulti: 'aste_trial_ip_buckets_multi_30d',
  trialToPurchase: 'aste_trial_to_purchase',
  holdOverturnRate: 'aste_trial_hold_overturn_rate',
  reviewAgeSeconds: 'aste_trial_review_age_seconds',
} as const;

export const ABUSE_COUNTER_RETENTION_DAYS = 90;
export const ABUSE_SALT_ROTATION_DAYS = 30;
export const TRIAL_GRANT_RETENTION = 'account_lifetime' as const;
