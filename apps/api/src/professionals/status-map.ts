import type { AssignmentStatus, VerificationStatus } from './domain/types';

export function toDomainVerification(db: string): VerificationStatus {
  return db.toUpperCase() as VerificationStatus;
}

export function toDbVerification(
  status: VerificationStatus,
): 'pending' | 'verified' | 'rejected' {
  return status.toLowerCase() as 'pending' | 'verified' | 'rejected';
}

export function toDomainAssignmentStatus(db: string): AssignmentStatus {
  return db.toUpperCase() as AssignmentStatus;
}

export function toDbAssignmentStatus(
  status: AssignmentStatus,
): 'requested' | 'assigned' | 'in_progress' | 'delivered' | 'approved' {
  return status.toLowerCase() as
    | 'requested'
    | 'assigned'
    | 'in_progress'
    | 'delivered'
    | 'approved';
}
