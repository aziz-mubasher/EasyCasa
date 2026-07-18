import { IsArray, IsIn, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';

const CREDENTIAL_TYPES = [
  'REA_MEDIATORE',
  'RC_INSURANCE',
  'ALBO_TECNICO',
  'APE_CERTIFIER',
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

export class AddCredentialDto {
  @IsIn(CREDENTIAL_TYPES)
  type!: (typeof CREDENTIAL_TYPES)[number];

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

export class SetCredentialStatusDto {
  @IsIn(CREDENTIAL_TYPES)
  type!: (typeof CREDENTIAL_TYPES)[number];

  @IsIn(['VERIFIED', 'REJECTED'])
  status!: 'VERIFIED' | 'REJECTED';
}
