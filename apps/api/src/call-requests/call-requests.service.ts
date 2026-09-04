import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';
import {
  normalizeProvinceSlug,
  parseCallBookingReason,
  resolveCallDueAt,
} from '@easycasa/shared';

import { crmFireSafe } from '../crm/crm-fire-safe';
import { CRM_HOOKS, type CrmHooks } from '../crm/domain/ports';
import type { CreateCallRequestDto } from './dto/create-call-request.dto';

@Injectable()
export class CallRequestsService {
  constructor(@Optional() @Inject(CRM_HOOKS) private readonly crmHooks?: CrmHooks) {}

  async create(dto: CreateCallRequestDto): Promise<{ ok: true; dueAt: string }> {
    const province = normalizeProvinceSlug(dto.province);
    if (!province) {
      throw new BadRequestException('invalid province');
    }
    const reason = parseCallBookingReason(dto.reason);
    if (!reason) {
      throw new BadRequestException('invalid reason');
    }
    const phone = dto.phone.replace(/[^\d+]/g, '');
    if (phone.replace(/\D/g, '').length < 8) {
      throw new BadRequestException('invalid phone');
    }
    const preferredAt = dto.preferredAt ? new Date(dto.preferredAt) : null;
    const dueAt = resolveCallDueAt(dto.preferredAt ?? null);

    await crmFireSafe('onCallRequestCreated', async () => {
      if (!this.crmHooks) return;
      await this.crmHooks.onCallRequestCreated({
        fullName: dto.fullName.trim(),
        email: dto.email.trim().toLowerCase(),
        phone,
        locale: dto.locale,
        province,
        reason,
        preferredAt:
          preferredAt && !Number.isNaN(preferredAt.getTime()) ? preferredAt : null,
      });
    });

    return { ok: true, dueAt: dueAt.toISOString() };
  }
}
