import type {
  AssignmentStatus,
  Credential,
  Professional,
  RequiredCredential,
} from './types';

export interface ProfessionalRepository {
  get(id: string): Promise<Professional | null>;
  list(): Promise<Professional[]>;
  create(input: {
    displayName: string;
    coverageProvinces: string[];
    maxConcurrent?: number;
  }): Promise<Professional>;
  addCredential(id: string, credential: Credential): Promise<void>;
  setCredentialStatus(
    id: string,
    type: Credential['type'],
    status: Credential['status'],
  ): Promise<void>;
  incrementLoad(id: string, delta: number): Promise<void>;
}

export interface TaskRecord {
  id: string;
  orderId: string;
  propertyId: string;
  itemCode: string;
  requiredCredential: RequiredCredential;
  province: string;
}

export interface AssignmentRecord {
  id: string;
  taskId: string;
  professionalId: string | null;
  status: AssignmentStatus;
  deliverableUrl: string | null;
}

export interface AssignmentRepository {
  createTask(input: Omit<TaskRecord, 'id'>): Promise<TaskRecord>;
  getTask(id: string): Promise<TaskRecord | null>;
  createAssignment(taskId: string): Promise<AssignmentRecord>;
  getAssignment(id: string): Promise<AssignmentRecord | null>;
  listAssignments(filter?: { status?: AssignmentStatus }): Promise<AssignmentRecord[]>;
  listForProfessional(professionalId: string): Promise<AssignmentRecord[]>;
  setProfessional(assignmentId: string, professionalId: string): Promise<void>;
  setStatus(assignmentId: string, status: AssignmentStatus): Promise<void>;
  setDeliverable(assignmentId: string, url: string): Promise<void>;
  /** Atomic assign: eligibility already checked; bumps load in same transaction. */
  assignAtomic(input: {
    assignmentId: string;
    professionalId: string;
    status: AssignmentStatus;
  }): Promise<AssignmentRecord>;
}

/** Maps a catalog item to the credential its work requires (admin-configured). */
export interface CredentialPolicyPort {
  requiredCredentialFor(itemCode: string): RequiredCredential;
}
