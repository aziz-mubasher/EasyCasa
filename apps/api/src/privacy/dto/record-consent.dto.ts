import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsString, MinLength } from 'class-validator';

import { CURRENT_POLICY_VERSION } from '../consent.service';

export const CONSENT_PURPOSES = ['privacy_policy', 'mediation_disclosure', 'marketing'] as const;
export type ConsentPurposeDto = (typeof CONSENT_PURPOSES)[number];

/** Body for POST /me/privacy/consents — GDPR Art. 7 evidence record. */
export class RecordConsentDto {
  @ApiProperty({
    enum: CONSENT_PURPOSES,
    example: 'privacy_policy',
    description: 'Consent purpose being granted or withdrawn.',
  })
  @IsIn(CONSENT_PURPOSES)
  purpose!: ConsentPurposeDto;

  @ApiProperty({
    example: true,
    description: 'Whether the subject grants (true) or withdraws (false) consent.',
  })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  granted!: boolean;

  @ApiProperty({
    example: CURRENT_POLICY_VERSION,
    description: 'Policy version the subject accepted; must match GET /me/privacy/policy-version.',
  })
  @IsString()
  @MinLength(1)
  policyVersion!: string;
}
