import { IsArray, IsIn, IsInt, IsISO8601, IsOptional, IsString, Min, MinLength } from 'class-validator';

export const CREDENTIAL_TYPES = [
  'REA_MEDIATORE',
  'RC_INSURANCE',
  'RC_PROFESSIONALE',
  'ALBO_TECNICO',
  'ALBO_ISCRIZIONE',
  'APE_CERTIFIER',
  'CENED_ACCREDITAMENTO',
  'PARTITA_IVA',
  'PHOTOGRAPHER',
  'NOTAIO',
] as const;

export class CreateProfessionalDto {
  @IsString()
  displayName!: string;

  @IsArray()
  @IsString({ each: true })
  coverageProvinces!: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  maxConcurrent?: number;

  /** Link to users.id so /me/professional resolves for this auth subject. */
  @IsOptional()
  @IsString()
  userId?: string;
}

export class UpdateCoverageDto {
  @IsArray()
  @IsString({ each: true })
  coverageProvinces!: string[];
}

export class AddCredentialDto {
  @IsIn(CREDENTIAL_TYPES)
  type!: (typeof CREDENTIAL_TYPES)[number];

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;
}

export class SetCredentialStatusDto {
  @IsIn(CREDENTIAL_TYPES)
  type!: (typeof CREDENTIAL_TYPES)[number];

  @IsIn(['VERIFIED', 'REJECTED'])
  status!: 'VERIFIED' | 'REJECTED';

  /** Required when verifying (EC-13 audit). */
  @IsString()
  @MinLength(3)
  reason!: string;
}
