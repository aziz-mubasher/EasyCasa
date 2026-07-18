import type { PaymentPurpose, PaymentStatus } from './domain/types';

export function toDomainPaymentStatus(db: string): PaymentStatus {
  return db.toUpperCase() as PaymentStatus;
}

export function toDbPaymentStatus(
  status: PaymentStatus,
): 'requires_payment' | 'processing' | 'succeeded' | 'failed' | 'refunded' {
  return status.toLowerCase() as
    | 'requires_payment'
    | 'processing'
    | 'succeeded'
    | 'failed'
    | 'refunded';
}

export function toDomainPaymentPurpose(db: string): PaymentPurpose {
  return db.toUpperCase() as PaymentPurpose;
}

export function toDbPaymentPurpose(purpose: PaymentPurpose): 'due_now' | 'provvigione' {
  return purpose.toLowerCase() as 'due_now' | 'provvigione';
}
