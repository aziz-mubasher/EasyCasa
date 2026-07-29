import { Inject, Injectable, Logger } from '@nestjs/common';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { authorityAuditLog } from '../db/schema';

export type AuthorityAuditInput = {
  actorUserId?: string | null;
  actorSub?: string | null;
  subjectUserId?: string | null;
  resource: string;
  action: string;
  reason?: string | null;
  meta?: Record<string, unknown> | null;
};

/**
 * EC-11 append-only audit. No update/delete API — insert only.
 */
@Injectable()
export class AuthorityAuditService {
  private readonly log = new Logger(AuthorityAuditService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async record(input: AuthorityAuditInput): Promise<{ id: string }> {
    const rows = await this.db
      .insert(authorityAuditLog)
      .values({
        actorUserId: input.actorUserId ?? null,
        actorSub: input.actorSub ?? null,
        subjectUserId: input.subjectUserId ?? null,
        resource: input.resource,
        action: input.action,
        reason: input.reason ?? null,
        meta: input.meta ?? null,
      })
      .returning({ id: authorityAuditLog.id });
    const id = rows[0]?.id;
    if (!id) throw new Error('authority audit insert failed');
    this.log.log(`audit ${input.action} ${input.resource} id=${id}`);
    return { id };
  }
}
