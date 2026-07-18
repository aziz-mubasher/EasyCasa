import type { LeaseType, KycStatus } from './domain/types';

export function toDbLeaseType(
  t: LeaseType,
): 'libero_4_4' | 'concordato_3_2' | 'transitorio' | 'studenti' {
  const map: Record<LeaseType, 'libero_4_4' | 'concordato_3_2' | 'transitorio' | 'studenti'> = {
    LIBERO_4_4: 'libero_4_4',
    CONCORDATO_3_2: 'concordato_3_2',
    TRANSITORIO: 'transitorio',
    STUDENTI: 'studenti',
  };
  return map[t];
}

export function toDomainLeaseType(db: string): LeaseType {
  const map: Record<string, LeaseType> = {
    libero_4_4: 'LIBERO_4_4',
    concordato_3_2: 'CONCORDATO_3_2',
    transitorio: 'TRANSITORIO',
    studenti: 'STUDENTI',
  };
  return map[db] ?? 'LIBERO_4_4';
}

export function toDbKycStatus(s: KycStatus): 'open' | 'verified' | 'escalated' | 'cleared' {
  return s.toLowerCase() as 'open' | 'verified' | 'escalated' | 'cleared';
}

export function toDomainKycStatus(db: string): KycStatus {
  return db.toUpperCase() as KycStatus;
}
