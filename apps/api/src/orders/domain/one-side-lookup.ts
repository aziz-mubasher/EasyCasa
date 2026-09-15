import { inArray, or } from 'drizzle-orm';

import type { Db } from '../../db/drizzle';
import { properties, serviceOrders } from '../../db/schema';
import type { OrderSubject } from './order-subject';
import {
  assertOneSidePerProperty,
  isPaidOrderStatus,
  partyFromSubject,
  type OrderParty,
} from './one-side';
import { toDomainOrderStatus } from '../../transactions/status-map';

export async function assertOneSideForSubject(db: Db, subject: OrderSubject): Promise<void> {
  if (!subject.propertyId && !subject.listingId) return;

  const existing = await loadPaidPartiesForSubject(db, subject);
  assertOneSidePerProperty({ party: partyFromSubject(subject) }, existing);
}

export async function loadPaidPartiesForSubject(
  db: Db,
  subject: OrderSubject,
): Promise<Array<{ party: OrderParty }>> {
  const propertyIds = new Set<string>();
  const listingIds = new Set<string>();
  if (subject.propertyId) propertyIds.add(subject.propertyId);
  if (subject.listingId) listingIds.add(subject.listingId);

  if (subject.propertyId) {
    const rows = await db
      .select({ listingId: properties.listingId })
      .from(properties)
      .where(inArray(properties.id, [subject.propertyId]))
      .limit(1);
    if (rows[0]?.listingId) listingIds.add(rows[0].listingId);
  }
  if (subject.listingId) {
    const rows = await db
      .select({ id: properties.id })
      .from(properties)
      .where(inArray(properties.listingId, [subject.listingId]));
    for (const row of rows) propertyIds.add(row.id);
  }

  const filters = [];
  if (propertyIds.size > 0) filters.push(inArray(serviceOrders.propertyId, [...propertyIds]));
  if (listingIds.size > 0) filters.push(inArray(serviceOrders.listingId, [...listingIds]));
  if (filters.length === 0) return [];

  const rows = await db
    .select({
      propertyId: serviceOrders.propertyId,
      listingId: serviceOrders.listingId,
      status: serviceOrders.status,
    })
    .from(serviceOrders)
    .where(or(...filters));

  return rows
    .filter((row) => isPaidOrderStatus(toDomainOrderStatus(row.status)))
    .map((row) => ({
      party: partyFromSubject({ propertyId: row.propertyId, listingId: row.listingId }),
    }));
}
