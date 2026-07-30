import { Inject, Injectable, Logger } from '@nestjs/common';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { adminAuditLog } from '../db/schema';

export type AdminAuditInput = {
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  subjectUserId?: string | null;
  reason?: string | null;
};

/**
 * EC-13 append-only admin audit. Insert only — DB revokes UPDATE/DELETE.
 */
@Injectable()
export class AdminAuditService {
  private readonly log = new Logger(AdminAuditService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async record(input: AdminAuditInput): Promise<{ id: string }> {
    const rows = await this.db
      .insert(adminAuditLog)
      .values({
        actorUserId: input.actorUserId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        subjectUserId: input.subjectUserId ?? null,
        reason: input.reason ?? null,
      })
      .returning({ id: adminAuditLog.id });
    const id = rows[0]?.id;
    if (!id) throw new Error('admin audit insert failed');
    this.log.log(`admin_audit ${input.action} ${input.resourceType} id=${id}`);
    return { id };
  }
}
