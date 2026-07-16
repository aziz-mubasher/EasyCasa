import {
  pgTable, pgEnum, uuid, text, integer, numeric, timestamp, jsonb, boolean,
  doublePrecision, bigint, primaryKey, uniqueIndex,
} from 'drizzle-orm/pg-core';

export const listingStatus = pgEnum('listing_status', ['draft', 'published', 'sold', 'archived']);
export const transactionType = pgEnum('transaction_type', ['sale', 'rent']);
export const userRole = pgEnum('user_role', ['buyer', 'seller', 'agent', 'partner', 'pro_marketer', 'admin']);
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

export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  wpPostId: bigint('wp_post_id', { mode: 'number' }),
  slug: text('slug'),
  title: text('title').notNull(),
  description: text('description'),
  categoryId: uuid('category_id'),
  regionId: uuid('region_id'),
  agentId: uuid('agent_id'),
  status: listingStatus('status').notNull().default('draft'),
  transactionType: transactionType('transaction_type'),
  price: numeric('price'),
  currency: text('currency').notNull().default('EUR'),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  rooms: integer('rooms'),
  sizeSqm: numeric('size_sqm'),
  landSqm: numeric('land_sqm'),
  floor: text('floor'),
  yearBuilt: integer('year_built'),
  energyClass: text('energy_class'),
  condition: text('condition'),
  features: text('features').array(),
  attributes: jsonb('attributes'),
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
  query: jsonb('query').notNull().default({}),
  notify: boolean('notify').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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

export const schema = {
  users, categories, regions, listings, media, favorites, savedSearches,
  plans, memberships, featuredPlacements, conversations, messages, notifications,
  devices, partnerProfiles, leads, payouts,
};
export type Schema = typeof schema;
