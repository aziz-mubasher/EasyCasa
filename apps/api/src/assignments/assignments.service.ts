import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { canAssign } from '../professionals/domain/eligibility';
import { selectCandidates } from '../professionals/domain/routing';
import { nextAssignmentStatus } from '../professionals/domain/state';
import type {
  AssignmentRecord,
  AssignmentRepository,
  ProfessionalRepository,
} from '../professionals/domain/ports';
import type { Candidate } from '../professionals/domain/routing';
import type { AssignmentStatus, RequiredCredential } from '../professionals/domain/types';
import { PROFESSIONAL_REPOSITORY } from '../professionals/professionals.service';
import { DefaultCredentialPolicy } from './credential-policy';

export const ASSIGNMENT_REPOSITORY = Symbol('ASSIGNMENT_REPOSITORY');

@Injectable()
export class AssignmentsService {
  constructor(
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignments: AssignmentRepository,
    @Inject(PROFESSIONAL_REPOSITORY) private readonly professionals: ProfessionalRepository,
    private readonly policy: DefaultCredentialPolicy,
  ) {}

  async createTask(input: {
    orderId: string;
    propertyId: string;
    itemCode: string;
    province: string;
  }): Promise<AssignmentRecord> {
    const requiredCredential = this.policy.requiredCredentialFor(input.itemCode);
    if (requiredCredential === 'NONE') {
      throw new BadRequestException(
        `Item ${input.itemCode} does not require a professional task (NONE)`,
      );
    }
    const task = await this.assignments.createTask({ ...input, requiredCredential });
    return this.assignments.createAssignment(task.id);
  }

  /** Spawn tasks for every order line that needs a credential (skips NONE). */
  async spawnForOrder(input: {
    orderId: string;
    propertyId: string;
    itemCodes: string[];
    province: string;
  }): Promise<AssignmentRecord[]> {
    const created: AssignmentRecord[] = [];
    for (const itemCode of input.itemCodes) {
      const required = this.policy.requiredCredentialFor(itemCode);
      if (required === 'NONE') continue;
      const task = await this.assignments.createTask({
        orderId: input.orderId,
        propertyId: input.propertyId,
        itemCode,
        province: input.province,
        requiredCredential: required,
      });
      created.push(await this.assignments.createAssignment(task.id));
    }
    return created;
  }

  async candidates(assignmentId: string): Promise<Candidate[]> {
    const { task } = await this.load(assignmentId);
    const pros = await this.professionals.list();
    return selectCandidates(
      { requiredCredential: task.requiredCredential, province: task.province },
      pros,
    );
  }

  async assign(assignmentId: string, professionalId: string): Promise<AssignmentRecord> {
    const { assignment, task } = await this.load(assignmentId);
    const pro = await this.professionals.get(professionalId);
    if (!pro) throw new NotFoundException(`Professional ${professionalId} not found`);

    const eligibility = canAssign(pro, {
      requiredCredential: task.requiredCredential,
      province: task.province,
    });
    if (!eligibility.allowed) {
      throw new ConflictException({
        message: 'Professional is not eligible for this task',
        blockers: eligibility.blockers,
      });
    }

    const status = nextAssignmentStatus(assignment.status, 'ASSIGN');
    return this.assignments.assignAtomic({
      assignmentId,
      professionalId,
      status,
    });
  }

  async start(assignmentId: string): Promise<AssignmentRecord> {
    return this.advance(assignmentId, 'START');
  }

  async deliver(assignmentId: string, deliverableUrl: string): Promise<AssignmentRecord> {
    const { assignment } = await this.load(assignmentId);
    const status = nextAssignmentStatus(assignment.status, 'DELIVER');
    await this.assignments.setDeliverable(assignmentId, deliverableUrl);
    await this.assignments.setStatus(assignmentId, status);
    return { ...assignment, status, deliverableUrl };
  }

  async approve(assignmentId: string): Promise<AssignmentRecord> {
    const { assignment } = await this.load(assignmentId);
    const status = nextAssignmentStatus(assignment.status, 'APPROVE');
    await this.assignments.setStatus(assignmentId, status);
    if (assignment.professionalId) {
      await this.professionals.incrementLoad(assignment.professionalId, -1);
    }
    return { ...assignment, status };
  }

  list(status?: AssignmentStatus): Promise<AssignmentRecord[]> {
    return this.assignments.listAssignments(status ? { status } : undefined);
  }

  listForProfessional(professionalId: string): Promise<AssignmentRecord[]> {
    return this.assignments.listForProfessional(professionalId);
  }

  listCredentialPolicy() {
    return this.policy.list();
  }

  setCredentialPolicy(itemCode: string, requiredCredential: RequiredCredential) {
    return this.policy.set(itemCode, requiredCredential);
  }

  private async advance(
    assignmentId: string,
    event: Parameters<typeof nextAssignmentStatus>[1],
  ): Promise<AssignmentRecord> {
    const { assignment } = await this.load(assignmentId);
    const status = nextAssignmentStatus(assignment.status, event);
    await this.assignments.setStatus(assignmentId, status);
    return { ...assignment, status };
  }

  private async load(assignmentId: string) {
    const assignment = await this.assignments.getAssignment(assignmentId);
    if (!assignment) throw new NotFoundException(`Assignment ${assignmentId} not found`);
    const task = await this.assignments.getTask(assignment.taskId);
    if (!task) throw new BadRequestException(`Task for assignment ${assignmentId} missing`);
    return { assignment, task };
  }
}
