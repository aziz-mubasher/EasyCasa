import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Max, Min, MinLength } from 'class-validator';

export class CasafariPreviewDto {
  @IsString()
  @MinLength(12)
  @IsUrl({ require_tld: true })
  url!: string;

  @IsOptional()
  @IsBoolean()
  refreshCache?: boolean;

  /** Max photos per draft (default 10, max 12). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  maxImages?: number;
}

export class CasafariCreateDto {
  @IsString()
  @MinLength(12)
  @IsUrl({ require_tld: true })
  url!: string;

  /** When the share folder has multiple estates, pick one. */
  @IsOptional()
  @IsString()
  casafariId?: string;

  @IsOptional()
  @IsBoolean()
  refreshCache?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  maxImages?: number;

  /** Optional province sigla (e.g. BS) — Casafari rarely provides it. */
  @IsOptional()
  @IsString()
  province?: string;
}
