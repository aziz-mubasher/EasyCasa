import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateShareLinkDto {
  @IsOptional()
  @IsBoolean()
  includeValuationBand?: boolean;

  @IsOptional()
  @IsBoolean()
  includeSourcesTable?: boolean;
}

export class RecordShareViewDto {
  @IsString()
  @MinLength(8)
  visitorToken!: string;
}
