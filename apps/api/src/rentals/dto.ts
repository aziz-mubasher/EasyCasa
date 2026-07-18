import { IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, Length, Min } from 'class-validator';

const LEASE_TYPES = ['LIBERO_4_4', 'CONCORDATO_3_2', 'TRANSITORIO', 'STUDENTI'] as const;

export class LeaseDto {
  @IsIn(LEASE_TYPES)
  type!: (typeof LEASE_TYPES)[number];

  @IsISO8601()
  startAt!: string;

  @IsInt()
  @Min(1)
  durationMonths!: number;

  @IsInt()
  @Min(0)
  annualRentCents!: number;

  @IsBoolean()
  cedolareSecca!: boolean;

  @IsBoolean()
  highTension!: boolean;

  @IsBoolean()
  apeAttached!: boolean;

  @IsOptional()
  @IsISO8601()
  signedAt?: string;
}

export class RegisterLeaseDto {
  @IsOptional()
  @IsString()
  tenantSubjectRef?: string;

  @IsOptional()
  @IsString()
  tenantFullName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  tenantCountryCode?: string;
}
