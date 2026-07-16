import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { conversations, messages, listings, favorites } from '../db/schema';
import { NotificationsService } from '../notifications/notifications.service';
import { PartnersService } from '../partners/partners.service';
import { isLikelySpam, canStartConversation } from './spam';

@Injectable()
export class MessagingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly notifications: NotificationsService,
    private readonly partners: PartnersService,
  ) {}

  async startConversation(buyerId: string, listingId: string, firstMessage: string) {
    if (isLikelySpam(firstMessage)) throw new BadRequestException('message rejected');

    const recent = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(conversations)
      .where(and(eq(conversations.buyerId, buyerId), gte(conversations.createdAt, new Date(Date.now() - 3600_000))));
    if (!canStartConversation(recent[0]?.n ?? 0)) throw new ForbiddenException('too many new conversations');

    const listingRows = await this.db
      .select({ agentId: listings.agentId })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    if (!listingRows[0]) throw new NotFoundException('listing not found');
    const agentId = listingRows[0].agentId;

    const convRows = await this.db
      .insert(conversations)
      .values({ listingId, buyerId, agentId, lastMessageAt: new Date() })
      .onConflictDoNothing()
      .returning();
    const conv =
      convRows[0] ??
      (
        await this.db
          .select()
          .from(conversations)
          .where(and(eq(conversations.listingId, listingId), eq(conversations.buyerId, buyerId)))
          .limit(1)
      )[0];

    await this.postMessage(conv.id, buyerId, firstMessage, agentId);

    // Route a lead to a partner (commission-free: serious leads → partners).
    const hasHistory = (
      await this.db.select({ n: sql<number>`count(*)::int` }).from(favorites).where(eq(favorites.userId, buyerId))
    )[0]?.n
      ? true
      : false;
    await this.partners.routeLead(listingId, buyerId, firstMessage, hasHistory);

    return conv;
  }

  async sendMessage(conversationId: string, senderId: string, body: string) {
    if (isLikelySpam(body)) throw new BadRequestException('message rejected');
    const conv = await this.getParticipantConversation(conversationId, senderId);
    const other = conv.buyerId === senderId ? conv.agentId : conv.buyerId;
    return this.postMessage(conversationId, senderId, body, other);
  }

  private async postMessage(conversationId: string, senderId: string, body: string, notifyUserId: string | null) {
    const rows = await this.db.insert(messages).values({ conversationId, senderId, body }).returning();
    await this.db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));
    if (notifyUserId) {
      await this.notifications.notify(notifyUserId, 'message', { conversationId }, ['in_app', 'email']);
    }
    return rows[0];
  }

  private async getParticipantConversation(conversationId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          or(eq(conversations.buyerId, userId), eq(conversations.agentId, userId)),
        ),
      )
      .limit(1);
    if (!rows[0]) throw new ForbiddenException('not a participant');
    return rows[0];
  }

  async listConversations(userId: string) {
    return this.db
      .select()
      .from(conversations)
      .where(or(eq(conversations.buyerId, userId), eq(conversations.agentId, userId)))
      .orderBy(desc(conversations.lastMessageAt));
  }

  async listMessages(conversationId: string, userId: string) {
    await this.getParticipantConversation(conversationId, userId);
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }
}
