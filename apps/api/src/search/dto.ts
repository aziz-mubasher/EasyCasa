import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const DEAL_TYPES = ['sale', 'rent'] as const;
const PROPERTY_TYPES = ['apartment', 'house', 'villa', 'room', 'land', 'commercial'] as const;
const ENERGY = ['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

export class FiltersDto {
  @IsOptional()
  @IsIn(DEAL_TYPES)
  dealType?: (typeof DEAL_TYPES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  priceMinCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceMaxCents?: number;

  @IsOptional()
  @IsArray()
  @IsIn(PROPERTY_TYPES, { each: true })
  types?: (typeof PROPERTY_TYPES)[number][];

  @IsOptional()
  @IsInt()
  @Min(0)
  minRooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minAreaM2?: number;

  @IsOptional()
  @IsArray()
  @IsIn(ENERGY, { each: true })
  energyClasses?: (typeof ENERGY)[number][];
}

export class BoundsSearchDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  minLat!: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  maxLat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  minLng!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  maxLng!: number;

  @IsInt()
  @Min(0)
  @Max(22)
  zoom!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => FiltersDto)
  filters?: FiltersDto;
}

export class GeoPointDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

export class AreaSearchDto {
  @IsArray()
  @ArrayMinSize(3)
  @ValidateNested({ each: true })
  @Type(() => GeoPointDto)
  polygon!: GeoPointDto[];

  @IsInt()
  @Min(0)
  @Max(22)
  zoom!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => FiltersDto)
  filters?: FiltersDto;
}
