import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { properties, serviceOrderLines, serviceOrders } from '../db/schema';
import { CATALOG, PACKAGES } from './domain/catalog';
import { buildQuote, QuoteError } from './domain/pricing';
import type { CatalogItem, Quote, QuoteRequest, ServicePackage } from './domain/types';

@Injectable()
export class ServiceCatalogService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  listItems(): readonly CatalogItem[] {
    return CATALOG;
  }

  listPackages(): readonly ServicePackage[] {
    return PACKAGES;
  }

  quote(req: QuoteRequest): Quote {
    try {
      return buildQuote(req);
    } catch (err) {
      if (err instanceof QuoteError) throw new BadRequestException(err.message);
      throw err;
    }
  }

  /** Persist a quote as a confirmed ServiceOrder linked to a property. */
  async confirmQuote(
    propertyId: string,
    req: QuoteRequest,
  ): Promise<{ orderId: string; quote: Quote }> {
    const rows = await this.db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);
    if (!rows[0]) throw new NotFoundException(`Property ${propertyId} not found`);

    const quote = this.quote(req);
    const inserted = await this.db
      .insert(serviceOrders)
      .values({
        propertyId,
        packageCode: req.packageCode ?? null,
        status: 'confirmed',
      })
      .returning();
    const order = inserted[0]!;
    if (quote.lines.length > 0) {
      await this.db.insert(serviceOrderLines).values(
        quote.lines.map((l) => ({
          orderId: order.id,
          itemCode: l.code,
          kind: l.kind,
          netCents: l.netCents,
          ivaCents: l.ivaCents,
          grossCents: l.grossCents,
          estimated: l.estimated,
        })),
      );
    }
    return { orderId: order.id, quote };
  }
}
