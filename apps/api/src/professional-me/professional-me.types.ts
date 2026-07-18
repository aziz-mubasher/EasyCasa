import type { AssignmentStatus } from '../professionals/domain/types';

export interface ProProfile {
  id: string;
  coverageProvinces: string[];
  activeAssignments: number;
  maxConcurrent: number;
  credentials: {
    type: string;
    status: string;
    reference: string | null;
    expiresAt: string | null;
  }[];
}

export interface ProAssignment {
  id: string;
  taskId: string;
  status: AssignmentStatus;
  deliverableUrl: string | null;
  task: {
    itemCode: string;
    propertyId: string;
    requiredCredential: string;
    province: string;
  } | null;
}

export interface ProMeRepository {
  findProfessionalByUser(userId: string): Promise<ProProfile | null>;
  listAssignments(professionalId: string): Promise<ProAssignment[]>;
  /** Returns the assignment iff it belongs to this professional. */
  ownedAssignment(assignmentId: string, professionalId: string): Promise<ProAssignment | null>;
  setStatus(assignmentId: string, status: AssignmentStatus): Promise<void>;
  setDeliverable(assignmentId: string, url: string): Promise<void>;
}

export const PRO_ME_REPOSITORY = Symbol('PRO_ME_REPOSITORY');
