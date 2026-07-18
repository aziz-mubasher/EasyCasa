import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { nextProAction } from '../professionals/domain/pro-actions';
import {
  PRO_ME_REPOSITORY,
  type ProAssignment,
  type ProMeRepository,
  type ProProfile,
} from './professional-me.types';

@Injectable()
export class ProMeService {
  constructor(@Inject(PRO_ME_REPOSITORY) private readonly repo: ProMeRepository) {}

  private async me(userId: string): Promise<ProProfile> {
    const pro = await this.repo.findProfessionalByUser(userId);
    if (!pro) throw new NotFoundException('No professional profile for this user');
    return pro;
  }

  profile(userId: string): Promise<ProProfile> {
    return this.me(userId);
  }

  async assignments(userId: string): Promise<ProAssignment[]> {
    const pro = await this.me(userId);
    return this.repo.listAssignments(pro.id);
  }

  private async owned(
    userId: string,
    assignmentId: string,
  ): Promise<{ pro: ProProfile; a: ProAssignment }> {
    const pro = await this.me(userId);
    const a = await this.repo.ownedAssignment(assignmentId, pro.id);
    if (!a) throw new ForbiddenException('Assignment is not assigned to you');
    return { pro, a };
  }

  async start(userId: string, assignmentId: string): Promise<ProAssignment> {
    const { a } = await this.owned(userId, assignmentId);
    if (nextProAction(a.status) !== 'start') {
      throw new ConflictException(`Cannot start an assignment in status ${a.status}`);
    }
    await this.repo.setStatus(assignmentId, 'IN_PROGRESS');
    return { ...a, status: 'IN_PROGRESS' };
  }

  async deliver(userId: string, assignmentId: string, url: string): Promise<ProAssignment> {
    const { a } = await this.owned(userId, assignmentId);
    if (nextProAction(a.status) !== 'deliver') {
      throw new ConflictException(`Cannot deliver an assignment in status ${a.status}`);
    }
    await this.repo.setDeliverable(assignmentId, url);
    await this.repo.setStatus(assignmentId, 'DELIVERED');
    return { ...a, status: 'DELIVERED', deliverableUrl: url };
  }
}
