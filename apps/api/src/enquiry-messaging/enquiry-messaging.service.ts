import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, gte, sql } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { enquiries, enquiryMessages } from '../db/schema';
import { isLikelySpam } from '../messaging/spam';
import { NotificationsService } from '../notifications/notifications.service';

const MAX_BODY = 2000;
const MAX_REPLIES_PER_HOUR = 30;

@Injectable()
export class EnquiryMessagingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly notifications: NotificationsService,
  ) {}

  private async loadEnquiry(enquiryId: string) {
    const rows = await this.db
      .select()
      .from(enquiries)
      .where(eq(enquiries.id, enquiryId))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException('enquiry not found');
    return row;
  }

  private assertParticipant(
    enquiry: { seekerUserId: string; ownerUserId: string },
    userId: string,
  ) {
    if (enquiry.seekerUserId !== userId && enquiry.ownerUserId !== userId) {
      throw new ForbiddenException('not a participant');
    }
  }

  async list(enquiryId: string, userId: string) {
    const enquiry = await this.loadEnquiry(enquiryId);
    this.assertParticipant(enquiry, userId);

    const replies = await this.db
      .select({
        id: enquiryMessages.id,
        senderUserId: enquiryMessages.senderUserId,
        body: enquiryMessages.body,
        createdAt: enquiryMessages.createdAt,
        readAt: enquiryMessages.readAt,
      })
      .from(enquiryMessages)
      .where(eq(enquiryMessages.enquiryId, enquiryId))
      .orderBy(asc(enquiryMessages.createdAt));

    return {
      enquiryId,
      seed: {
        senderUserId: enquiry.seekerUserId,
        body: enquiry.message,
        createdAt: enquiry.createdAt.toISOString(),
      },
      messages: replies.map((m) => ({
        id: m.id,
        senderUserId: m.senderUserId,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? null,
        mine: m.senderUserId === userId,
      })),
    };
  }

  async send(enquiryId: string, userId: string, bodyRaw: string) {
    const body = bodyRaw.trim();
    if (body.length < 1 || body.length > MAX_BODY) {
      throw new BadRequestException('message length invalid');
    }
    if (isLikelySpam(body)) throw new BadRequestException('message rejected');

    const enquiry = await this.loadEnquiry(enquiryId);
    this.assertParticipant(enquiry, userId);

    const recent = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(enquiryMessages)
      .where(
        and(
          eq(enquiryMessages.senderUserId, userId),
          gte(enquiryMessages.createdAt, new Date(Date.now() - 3600_000)),
        ),
      );
    if ((recent[0]?.n ?? 0) >= MAX_REPLIES_PER_HOUR) {
      throw new ForbiddenException('too many messages');
    }

    const rows = await this.db
      .insert(enquiryMessages)
      .values({ enquiryId, senderUserId: userId, body })
      .returning();
    const msg = rows[0];
    if (!msg) throw new BadRequestException('send failed');

    const notifyUserId =
      enquiry.ownerUserId === userId ? enquiry.seekerUserId : enquiry.ownerUserId;
    await this.notifications.notify(
      notifyUserId,
      'enquiry_message',
      { enquiryId, messageId: msg.id },
      ['in_app', 'email'],
    );

    // Seller receiving a buyer reply: clear read marker so inbox shows unread again.
    if (enquiry.seekerUserId === userId) {
      await this.db
        .update(enquiries)
        .set({ readAt: null, updatedAt: new Date() })
        .where(eq(enquiries.id, enquiryId));
    }

    return {
      id: msg.id,
      enquiryId,
      senderUserId: msg.senderUserId,
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
      readAt: null,
      mine: true,
    };
  }
}
