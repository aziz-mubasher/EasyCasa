import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';

import { AmlService } from '../aml/aml.service';
import { validateLease } from './domain/lease';
import { buildRliPayload, registrationDeadline } from './domain/registration';
import type { LeaseRecord, LeaseRepository, RliChannel } from './domain/ports';
import type { LeaseInput, LeaseValidation, RliPayload } from './domain/types';

export const LEASE_REPOSITORY = Symbol('LEASE_REPOSITORY');
export const RLI_CHANNEL = Symbol('RLI_CHANNEL');

@Injectable()
export class RentalsService {
  constructor(
    @Inject(LEASE_REPOSITORY) private readonly leases: LeaseRepository,
    @Inject(RLI_CHANNEL) private readonly rli: RliChannel,
    @Optional()
    @Inject(forwardRef(() => AmlService))
    private readonly aml?: AmlService,
  ) {}

  preview(input: LeaseInput): LeaseValidation {
    return validateLease(input);
  }

  async create(propertyId: string, input: LeaseInput): Promise<LeaseRecord> {
    const validation = validateLease(input);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Lease is not valid',
        blockers: validation.blockers,
      });
    }
    return this.leases.create(propertyId, input);
  }

  async get(id: string): Promise<LeaseRecord> {
    const lease = await this.leases.get(id);
    if (!lease) throw new NotFoundException(`Lease ${id} not found`);
    return lease;
  }

  list(): Promise<LeaseRecord[]> {
    return this.leases.listAll();
  }

  async payload(id: string): Promise<RliPayload> {
    const lease = await this.get(id);
    return buildRliPayload(lease);
  }

  /**
   * Register via RLI. Blocks when an ESCALATED KYC case exists for the
   * property/tenant subjects; opens a KYC case for the tenant subject when provided.
   */
  async register(
    id: string,
    opts: {
      tenantSubjectRef?: string;
      tenantFullName?: string;
      tenantCountryCode?: string;
    } = {},
  ): Promise<LeaseRecord> {
    const lease = await this.get(id);
    if (lease.registrationProtocollo) {
      throw new ConflictException(
        `Lease ${id} is already registered (${lease.registrationProtocollo})`,
      );
    }
    const validation = validateLease(lease);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Lease is not valid',
        blockers: validation.blockers,
      });
    }

    if (this.aml) {
      const subjects = [`property:${lease.propertyId}`, `lease:${id}`];
      if (opts.tenantSubjectRef) subjects.push(opts.tenantSubjectRef);
      for (const ref of subjects) {
        if (await this.aml.hasOpenEscalation(ref)) {
          throw new ForbiddenException(
            `Cannot register lease: unresolved ESCALATED KYC for ${ref}`,
          );
        }
      }
      if (opts.tenantSubjectRef && opts.tenantFullName && opts.tenantCountryCode) {
        await this.aml.open({
          subjectRef: opts.tenantSubjectRef,
          fullName: opts.tenantFullName,
          countryCode: opts.tenantCountryCode,
          factors: {
            nonEuId: false,
            cashPayment: false,
            highValue: lease.annualRentCents >= 10_000_000,
            identityMismatch: false,
          },
        });
      }
    }

    const receipt = await this.rli.submit(buildRliPayload(lease));
    await this.leases.setRegistration(id, receipt.protocollo, receipt.registeredAt);
    return {
      ...lease,
      registrationProtocollo: receipt.protocollo,
      registeredAt: receipt.registeredAt,
    };
  }

  /** Unregistered leases approaching or past the 30-day deadline. */
  async deadlineMonitor(withinDays = 7): Promise<
    { lease: LeaseRecord; deadline: string; overdue: boolean }[]
  > {
    const today = new Date();
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + withinDays);
    const horizonIso = horizon.toISOString().slice(0, 10);
    const todayIso = today.toISOString().slice(0, 10);
    const due = await this.leases.listDueBy(horizonIso);
    return due.map((lease) => {
      const deadline = registrationDeadline(lease);
      return { lease, deadline, overdue: deadline < todayIso };
    });
  }
}
