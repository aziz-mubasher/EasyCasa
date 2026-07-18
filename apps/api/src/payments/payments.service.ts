import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { nextPaymentStatus } from './domain/charges';
import type {
  PaymentIntentRecord,
  PaymentProvider,
  PaymentRepository,
} from './domain/ports';
import type { PaymentPurpose } from './domain/types';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface PaymentSucceededHandler {
  onPaymentSucceeded(intent: PaymentIntentRecord): Promise<void>;
}
export const PAYMENT_SUCCEEDED_HANDLER = Symbol('PAYMENT_SUCCEEDED_HANDLER');

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly repo: PaymentRepository,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @Inject(PAYMENT_SUCCEEDED_HANDLER) private readonly onSucceeded: PaymentSucceededHandler,
  ) {}

  async createIntent(input: {
    orderId: string;
    purpose: PaymentPurpose;
    amountCents: number;
  }): Promise<{ intentId: string; clientSecret: string }> {
    if (input.amountCents <= 0) throw new ConflictException('Nothing to charge');
    const record = await this.repo.create(input);
    const { providerRef, clientSecret } = await this.provider.createIntent({
      amountCents: input.amountCents,
      currency: 'eur',
      reference: record.id,
    });
    await this.repo.setProviderRef(record.id, providerRef);
    return { intentId: record.id, clientSecret };
  }

  async get(id: string): Promise<PaymentIntentRecord> {
    const rec = await this.repo.get(id);
    if (!rec) throw new NotFoundException(`Payment ${id} not found`);
    return rec;
  }

  async handleWebhook(event: {
    providerRef: string;
    type: 'processing' | 'succeeded' | 'failed';
  }): Promise<void> {
    const rec = await this.repo.findByProviderRef(event.providerRef);
    if (!rec) return;

    if (event.type === 'processing') {
      await this.advance(rec, 'CONFIRM');
      return;
    }
    if (event.type === 'succeeded') {
      const processing =
        rec.status === 'REQUIRES_PAYMENT' ? await this.advance(rec, 'CONFIRM') : rec;
      const succeeded = await this.advance(processing, 'SUCCEED');
      await this.onSucceeded.onPaymentSucceeded(succeeded);
      return;
    }
    if (event.type === 'failed') {
      const processing =
        rec.status === 'REQUIRES_PAYMENT' ? await this.advance(rec, 'CONFIRM') : rec;
      await this.advance(processing, 'FAIL');
    }
  }

  async refund(id: string): Promise<PaymentIntentRecord> {
    const rec = await this.get(id);
    const status = nextPaymentStatus(rec.status, 'REFUND');
    if (rec.providerRef) await this.provider.refund(rec.providerRef);
    await this.repo.setStatus(id, status);
    return { ...rec, status };
  }

  private async advance(
    rec: PaymentIntentRecord,
    event: Parameters<typeof nextPaymentStatus>[1],
  ): Promise<PaymentIntentRecord> {
    const status = nextPaymentStatus(rec.status, event);
    await this.repo.setStatus(rec.id, status);
    return { ...rec, status };
  }
}
