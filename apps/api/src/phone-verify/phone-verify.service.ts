import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { phoneOtpChallenges, users } from '../db/schema';
import { EmailService } from '../email/email.service';
import {
  generateOtpCode,
  hashOtp,
  normalizePhoneE164,
  otpExpiresAt,
  otpMatches,
} from './otp';
import { WhatsAppCloudClient } from './whatsapp-cloud.client';

const MAX_START_PER_USER_HOUR = 5;
const MAX_START_PER_PHONE_HOUR = 5;

@Injectable()
export class PhoneVerifyService {
  private readonly log = new Logger(PhoneVerifyService.name);
  /** In-process IP rate map (pilot volume). */
  private readonly ipHits = new Map<string, number[]>();

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @InjectConfig() private readonly config: ApiConfig,
    private readonly whatsapp: WhatsAppCloudClient,
    private readonly email: EmailService,
  ) {}

  async start(
    userId: string,
    phoneRaw: string,
    opts: { email?: string | null; ip?: string | null },
  ): Promise<{ channel: 'whatsapp' | 'email'; expiresAt: string }> {
    const phone = normalizePhoneE164(phoneRaw);
    if (!phone) throw new BadRequestException('invalid phone number');

    this.assertIpRate(opts.ip);
    await this.assertUserPhoneRate(userId, phone);

    const code = generateOtpCode();
    const pepper = this.config.PHONE_OTP_PEPPER;
    const codeHash = hashOtp(code, pepper);
    const expiresAt = otpExpiresAt();

    let channel: 'whatsapp' | 'email' = 'whatsapp';
    const wa = await this.whatsapp.sendAuthenticationOtp(phone, code);
    if (!wa.ok) {
      if (!opts.email) {
        throw new BadRequestException(
          'WhatsApp delivery failed and no email on account for fallback',
        );
      }
      channel = 'email';
      await this.email.sendText(
        opts.email,
        'EasyCasa — codice di verifica telefono',
        `Il tuo codice EasyCasa è ${code}. Scade tra 10 minuti. Se non l'hai richiesto, ignora questa email.`,
        `<p>Il tuo codice EasyCasa è <strong>${code}</strong>.</p><p>Scade tra 10 minuti.</p>`,
      );
      this.log.log(`phone OTP email fallback user=${userId}`);
    }

    await this.db.insert(phoneOtpChallenges).values({
      userId,
      phoneE164: phone,
      codeHash,
      channel,
      expiresAt,
    });

    // Persist phone (unverified) so profile shows pending number.
    await this.db
      .update(users)
      .set({ phone, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return { channel, expiresAt: expiresAt.toISOString() };
  }

  async confirm(userId: string, codeRaw: string): Promise<{ phoneVerifiedAt: string }> {
    const code = codeRaw.trim();
    if (!/^\d{6}$/.test(code)) throw new BadRequestException('invalid code');

    const rows = await this.db
      .select()
      .from(phoneOtpChallenges)
      .where(
        and(
          eq(phoneOtpChallenges.userId, userId),
          isNull(phoneOtpChallenges.consumedAt),
          gt(phoneOtpChallenges.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(phoneOtpChallenges.createdAt))
      .limit(1);

    const challenge = rows[0];
    if (!challenge) throw new BadRequestException('no active verification challenge');

    if (challenge.attempts >= challenge.maxAttempts) {
      await this.db
        .update(phoneOtpChallenges)
        .set({ consumedAt: new Date() })
        .where(eq(phoneOtpChallenges.id, challenge.id));
      throw new BadRequestException('too many attempts — request a new code');
    }

    const ok = otpMatches(code, this.config.PHONE_OTP_PEPPER, challenge.codeHash);
    if (!ok) {
      await this.db
        .update(phoneOtpChallenges)
        .set({ attempts: challenge.attempts + 1 })
        .where(eq(phoneOtpChallenges.id, challenge.id));
      throw new BadRequestException('invalid code');
    }

    const now = new Date();
    await this.db
      .update(phoneOtpChallenges)
      .set({ consumedAt: now, attempts: challenge.attempts + 1 })
      .where(eq(phoneOtpChallenges.id, challenge.id));

    await this.db
      .update(users)
      .set({
        phone: challenge.phoneE164,
        phoneVerifiedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    return { phoneVerifiedAt: now.toISOString() };
  }

  private assertIpRate(ip: string | null | undefined): void {
    if (!ip) return;
    const now = Date.now();
    const windowMs = 60 * 60 * 1000;
    const hits = (this.ipHits.get(ip) ?? []).filter((t) => now - t < windowMs);
    if (hits.length >= 20) {
      throw new HttpException('too many verification requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    hits.push(now);
    this.ipHits.set(ip, hits);
  }

  private async assertUserPhoneRate(userId: string, phone: string): Promise<void> {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.db
      .select({ id: phoneOtpChallenges.id, phoneE164: phoneOtpChallenges.phoneE164, userId: phoneOtpChallenges.userId })
      .from(phoneOtpChallenges)
      .where(gt(phoneOtpChallenges.createdAt, since));

    const byUser = recent.filter((r) => r.userId === userId).length;
    const byPhone = recent.filter((r) => r.phoneE164 === phone).length;
    if (byUser >= MAX_START_PER_USER_HOUR || byPhone >= MAX_START_PER_PHONE_HOUR) {
      throw new HttpException('too many verification requests', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
