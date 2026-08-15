import {
  pgTable, pgEnum, pgSchema, uuid, text, integer, numeric, timestamp, jsonb, boolean,
  doublePrecision, bigint, primaryKey, uniqueIndex, index, date,
} from 'drizzle-orm/pg-core';

export const listingStatus = pgEnum('listing_status', [
  'draft',
  'published',
  'unpublished',
  'sold',
  'archived',
]);
export const transactionType = pgEnum('transaction_type', ['sale', 'rent', 'auction', 'bare_ownership']);
export const userRole = pgEnum('user_role', [
  'buyer', 'seller', 'agent', 'partner', 'pro_marketer', 'admin', 'professional',
]);
export const mediaType = pgEnum('media_type', ['image', 'floorplan', 'video']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  wpUserId: bigint('wp_user_id', { mode: 'number' }),
  email: text('email'),
  displayName: text('display_name'),
  slug: text('slug'),
  role: userRole('role').notNull().default('buyer'),
  phone: text('phone'),
  /**
   * EC-19b — Meta wa_id form (E.164 digits, no '+'). Nullable; unparseable stays null.
   * Indexed for DSAR match against wa_inbound_messages.wa_id. Never expose in API JSON.
   */
  phoneE164: text('phone_e164'),
  /** EC-12 — set after WhatsApp/email OTP success. */
  phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
  /** EC-13 — identity review success. */
  identityVerifiedAt: timestamp('identity_verified_at', { withTimezone: true }),
  identityMethod: text('identity_method'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  membershipTier: text('membership_tier'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  phoneE164Idx: index('users_phone_e164_idx').on(t.phoneE164),
}));

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
});

export const regions = pgTable('regions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
});

/** Official Italian province (sigla = slug, e.g. BS = Brescia). */
export const provinces = pgTable('provinces', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  regionSlug: text('region_slug').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  wpPostId: bigint('wp_post_id', { mode: 'number' }),
  slug: text('slug'),
  title: text('title').notNull(),
  description: text('description'),
  categoryId: uuid('category_id'),
  regionId: uuid('region_id'),
  agentId: uuid('agent_id'),
  /** Listing owner for enquiry routing (Phase 24); defaults from agentId. */
  ownerUserId: uuid('owner_user_id'),
  mediatorUserId: uuid('mediator_user_id'),
  status: listingStatus('status').notNull().default('draft'),
  transactionType: transactionType('transaction_type'),
  price: numeric('price'),
  currency: text('currency').notNull().default('EUR'),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  rooms: integer('rooms'),
  sizeSqm: numeric('size_sqm'),
  /** Total / plot / commercial surface (m²) — distinct from built area sizeSqm. */
  surfaceSqm: numeric('surface_sqm'),
  landSqm: numeric('land_sqm'),
  floor: text('floor'),
  totalFloors: integer('total_floors'),
  yearBuilt: integer('year_built'),
  yearRenovated: integer('year_renovated'),
  energyClass: text('energy_class'),
  energyPerformanceKwhM2Y: numeric('energy_performance_kwh_m2_y'),
  foglio: text('foglio'),
  particella: text('particella'),
  subalterno: text('subalterno'),
  condition: text('condition'),
  /** Destinazione d'uso — docs/taxonomy.md axis 2. */
  assetClass: text('asset_class'),
  /** NIB financing modes — multi-select (docs/taxonomy.md axis 5). */
  financingOptions: text('financing_options').array().notNull().default([]),
  /** Rental contract type when transaction includes rent. */
  leaseType: text('lease_type'),
  sellerType: text('seller_type'),
  /** How it can change hands — multi (e.g. sale + rent). */
  transactionTypes: text('transaction_types').array().notNull().default([]),
  features: text('features').array(),
  attributes: jsonb('attributes'),
  condominioFeesCents: integer('condominio_fees_cents'),
  heating: text('heating'),
  propertyType: text('property_type'),
  hasFloorPlan: boolean('has_floor_plan').notNull().default(false),
  address: text('address'),
  /** IANA TZ for viewing availability wall-clock (EC-4). */
  timezone: text('timezone').notNull().default('Europe/Rome'),
  city: text('city'),
  province: text('province'),
  postalCode: text('postal_code'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  qrCodeUrl: text('qr_code_url'),
  featuredUntil: timestamp('featured_until', { withTimezone: true }),
  source: text('source').notNull().default('native'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  /** First ever publish — immutable once set (EC-S-T13 relist invariant). */
  firstPublishedAt: timestamp('first_published_at', { withTimezone: true }),
  unpublishedAt: timestamp('unpublished_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id'),
  type: mediaType('type').notNull().default('image'),
  url: text('url').notNull(),
  originalWpUrl: text('original_wp_url'),
  position: integer('position').notNull().default(0),
  width: integer('width'),
  height: integer('height'),
  alt: text('alt'),
  placeholder: text('placeholder'),
  /** Content-addressed storage key (T10). */
  storageKey: text('storage_key'),
  sha256: text('sha256'),
  /** Perceptual hashes (T12) — 64-bit stored as bigint. */
  dhash: bigint('dhash', { mode: 'bigint' }),
  phash: bigint('phash', { mode: 'bigint' }),
  dhashBucket: integer('dhash_bucket'),
  ownerUserId: uuid('owner_user_id'),
  moderationFlag: text('moderation_flag'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const favorites = pgTable(
  'favorites',
  {
    userId: uuid('user_id').notNull(),
    listingId: uuid('listing_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.listingId] }),
    listingCreatedIdx: index('favorites_listing_created_idx').on(t.listingId, t.createdAt),
  }),
);

export const savedSearches = pgTable('saved_searches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  /** Phase 20 criteria: { filters, bbox?, polygon? } (legacy column name: query). */
  query: jsonb('query').notNull().default({}),
  notify: boolean('notify').notNull().default(true),
  frequency: text('frequency').notNull().default('instant'),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const alertLogs = pgTable(
  'alert_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    savedSearchId: uuid('saved_search_id').notNull(),
    listingId: uuid('listing_id').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex('alert_logs_saved_listing_uidx').on(t.savedSearchId, t.listingId),
  }),
);

/** Seeker interest on a listing → qualify → convert to Phase 10 order (Phase 24). */
export const enquiries = pgTable(
  'enquiries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id').notNull(),
    seekerUserId: uuid('seeker_user_id').notNull(),
    ownerUserId: uuid('owner_user_id').notNull(),
    mediatorUserId: uuid('mediator_user_id'),
    intent: text('intent').notNull(),
    status: text('status').notNull().default('NEW'),
    message: text('message').notNull(),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    contactWhatsappAvailable: boolean('contact_whatsapp_available').notNull().default(false),
    orderId: uuid('order_id'),
    /** Banks4All tracking token (EC-1). Never store response bodies. */
    b4aToken: text('b4a_token'),
    b4aBandMaxCents: integer('b4a_band_max_cents'),
    b4aExpiresAt: date('b4a_expires_at', { mode: 'string' }),
    b4aCheckedAt: timestamp('b4a_checked_at', { withTimezone: true }),
    /** EC-S-T20 — four-field attestation display (T04 row 6). */
    b4aHolderInitials: text('b4a_holder_initials'),
    b4aStatus: text('b4a_status'),
    /** EC-S-T20 — seller inbox read marker. */
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    listingCreatedIdx: index('enquiries_listing_created_idx').on(t.listingId, t.createdAt),
  }),
);

/**
 * EC-S-T23 — day-bucketed listing analytics (aggregates non-personal).
 * Raw visitor events (if added later) retain 14m per T05; this table has no visitor ids.
 */
export const listingAnalyticsDaily = pgTable(
  'listing_analytics_daily',
  {
    listingId: uuid('listing_id').notNull(),
    day: date('day', { mode: 'string' }).notNull(),
    views: integer('views').notNull().default(0),
    saves: integer('saves').notNull().default(0),
    enquiries: integer('enquiries').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.listingId, t.day] }),
    dayIdx: index('listing_analytics_daily_day_idx').on(t.day),
  }),
);


// ---------------- Phase 5 ----------------
export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull(),
  name: text('name').notNull(),
  stripePriceId: text('stripe_price_id'),
  priceCents: integer('price_cents').notNull().default(0),
  currency: text('currency').notNull().default('EUR'),
  interval: text('interval').notNull().default('month'),
  features: jsonb('features'),
});

export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  tier: text('tier').notNull(),
  status: text('status').notNull().default('active'),
  planId: uuid('plan_id'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  vatId: text('vat_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * EC-S-T27 — webhook-maintained seller subscription for entitlements.
 * Authority for resolveTier / quotaConfigFor — never read Stripe live.
 */
export const sellerSubscription = pgTable('seller_subscription', {
  userId: uuid('user_id').primaryKey(),
  status: text('status').notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripeCustomerId: text('stripe_customer_id'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const featuredPlacements = pgTable('featured_placements', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').notNull(),
  kind: text('kind').notNull().default('featured'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  stripePaymentId: text('stripe_payment_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** EC-S-T26 — flat-fee listing boost (pauseable; ranking + DSA label). */
export const listingBoost = pgTable('listing_boost', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  stripePaymentRef: text('stripe_payment_ref'),
  status: text('status').notNull().default('active'),
  pausedAt: timestamp('paused_at', { withTimezone: true }),
  remainingMs: bigint('remaining_ms', { mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id'),
  buyerId: uuid('buyer_id').notNull(),
  agentId: uuid('agent_id'),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull(),
  senderId: uuid('sender_id').notNull(),
  body: text('body').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  type: text('type').notNull(),
  channel: text('channel').notNull().default('in_app'),
  payload: jsonb('payload'),
  status: text('status').notNull().default('pending'),
  readAt: timestamp('read_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Expo / web push tokens for the universal app (Phase 7). */
export const devices = pgTable(
  'devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    token: text('token').notNull(),
    platform: text('platform').notNull(), // ios | android | web
    locale: text('locale').notNull().default('it'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userToken: uniqueIndex('devices_user_token_uidx').on(t.userId, t.token),
  }),
);

export const partnerProfiles = pgTable('partner_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  company: text('company'),
  tier: text('tier').notNull().default('partner'),
  regions: text('regions').array(),
  payoutRef: text('payout_ref'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** EC-S-T28/T29 — curated informational partner directory (no fees / tracking). */
export const partnerDirectory = pgTable('partner_directory', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category').notNull(),
  name: text('name').notNull(),
  province: text('province').notNull(),
  credentials: text('credentials'),
  contact: text('contact').notNull(),
  active: boolean('active').notNull().default(true),
  /** G3 row 9 — flat-fee presence; labelled + sorts above unpaid. */
  paidPlacement: boolean('paid_placement').notNull().default(false),
  /** PP-1 — claiming partner user (null for admin-seeded rows). */
  userId: uuid('user_id'),
  /** PP-1 — idempotent webhook activation. */
  stripePaymentId: text('stripe_payment_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id'),
  buyerId: uuid('buyer_id'),
  partnerId: uuid('partner_id'),
  status: text('status').notNull().default('new'),
  score: integer('score').notNull().default(0),
  source: text('source'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const payouts = pgTable('payouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').notNull(),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull().default('EUR'),
  period: text('period').notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------- Phase 8 — Property / fascicolo / service catalog ----------------
export const propertyDealType = pgEnum('property_deal_type', ['sale', 'rent']);
export const propertyStatus = pgEnum('property_status', [
  'draft', 'fascicolo_intake', 'compliance_review', 'valuation_ready',
  'published', 'under_negotiation', 'closing', 'sold', 'archived', 'withdrawn',
]);
export const servicePriceModel = pgEnum('service_price_model', ['fixed', 'provvigione', 'passthrough']);
export const serviceOrderStatus = pgEnum('service_order_status', [
  'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled',
]);
export const legalBasis = pgEnum('legal_basis', [
  'mediazione', 'mandato_oneroso', 'review_required',
]);
export const mandateStatus = pgEnum('mandate_status', [
  'draft', 'sent', 'signed', 'withdrawn', 'expired',
]);

export const properties = pgTable('properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull(),
  listingId: uuid('listing_id'),
  dealType: propertyDealType('deal_type').notNull().default('sale'),
  status: propertyStatus('status').notNull().default('draft'),
  inCondominio: boolean('in_condominio').notNull().default(false),
  title: text('title'),
  province: text('province'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const documentAssets = pgTable('document_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull(),
  typeCode: text('type_code').notNull(),
  url: text('url').notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const serviceCatalogItems = pgTable('service_catalog_items', {
  code: text('code').primaryKey(),
  labelEn: text('label_en').notNull(),
  labelIt: text('label_it').notNull(),
  category: text('category').notNull(),
  priceModel: servicePriceModel('price_model').notNull(),
  amountCents: integer('amount_cents'),
  ratePercent: doublePrecision('rate_percent'),
  ivaApplicable: boolean('iva_applicable').notNull().default(true),
  active: boolean('active').notNull().default(true),
  legalBasis: legalBasis('legal_basis').notNull().default('review_required'),
});

export const servicePackages = pgTable('service_packages', {
  code: text('code').primaryKey(),
  labelEn: text('label_en').notNull(),
  labelIt: text('label_it').notNull(),
  bundleFixedCents: integer('bundle_fixed_cents'),
  active: boolean('active').notNull().default(true),
});

export const packageItems = pgTable(
  'package_items',
  {
    packageCode: text('package_code').notNull(),
    itemCode: text('item_code').notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.packageCode, t.itemCode] }) }),
);

export const serviceOrders = pgTable('service_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Owner fascicolo root — nullable for buyer-side (listing-rooted) orders. */
  propertyId: uuid('property_id'),
  /** Published listing root — used by enquiry → buyer orders (Phase 26/31). */
  listingId: uuid('listing_id'),
  packageCode: text('package_code'),
  status: serviceOrderStatus('status').notNull().default('quoted'),
  itemCodes: text('item_codes').array().notNull().default([]),
  dueNowGrossCents: integer('due_now_gross_cents').notNull().default(0),
  estimatedTotalGrossCents: integer('estimated_total_gross_cents').notNull().default(0),
  clientFiscalCode: text('client_fiscal_code'),
  dueNowNetCents: integer('due_now_net_cents').notNull().default(0),
  /** Logged-in buyer on public catalog checkout (K EC 1.38). */
  userId: uuid('user_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const serviceOrderLines = pgTable('service_order_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull(),
  itemCode: text('item_code').notNull(),
  kind: text('kind').notNull(),
  netCents: integer('net_cents').notNull(),
  ivaCents: integer('iva_cents').notNull(),
  grossCents: integer('gross_cents').notNull(),
  estimated: boolean('estimated').notNull().default(false),
});

export const mandates = pgTable('mandates', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().unique(),
  propertyId: uuid('property_id').notNull(),
  types: text('types').array().notNull().default([]),
  reviewRequiredItems: text('review_required_items').array().notNull().default([]),
  status: mandateStatus('status').notNull().default('draft'),
  exclusive: boolean('exclusive').notNull().default(false),
  durationMonths: integer('duration_months').notNull(),
  signatureEnvelopeId: text('signature_envelope_id'),
  signingUrl: text('signing_url'),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------- Phase 11 — professionals / assignments ----------------
export const verificationStatus = pgEnum('verification_status', [
  'pending', 'verified', 'rejected',
]);
export const assignmentStatus = pgEnum('assignment_status', [
  'requested', 'assigned', 'in_progress', 'delivered', 'approved',
]);

export const professionals = pgTable('professionals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  displayName: text('display_name').notNull(),
  coverageProvinces: text('coverage_provinces').array().notNull().default([]),
  activeAssignments: integer('active_assignments').notNull().default(0),
  maxConcurrent: integer('max_concurrent').notNull().default(5),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const credentials = pgTable('credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').notNull(),
  type: text('type').notNull(),
  status: verificationStatus('status').notNull().default('pending'),
  reference: text('reference'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  /** EC-13 — supporting document link. */
  documentUrl: text('document_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const serviceTasks = pgTable('service_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull(),
  propertyId: uuid('property_id').notNull(),
  itemCode: text('item_code').notNull(),
  requiredCredential: text('required_credential').notNull(),
  province: text('province').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull(),
  professionalId: uuid('professional_id'),
  status: assignmentStatus('status').notNull().default('requested'),
  deliverableUrl: text('deliverable_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const credentialPolicies = pgTable('credential_policies', {
  itemCode: text('item_code').primaryKey(),
  requiredCredential: text('required_credential').notNull().default('NONE'),
});

/** EC-10 — demand signal when a catalogue item is unavailable in a province. */
export const serviceDemandLog = pgTable('service_demand_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemCode: text('item_code').notNull(),
  province: text('province').notNull(),
  userId: uuid('user_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** EC-11 — append-only personal-data / admin access audit. */
export const authorityAuditLog = pgTable('authority_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id'),
  actorSub: text('actor_sub'),
  subjectUserId: uuid('subject_user_id'),
  resource: text('resource').notNull(),
  action: text('action').notNull(),
  reason: text('reason'),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** EC-17 — inbound WhatsApp messages (thin store; no queue). */
export const waInboundMessages = pgTable(
  'wa_inbound_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    providerMessageId: text('provider_message_id').notNull(),
    waId: text('wa_id').notNull(),
    /** EC-19a — HMAC handle for list/detail routing (nullable until backfill). */
    waHandle: text('wa_handle'),
    phoneNumberId: text('phone_number_id').notNull(),
    messageType: text('message_type').notNull(),
    body: text('body'),
    /** Meta contacts[].profile.name when present on the webhook payload. */
    contactName: text('contact_name'),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
    windowExpiresAt: timestamp('window_expires_at', { withTimezone: true }).notNull(),
    autoRepliedAt: timestamp('auto_replied_at', { withTimezone: true }),
    forwardedAt: timestamp('forwarded_at', { withTimezone: true }),
    forwardError: text('forward_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    providerMessageIdKey: uniqueIndex('wa_inbound_messages_provider_message_id_key').on(
      t.providerMessageId,
    ),
    waHandleIdx: index('wa_inbound_messages_wa_handle_idx').on(t.waHandle),
  }),
);

/** EC WhatsApp — outbound free-form bodies shown in the admin thread. */
export const waThreadOutbound = pgTable(
  'wa_thread_outbound',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    waId: text('wa_id').notNull(),
    waHandle: text('wa_handle'),
    providerMessageId: text('provider_message_id'),
    body: text('body').notNull(),
    source: text('source').notNull(),
    actorUserId: uuid('actor_user_id'),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    providerMessageIdKey: uniqueIndex('wa_thread_outbound_provider_message_id_key').on(
      t.providerMessageId,
    ),
    waIdSentAtIdx: index('wa_thread_outbound_wa_id_sent_at_idx').on(t.waId, t.sentAt),
  }),
);

/** EC-12 — hashed phone OTP challenges (WhatsApp / email fallback). */
export const phoneOtpChallenges = pgTable('phone_otp_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  phoneE164: text('phone_e164').notNull(),
  codeHash: text('code_hash').notNull(),
  channel: text('channel').notNull(),
  /** Cloud API wamid when sent via WhatsApp (Phase B). */
  providerMessageId: text('provider_message_id'),
  /** Why email was used instead of WhatsApp (Phase B). */
  fallbackReason: text('fallback_reason'),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** EC-16 — WhatsApp Cloud send/status (no body content). */
export const whatsappMessages = pgTable('whatsapp_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerMessageId: text('provider_message_id').unique(),
  templateName: text('template_name').notNull(),
  locale: text('locale').notNull(),
  toUserId: uuid('to_user_id'),
  relatedType: text('related_type'),
  relatedId: uuid('related_id'),
  status: text('status').notNull(),
  failureReason: text('failure_reason'),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  statusUpdatedAt: timestamp('status_updated_at', { withTimezone: true }),
});

/** EC-13 — append-only admin portal audit. */
export const adminAuditLog = pgTable('admin_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  subjectUserId: uuid('subject_user_id'),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** EC-13 — DPO DSAR queue. */
export const dsarAdminRequests = pgTable('dsar_admin_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  subjectUserId: uuid('subject_user_id'),
  subjectEmail: text('subject_email').notNull(),
  requestType: text('request_type').notNull(),
  status: text('status').notNull().default('open'),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),
  responseNote: text('response_note'),
  responseSentAt: timestamp('response_sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** EC-13 — DSA listing report / takedown queue. */
export const listingReports = pgTable('listing_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').notNull(),
  reporterUserId: uuid('reporter_user_id'),
  reporterEmail: text('reporter_email'),
  category: text('category').notNull(),
  freeText: text('free_text'),
  status: text('status').notNull().default('open'),
  decisionMotivation: text('decision_motivation'),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  decidedBy: uuid('decided_by'),
  notifiedAt: timestamp('notified_at', { withTimezone: true }),
  contestReceivedAt: timestamp('contest_received_at', { withTimezone: true }),
  contestNote: text('contest_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** EC-13 — manual identity verification queue. */
export const identityReviewRequests = pgTable('identity_review_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  accountName: text('account_name').notNull(),
  documentUrl: text('document_url').notNull(),
  status: text('status').notNull().default('pending'),
  rejectReason: text('reject_reason'),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  decidedBy: uuid('decided_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------- Phase 12 — rentals / AML ----------------
export const leaseType = pgEnum('lease_type', [
  'libero_4_4', 'concordato_3_2', 'transitorio', 'studenti',
]);
export const kycStatus = pgEnum('kyc_status', ['open', 'verified', 'escalated', 'cleared']);

export const leases = pgTable('leases', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull(),
  type: leaseType('type').notNull(),
  startAt: date('start_at', { mode: 'string' }).notNull(),
  durationMonths: integer('duration_months').notNull(),
  annualRentCents: integer('annual_rent_cents').notNull(),
  cedolareSecca: boolean('cedolare_secca').notNull().default(false),
  highTension: boolean('high_tension').notNull().default(false),
  apeAttached: boolean('ape_attached').notNull().default(false),
  signedAt: date('signed_at', { mode: 'string' }),
  registrationProtocollo: text('registration_protocollo'),
  registeredAt: timestamp('registered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const kycCases = pgTable('kyc_cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  subjectRef: text('subject_ref').notNull(),
  factors: jsonb('factors').notNull(),
  riskLevel: text('risk_level').notNull(),
  measure: text('measure').notNull(),
  mustEscalate: boolean('must_escalate').notNull().default(false),
  score: integer('score').notNull().default(0),
  status: kycStatus('status').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------- Phase 17 — payments / fattura elettronica ----------------
export const paymentStatus = pgEnum('payment_status', [
  'requires_payment', 'processing', 'succeeded', 'failed', 'refunded',
]);
export const paymentPurpose = pgEnum('payment_purpose', ['due_now', 'provvigione']);

export const stripeWebhookEvents = pgTable('stripe_webhook_events', {
  id: text('id').primaryKey(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const paymentIntents = pgTable('payment_intents', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull(),
  purpose: paymentPurpose('purpose').notNull(),
  amountCents: integer('amount_cents').notNull(),
  status: paymentStatus('status').notNull().default('requires_payment'),
  providerRef: text('provider_ref'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull(),
  paymentIntentId: uuid('payment_intent_id'),
  totaleDocumentoCents: integer('totale_documento_cents').notNull(),
  payload: jsonb('payload').notNull(),
  sdiProtocollo: text('sdi_protocollo'),
  transmittedAt: timestamp('transmitted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------- Phase 27 — Free AVM (OMI cache + valuation leads) ----------------
export const omiQuotes = pgTable(
  'omi_quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    comune: text('comune').notNull(),
    provincia: text('provincia').notNull(),
    type: text('type').notNull(),
    minPerM2Cents: integer('min_per_m2_cents').notNull(),
    maxPerM2Cents: integer('max_per_m2_cents').notNull(),
    period: text('period').notNull(),
    omiZone: text('omi_zone').notNull().default(''),
    linkZona: text('link_zona'),
    codTip: integer('cod_tip').notNull().default(0),
    descrTipologia: text('descr_tipologia'),
    stato: text('stato').notNull().default(''),
    rectified: boolean('rectified').notNull().default(false),
    geoLevel: text('geo_level').notNull().default('microzone'),
    /** source_row = imported CSV; zone_median = derived comune rollup (Phase 27.1). */
    basis: text('basis').notNull().default('source_row'),
    zonesUsed: integer('zones_used').notNull().default(1),
    licenceUrl: text('licence_url'),
    attribution: text('attribution').notNull().default('Fonte: Agenzia delle Entrate – OMI'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    naturalKey: uniqueIndex('idx_omi_quotes_natural_key').on(
      table.period,
      table.provincia,
      table.comune,
      table.omiZone,
      table.type,
      table.stato,
      table.codTip,
    ),
  }),
);

/** Verbatim zone-level OMI bands (Phase 27.1). geom filled later from open-licence perimeters. */
export const omiZoneQuotes = pgTable(
  'omi_zone_quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    period: text('period').notNull(),
    linkZona: text('link_zona').notNull(),
    regione: text('regione').notNull(),
    provincia: text('provincia').notNull(),
    comuneIstat: text('comune_istat'),
    comuneCat: text('comune_cat').notNull(),
    comune: text('comune').notNull(),
    zona: text('zona').notNull(),
    zonaDescr: text('zona_descr'),
    fascia: text('fascia').notNull(),
    microzona: text('microzona'),
    codTip: text('cod_tip').notNull(),
    descrTipologia: text('descr_tipologia').notNull(),
    stato: text('stato').notNull(),
    prevalent: boolean('prevalent').notNull(),
    saleMinPerM2Cents: integer('sale_min_per_m2_cents').notNull(),
    saleMaxPerM2Cents: integer('sale_max_per_m2_cents').notNull(),
    saleSurfaceBasis: text('sale_surface_basis'),
    rentMinPerM2Cents: integer('rent_min_per_m2_cents'),
    rentMaxPerM2Cents: integer('rent_max_per_m2_cents'),
    rentSurfaceBasis: text('rent_surface_basis'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    naturalKey: uniqueIndex('omi_zone_quotes_natural_uidx').on(
      table.period,
      table.linkZona,
      table.codTip,
      table.stato,
    ),
  }),
);

export const omiZonePolygons = pgTable('omi_zone_polygons', {
  id: uuid('id').primaryKey().defaultRandom(),
  linkZona: text('link_zona').notNull(),
  period: text('period').notNull(),
  comune: text('comune').notNull(),
  provincia: text('provincia').notNull(),
  /** PostGIS geometry stored via raw SQL on import; not mapped in Drizzle queries beyond existence checks. */
  licenceUrl: text('licence_url'),
  attribution: text('attribution').notNull().default('Fonte: Agenzia delle Entrate – OMI'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const valuationRequests = pgTable('valuation_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  contactEmail: text('contact_email'),
  comune: text('comune').notNull(),
  provincia: text('provincia').notNull(),
  subject: jsonb('subject').notNull(),
  estimate: jsonb('estimate').notNull(),
  pointCents: integer('point_cents').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** EC-21 — Analisi Aste waitlist + guide lead magnet. */
export const asteLeads = pgTable('aste_leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  language: text('language').notNull(),
  province: text('province'),
  buyerType: text('buyer_type'),
  consent: boolean('consent').notNull(),
  locale: text('locale').notNull(),
  guideToken: text('guide_token').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** EC-22 — user-owned auction analysis (dark behind ASTE_ANALYSIS_ENABLED). */
export const asteAnalyses = pgTable('aste_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  status: text('status').notNull().default('draft'),
  language: text('language').notNull(),
  register: text('register').notNull(),
  tribunale: text('tribunale'),
  rge: text('rge'),
  lotto: text('lotto'),
  /** EC-23b — user-selected lot label (NULL = unico). */
  lottoLabel: text('lotto_label'),
  dataAsta: date('data_asta'),
  termineOfferte: timestamp('termine_offerte', { withTimezone: true }),
  addressRaw: text('address_raw'),
  comune: text('comune'),
  provincia: text('provincia'),
  extraction: jsonb('extraction'),
  semaforo: jsonb('semaforo'),
  omiCheck: jsonb('omi_check'),
  /** EC-24 — optional buyer profile for buyer_readiness. */
  buyerProfile: jsonb('buyer_profile'),
  /** EC-24 — cached free-text translations by lang → path → string. */
  translations: jsonb('translations'),
  failureReason: text('failure_reason'),
  /** EC-23 — pipeline claim/retry count (max 2 then failed). */
  attempts: integer('attempts').notNull().default(0),
  /** EC-23 — when status entered processing (stale recovery). */
  processingStartedAt: timestamp('processing_started_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const asteDocuments = pgTable('aste_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id').notNull(),
  minioKey: text('minio_key').notNull(),
  originalFilename: text('original_filename').notNull(),
  docType: text('doc_type').notNull(),
  mime: text('mime').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  pageCount: integer('page_count'),
  ocrStatus: text('ocr_status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Schema only in EC-22 — embedding dim 1536 matches listings; populated by EC-23. */
export const asteDocChunks = pgTable('aste_doc_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull(),
  page: integer('page').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  text: text('text').notNull(),
  /** Stored as pgvector(1536); not written in EC-22. */
  embedding: text('embedding'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const asteGlossary = pgTable('aste_glossary', {
  id: uuid('id').primaryKey().defaultRandom(),
  termKey: text('term_key').notNull(),
  language: text('language').notNull(),
  register: text('register').notNull(),
  definition: text('definition').notNull(),
  counselReviewed: boolean('counsel_reviewed').notNull().default(false),
});

/** EC-25 — grounded Q&A messages (user + assistant) per analysis. */
export const asteChatMessages = pgTable('aste_chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  lang: text('lang').notNull(),
  citations: jsonb('citations'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** EC-27 — per-user Aste full-report credit balance. */
export const asteCreditBalances = pgTable('aste_credit_balances', {
  userId: uuid('user_id').primaryKey(),
  balance: integer('balance').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** EC-27 — append-only credit grants/consumptions. */
export const asteCreditLedger = pgTable(
  'aste_credit_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    delta: integer('delta').notNull(),
    reason: text('reason').notNull(),
    stripePaymentId: text('stripe_payment_id'),
    analysisId: uuid('analysis_id'),
    idempotencyKey: text('idempotency_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idempotencyUniq: uniqueIndex('aste_credit_ledger_idempotency_uniq').on(t.idempotencyKey),
    userIdx: index('aste_credit_ledger_user_idx').on(t.userId, t.createdAt),
  }),
);

/** EC-27 — entitled full-report unlock (re-view free). */
export const asteReportUnlocks = pgTable(
  'aste_report_unlocks',
  {
    userId: uuid('user_id').notNull(),
    analysisId: uuid('analysis_id').notNull(),
    creditLedgerId: uuid('credit_ledger_id'),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.analysisId] }),
  }),
);

// ---------------- Phase 29 — Viewings & scheduling ----------------
export const viewingAvailability = pgTable('viewing_availability', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').notNull(),
  weekday: integer('weekday').notNull(),
  startMinutes: integer('start_minutes').notNull(),
  endMinutes: integer('end_minutes').notNull(),
  /** EC-S T22 — max CONFIRMED viewings per concrete slot (default 1). */
  capacity: integer('capacity').notNull().default(1),
});

export const viewings = pgTable('viewings', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').notNull(),
  seekerUserId: uuid('seeker_user_id').notNull(),
  conductorUserId: uuid('conductor_user_id').notNull(),
  enquiryId: uuid('enquiry_id'),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  status: text('status').notNull().default('REQUESTED'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  icsSequence: integer('ics_sequence').notNull().default(0),
  reminder24hSentAt: timestamp('reminder_24h_sent_at', { withTimezone: true }),
  reminder2hSentAt: timestamp('reminder_2h_sent_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Append-only consent ledger — Phase 38 (GDPR Art. 7). */
export const consentRecords = pgTable('consent_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  subjectUserId: uuid('subject_user_id').notNull(),
  purpose: text('purpose').notNull(),
  granted: boolean('granted').notNull(),
  policyVersion: text('policy_version').notNull(),
  ipHash: text('ip_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** K EC 1.29 — branded public SmartLink pages. */
export const shareLinks = pgTable('share_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull(),
  listingId: uuid('listing_id').notNull(),
  createdBy: uuid('created_by').notNull(),
  agentSnapshot: jsonb('agent_snapshot').notNull().default({}),
  includeValuationBand: boolean('include_valuation_band').notNull().default(true),
  viewCount: integer('view_count').notNull().default(0),
  uniqueViewCount: integer('unique_view_count').notNull().default(0),
  lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

export const shareLinkViewDedup = pgTable(
  'share_link_view_dedup',
  {
    shareLinkId: uuid('share_link_id').notNull(),
    viewDate: date('view_date').notNull(),
    visitorHash: text('visitor_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.shareLinkId, t.viewDate, t.visitorHash] }),
  }),
);

/** K EC 4.1 — internal CRM (PostgreSQL schema `crm`). */
export const crmPg = pgSchema('crm');

export const crmContacts = crmPg.table('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  fullName: text('full_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  locale: text('locale').notNull().default('it'),
  source: text('source').notNull().default('manual'),
  ownerAdminId: uuid('owner_admin_id'),
  tags: text('tags').array().notNull().default([]),
  notesSummary: text('notes_summary'),
  /** FK → consent_records (purpose=marketing) for follow-up beyond Art. 6(1)(b). */
  marketingConsentId: uuid('marketing_consent_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  emailIdx: index('crm_contacts_email_idx').on(t.email),
}));

export const crmSeekerProfiles = crmPg.table('seeker_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').notNull(),
  searchIntent: jsonb('search_intent').notNull().default({}),
  firstEnquiryId: uuid('first_enquiry_id'),
  stage: text('stage').notNull().default('new_enquiry'),
  stageChangedAt: timestamp('stage_changed_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  stageIdx: index('crm_seeker_stage_idx').on(t.stage),
}));

export const crmOwnerProfiles = crmPg.table('owner_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').notNull(),
  stage: text('stage').notNull().default('prospect'),
  listingIds: uuid('listing_ids').array().notNull().default([]),
  preferredChannel: text('preferred_channel').notNull().default('email'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  stageIdx: index('crm_owner_stage_idx').on(t.stage),
}));

export const crmB4aReferrals = crmPg.table('b4a_referrals', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').notNull(),
  referredAt: timestamp('referred_at', { withTimezone: true }).notNull().defaultNow(),
  attestationStatus: text('attestation_status').notNull().default('none'),
  bandMaxCents: bigint('band_max_cents', { mode: 'number' }),
  attestationExpiresAt: timestamp('attestation_expires_at', { withTimezone: true }),
  holderInitials: text('holder_initials'),
  lastSweepAt: timestamp('last_sweep_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  statusIdx: index('crm_b4a_status_idx').on(t.attestationStatus),
}));

export const crmPartnerProfiles = crmPg.table('partner_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').notNull(),
  partnerType: text('partner_type').notNull().default('other'),
  stage: text('stage').notNull().default('prospect'),
  serviceZones: text('service_zones').array().notNull().default([]),
  vatNumber: text('vat_number'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  stageIdx: index('crm_partner_stage_idx').on(t.stage),
}));

export const crmActivities = crmPg.table('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').notNull(),
  type: text('type').notNull(),
  refTable: text('ref_table'),
  refId: uuid('ref_id'),
  body: text('body').notNull().default(''),
  actorAdminId: uuid('actor_admin_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  contactCreatedIdx: index('crm_activities_contact_created_idx').on(t.contactId, t.createdAt),
}));

export const crmTasks = crmPg.table('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').notNull(),
  title: text('title').notNull(),
  dueAt: timestamp('due_at', { withTimezone: true }),
  assigneeAdminId: uuid('assignee_admin_id'),
  status: text('status').notNull().default('open'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  assigneeIdx: index('crm_tasks_assignee_status_due_idx').on(t.assigneeAdminId, t.status, t.dueAt),
}));

export const crmAuditLog = crmPg.table('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorAdminId: uuid('actor_admin_id'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  detail: jsonb('detail').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});


/** EC-S-T06 — private seller profile; informativa version is the GDPR gate. */
export const sellerProfile = pgTable('seller_profile', {
  userId: uuid('user_id').primaryKey(),
  displayName: text('display_name').notNull(),
  phone: text('phone'),
  informativaVersionAccepted: text('informativa_version_accepted').notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull(),
  marketingConsent: boolean('marketing_consent').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * EC-S-T30 — append-only seller informativa acceptance log.
 * `seller_profile.informativa_version_accepted` remains the current pointer.
 */
export const consentAcceptanceLog = pgTable('consent_acceptance_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  policyVersion: text('policy_version').notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userAcceptedIdx: index('consent_acceptance_log_user_accepted_idx').on(t.userId, t.acceptedAt),
}));

/** EC-S-T07 — wizard draft autosave (payload validated by listingWizard machine). */
export const listingDraft = pgTable('listing_draft', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: uuid('seller_id').notNull(),
  currentStep: text('current_step').notNull(),
  payload: jsonb('payload').notNull().default({}),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  sellerIdx: index('listing_draft_seller_idx').on(t.sellerId),
}));

/** EC-S-T12 — moderation events from dupdetect / abuse controls. */
export const moderationEvents = pgTable('moderation_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').notNull(),
  listingId: uuid('listing_id'),
  mediaId: uuid('media_id'),
  actorUserId: uuid('actor_user_id'),
  subjectUserId: uuid('subject_user_id'),
  detail: jsonb('detail').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** EC-S-T14 — Verified Owner case (state machine in @easycasa/shared). */
export const verifiedOwnerCase = pgTable('verified_owner_case', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerUserId: uuid('seller_user_id').notNull(),
  listingId: uuid('listing_id').notNull(),
  state: text('state').notNull().default('submitted'),
  docKeys: jsonb('doc_keys').notNull().default([]),
  nameMatchVerdict: text('name_match_verdict'),
  nameMatchScore: numeric('name_match_score', { precision: 4, scale: 3 }),
  decidedBy: uuid('decided_by'),
  decisionReason: text('decision_reason'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  sellerListingUniq: uniqueIndex('verified_owner_case_seller_listing_uidx').on(
    t.sellerUserId,
    t.listingId,
  ),
  stateIdx: index('idx_vo_case_state').on(t.state),
}));

/** EC-S-T18 — private-seller checklist (P6); not fascicolo document_assets. */
export const sellerDocChecklist = pgTable('seller_doc_checklist', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').notNull(),
  sellerUserId: uuid('seller_user_id').notNull(),
  items: jsonb('items').notNull().default([]),
  completeness: integer('completeness').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  listingUniq: uniqueIndex('seller_doc_checklist_listing_uidx').on(t.listingId),
}));


/** EC-S-T24 — nudge emission history (cooldown + optional dismiss). */
export const listingNudges = pgTable(
  'listing_nudges',
  {
    listingId: uuid('listing_id').notNull(),
    code: text('code').notNull(),
    emittedAt: timestamp('emitted_at', { withTimezone: true }).notNull().defaultNow(),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
    /** Numeric i18n interpolation only (T24). */
    payload: jsonb('payload').$type<Record<string, number>>().notNull().default({}),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.listingId, t.code, t.emittedAt] }),
    listingEmittedIdx: index('listing_nudges_listing_emitted_idx').on(
      t.listingId,
      t.emittedAt,
    ),
    listingCodeIdx: index('listing_nudges_listing_code_idx').on(
      t.listingId,
      t.code,
      t.emittedAt,
    ),
  }),
);

export const schema = {
  users, categories, regions, provinces, listings, media, favorites, savedSearches, alertLogs,
  sellerProfile, listingDraft, moderationEvents, verifiedOwnerCase, sellerDocChecklist,
  listingAnalyticsDaily,

  listingNudges,
  consentAcceptanceLog,

  enquiries,
  plans, memberships, sellerSubscription, featuredPlacements, listingBoost, conversations, messages, notifications,
  devices, partnerProfiles, partnerDirectory, leads, payouts,
  properties, documentAssets, serviceCatalogItems, servicePackages, packageItems,
  serviceOrders, serviceOrderLines, mandates,
  professionals, credentials, serviceTasks, assignments, credentialPolicies, serviceDemandLog,
  authorityAuditLog, phoneOtpChallenges, whatsappMessages, adminAuditLog,
  dsarAdminRequests, listingReports, identityReviewRequests,
  leases, kycCases,
  paymentIntents, invoices, stripeWebhookEvents,
  omiQuotes, valuationRequests, asteLeads,
  asteAnalyses, asteDocuments, asteDocChunks, asteGlossary, asteChatMessages,
  asteCreditBalances, asteCreditLedger, asteReportUnlocks,
  viewingAvailability, viewings,
  consentRecords,
  shareLinks, shareLinkViewDedup,
  crmContacts, crmSeekerProfiles, crmOwnerProfiles, crmB4aReferrals, crmPartnerProfiles,
  crmActivities, crmTasks, crmAuditLog,
};
export type Schema = typeof schema;
