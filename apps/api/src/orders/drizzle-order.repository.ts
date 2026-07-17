import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { serviceOrderLines, serviceOrders } from '../db/schema';
import type { OrderRecord, OrderRepository } from '../transactions/domain/ports';
import type { OrderStatus } from '../transactions/domain/types';
import { toDbOrderStatus, toDomainOrderStatus } from '../transactions/status-map';

@Injectable()
export class DrizzleOrderRepository implements OrderRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async create(
    input: Omit<OrderRecord, 'id' | 'status'> & { status: OrderStatus },
  ): Promise<OrderRecord> {
    const inserted = await this.db
      .insert(serviceOrders)
      .values({
        propertyId: input.propertyId,
        packageCode: input.packageCode,
        status: toDbOrderStatus(input.status),
        itemCodes: input.itemCodes,
        dueNowGrossCents: input.dueNowGrossCents,
        estimatedTotalGrossCents: input.estimatedTotalGrossCents,
      })
      .returning();
    const order = inserted[0]!;
    if (input.lines.length > 0) {
      await this.db.insert(serviceOrderLines).values(
        input.lines.map((l) => ({
          orderId: order.id,
          itemCode: l.itemCode,
          kind: l.kind,
          netCents: l.netCents,
          ivaCents: l.ivaCents,
          grossCents: l.grossCents,
          estimated: l.estimated,
        })),
      );
    }
    return {
      id: order.id,
      propertyId: order.propertyId,
      packageCode: order.packageCode,
      status: toDomainOrderStatus(order.status),
      itemCodes: order.itemCodes ?? [],
      dueNowGrossCents: order.dueNowGrossCents,
      estimatedTotalGrossCents: order.estimatedTotalGrossCents,
      lines: input.lines,
    };
  }

  async get(id: string): Promise<OrderRecord | null> {
    const rows = await this.db.select().from(serviceOrders).where(eq(serviceOrders.id, id)).limit(1);
    const order = rows[0];
    if (!order) return null;
    const lines = await this.db
      .select()
      .from(serviceOrderLines)
      .where(eq(serviceOrderLines.orderId, id));
    return {
      id: order.id,
      propertyId: order.propertyId,
      packageCode: order.packageCode,
      status: toDomainOrderStatus(order.status),
      itemCodes: order.itemCodes ?? [],
      dueNowGrossCents: order.dueNowGrossCents,
      estimatedTotalGrossCents: order.estimatedTotalGrossCents,
      lines: lines.map((l) => ({
        itemCode: l.itemCode,
        kind: l.kind,
        netCents: l.netCents,
        ivaCents: l.ivaCents,
        grossCents: l.grossCents,
        estimated: l.estimated,
      })),
    };
  }

  async setStatus(id: string, status: OrderStatus): Promise<void> {
    await this.db
      .update(serviceOrders)
      .set({ status: toDbOrderStatus(status) })
      .where(eq(serviceOrders.id, id));
  }
}
