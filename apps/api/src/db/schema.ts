import {
  pgTable, pgEnum, uuid, text, integer, numeric, timestamp, jsonb, boolean,
  doublePrecision, bigint, primaryKey, uniqueIndex, date,
} from 'drizzle-orm/pg-core';

export const listingStatus = pgEnum('listing_status', ['draft', 'published', 'sold', 'archived']);
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
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  membershipTier: text('membership_tier'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

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
  city: text('city'),
  province: text('province'),
  postalCode: text('postal_code'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  qrCodeUrl: text('qr_code_url'),
  featuredUntil: timestamp('featured_until', { withTimezone: true }),
  source: text('source').notNull().default('native'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const favorites = pgTable(
  'favorites',
  {
    userId: uuid('user_id').notNull(),
    listingId: uuid('listing_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.listingId] }) }),
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
export const enquiries = pgTable('enquiries', {
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
  orderId: uuid('order_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});


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

export const featuredPlacements = pgTable('featured_placements', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').notNull(),
  kind: text('kind').notNull().default('featured'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  stripePaymentId: text('stripe_payment_id'),
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
export const omiQuotes = pgTable('omi_quotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  comune: text('comune').notNull(),
  provincia: text('provincia').notNull(),
  type: text('type').notNull(),
  minPerM2Cents: integer('min_per_m2_cents').notNull(),
  maxPerM2Cents: integer('max_per_m2_cents').notNull(),
  period: text('period').notNull(),
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

// ---------------- Phase 29 — Viewings & scheduling ----------------
export const viewingAvailability = pgTable('viewing_availability', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').notNull(),
  weekday: integer('weekday').notNull(),
  startMinutes: integer('start_minutes').notNull(),
  endMinutes: integer('end_minutes').notNull(),
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
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------- SmartLink (K EC 1.29) ----------------
export const shareLinks = pgTable('share_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  listingId: uuid('listing_id').notNull(),
  createdBy: uuid('created_by').notNull(),
  agentUserId: uuid('agent_user_id'),
  agentSnapshot: jsonb('agent_snapshot').notNull().default({}),
  includeValuationBand: boolean('include_valuation_band').notNull().default(true),
  includeSourcesTable: boolean('include_sources_table').notNull().default(false),
  viewCount: integer('view_count').notNull().default(0),
  uniqueViewCount: integer('unique_view_count').notNull().default(0),
  lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

export const shareLinkVisitorHashes = pgTable(
  'share_link_visitor_hashes',
  {
    shareLinkId: uuid('share_link_id').notNull(),
    visitorHash: text('visitor_hash').notNull(),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.shareLinkId, t.visitorHash] }),
  }),
);

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

export const schema = {
  users, categories, regions, provinces, listings, media, favorites, savedSearches, alertLogs,
  enquiries,
  plans, memberships, featuredPlacements, conversations, messages, notifications,
  devices, partnerProfiles, leads, payouts,
  properties, documentAssets, serviceCatalogItems, servicePackages, packageItems,
  serviceOrders, serviceOrderLines, mandates,
  professionals, credentials, serviceTasks, assignments, credentialPolicies,
  leases, kycCases,
  paymentIntents, invoices,
  omiQuotes, valuationRequests,
  viewingAvailability, viewings,
  shareLinks, shareLinkVisitorHashes,
  consentRecords,
};
export type Schema = typeof schema;
