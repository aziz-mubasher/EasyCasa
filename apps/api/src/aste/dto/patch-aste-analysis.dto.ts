import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

const RESIDENCIES = ['it_resident', 'eu_nonresident', 'non_eu'] as const;
const PURPOSES = ['prima_casa', 'investimento'] as const;
const REGISTERS = ['investor', 'first_buyer'] as const;

/** EC-24 / EC-23b — PATCH buyer profile / register / lotto label. */
export class PatchAsteAnalysisDto {
  @IsOptional()
  @IsIn(REGISTERS)
  register?: (typeof REGISTERS)[number];

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(RESIDENCIES)
  residency?: (typeof RESIDENCIES)[number] | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(PURPOSES)
  purpose?: (typeof PURPOSES)[number] | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsBoolean()
  has_cf?: boolean | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsBoolean()
  has_pec_firma?: boolean | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsBoolean()
  financing_needed?: boolean | null;

  /** When true, clear buyer_profile (skip / "non so"). */
  @IsOptional()
  @IsBoolean()
  skip_buyer_profile?: boolean;

  /** EC-23b — set/correct lot label (draft or failed). Empty string clears. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  lottoLabel?: string | null;
}
