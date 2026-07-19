import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { notifications } from '../db/schema';
import { apiConfig } from '../config';

type Channel = 'in_app' | 'email' | 'push';

/** Pluggable transports. Offline-safe: email/push log to console unless configured. */
interface Transport {
  send(userId: string, type: string, payload: Record<string, unknown>): Promise<boolean>;
}

class ConsoleTransport implements Transport {
  constructor(private readonly kind: string) {}
  async send(userId: string, type: string, payload: Record<string, unknown>): Promise<boolean> {
    void payload;
    console.log(`[notify:${this.kind}] user=${userId} type=${type}`);
    return true;
  }
}

/** HTTP POST seam — fail soft when the provider is unreachable. */
class HttpProviderTransport implements Transport {
  constructor(
    private readonly baseUrl: string,
    private readonly kind: string,
  ) {}
  async send(userId: string, type: string, payload: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId, type, channel: this.kind, payload }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

function emailTransport(): Transport {
  if (apiConfig.EMAIL_PROVIDER_URL) {
    return new HttpProviderTransport(apiConfig.EMAIL_PROVIDER_URL, 'email');
  }
  return new ConsoleTransport('email');
}

function pushTransport(): Transport {
  if (apiConfig.PUSH_PROVIDER_URL) {
    return new HttpProviderTransport(apiConfig.PUSH_PROVIDER_URL, 'push');
  }
  return new ConsoleTransport('push');
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly email: Transport = emailTransport();
  private readonly push: Transport = pushTransport();

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async notify(
    userId: string,
    type: string,
    payload: Record<string, unknown>,
    channels: Channel[] = ['in_app'],
  ): Promise<void> {
    for (const channel of channels) {
      let status: 'sent' | 'pending' | 'failed' = 'pending';
      let sentAt: Date | null = null;
      if (channel === 'email' && (apiConfig.EMAIL_PROVIDER_URL || apiConfig.SMTP_URL)) {
        status = (await this.email.send(userId, type, payload)) ? 'sent' : 'failed';
        sentAt = new Date();
      } else if (channel === 'push') {
        status = (await this.push.send(userId, type, payload)) ? 'sent' : 'failed';
        sentAt = new Date();
      }
      await this.db.insert(notifications).values({ userId, type, channel, payload, status, sentAt });
    }
  }

  list(userId: string) {
    return this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async unreadCount(userId: string): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return rows[0]?.n ?? 0;
  }

  async markRead(id: string, userId: string) {
    return this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
  }
}
