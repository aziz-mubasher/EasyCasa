import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { CASAFARI_MAX_IMAGES } from '../casafari/casafari-scrape';

export class CasafariPreviewDto {
  @IsString()
  @MinLength(12)
  @IsUrl({ require_tld: true })
  url!: string;

  @IsOptional()
  @IsBoolean()
  refreshCache?: boolean;

  /** Max photos per draft (default 20, max 20). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CASAFARI_MAX_IMAGES)
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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CASAFARI_MAX_IMAGES)
  maxImages?: number;

  /** Optional province sigla (e.g. BS) — Casafari rarely provides it. */
  @IsOptional()
  @IsString()
  province?: string;
}

export class CasafariCreateManyDto {
  @IsString()
  @MinLength(12)
  @IsUrl({ require_tld: true })
  url!: string;

  /**
   * Estates to import. Empty / omitted = import every estate on the share folder.
   */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  casafariIds?: string[];

  @IsOptional()
  @IsBoolean()
  refreshCache?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CASAFARI_MAX_IMAGES)
  maxImages?: number;

  @IsOptional()
  @IsString()
  province?: string;
}
