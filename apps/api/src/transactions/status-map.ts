import type { LegalBasis, MandateStatus, OrderStatus } from '../transactions/domain/types';

/** DB stores lowercase enums; Phase 10 domain/API use UPPER_SNAKE. */
export function toDomainOrderStatus(db: string): OrderStatus {
  return db.toUpperCase() as OrderStatus;
}

export function toDbOrderStatus(status: OrderStatus): 'quoted' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' {
  return status.toLowerCase() as 'quoted' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
}

export function toDomainMandateStatus(db: string): MandateStatus {
  return db.toUpperCase() as MandateStatus;
}

export function toDbMandateStatus(
  status: MandateStatus,
): 'draft' | 'sent' | 'signed' | 'withdrawn' | 'expired' {
  return status.toLowerCase() as 'draft' | 'sent' | 'signed' | 'withdrawn' | 'expired';
}

export function toDomainLegalBasis(db: string): LegalBasis {
  if (db === 'mediazione') return 'MEDIAZIONE';
  if (db === 'mandato_oneroso') return 'MANDATO_ONEROSO';
  return 'REVIEW_REQUIRED';
}

export function toDbLegalBasis(
  basis: LegalBasis,
): 'mediazione' | 'mandato_oneroso' | 'review_required' {
  if (basis === 'MEDIAZIONE') return 'mediazione';
  if (basis === 'MANDATO_ONEROSO') return 'mandato_oneroso';
  return 'review_required';
}
