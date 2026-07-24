import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateShareLinkDto {
  @IsUUID()
  listingId!: string;

  @IsOptional()
  @IsBoolean()
  includeValuationBand?: boolean;
}
