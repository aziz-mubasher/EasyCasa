import { IsIn, IsOptional, IsString } from 'class-validator';

export class PresignDto {
  @IsString() listingId!: string;
  @IsString() contentType!: string;
  @IsOptional() @IsIn(['image', 'floorplan', 'video']) type?: 'image' | 'floorplan' | 'video';
}

export class ConfirmMediaDto {
  @IsString() listingId!: string;
  @IsString() key!: string;
  @IsOptional() alt?: string;
}
