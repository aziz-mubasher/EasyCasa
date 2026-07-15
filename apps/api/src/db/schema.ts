import {
  pgTable, pgEnum, uuid, text, integer, numeric, timestamp, jsonb, boolean,
  doublePrecision, bigint, primaryKey,
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

export const schema = {
  users, categories, regions, listings, media, favorites, savedSearches,
};
export type Schema = typeof schema;
