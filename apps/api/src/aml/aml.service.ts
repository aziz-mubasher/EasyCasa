import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { assessAmlRisk, nextKycStatus } from '../rentals/domain/aml';
import type {
  AmlScreeningProvider,
  KycCaseRecord,
  KycRepository,
} from '../rentals/domain/ports';
import type { AmlFactors, KycEvent } from '../rentals/domain/types';

export const KYC_REPOSITORY = Symbol('KYC_REPOSITORY');
export const AML_SCREENING = Symbol('AML_SCREENING');

@Injectable()
export class AmlService {
  constructor(
    @Inject(KYC_REPOSITORY) private readonly cases: KycRepository,
    @Inject(AML_SCREENING) private readonly screening: AmlScreeningProvider,
  ) {}

  async open(input: {
    subjectRef: string;
    fullName: string;
    countryCode: string;
    factors: Omit<AmlFactors, 'pep' | 'sanctionsHit'>;
  }): Promise<KycCaseRecord> {
    const screen = await this.screening.screen({
      fullName: input.fullName,
      countryCode: input.countryCode,
    });
    const factors: AmlFactors = {
      ...input.factors,
      pep: screen.pep,
      sanctionsHit: screen.sanctionsHit,
    };
    const assessment = assessAmlRisk(factors);
    return this.cases.create({
      subjectRef: input.subjectRef,
      factors,
      assessment,
      status: 'OPEN',
    });
  }

  async get(id: string): Promise<KycCaseRecord> {
    const kyc = await this.cases.get(id);
    if (!kyc) throw new NotFoundException(`KYC case ${id} not found`);
    return kyc;
  }

  async advance(id: string, event: KycEvent): Promise<KycCaseRecord> {
    const kyc = await this.get(id);
    const status = nextKycStatus(kyc.status, event, {
      mustEscalate: kyc.assessment.mustEscalate,
    });
    await this.cases.setStatus(id, status);
    return { ...kyc, status };
  }

  hasOpenEscalation(subjectRef: string): Promise<boolean> {
    return this.cases.hasOpenEscalation(subjectRef);
  }

  /** Open KYC at mandate signing (owner counterparty). */
  async openForMandate(input: {
    propertyId: string;
    ownerRef: string;
    fullName: string;
    countryCode?: string;
  }): Promise<KycCaseRecord> {
    return this.open({
      subjectRef: input.ownerRef || `property:${input.propertyId}:owner`,
      fullName: input.fullName,
      countryCode: input.countryCode ?? 'IT',
      factors: {
        nonEuId: false,
        cashPayment: false,
        highValue: false,
        identityMismatch: false,
      },
    });
  }
}
