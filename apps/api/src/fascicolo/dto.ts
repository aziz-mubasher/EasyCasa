import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class AddDocumentDto {
  @IsString()
  code!: string;

  @IsString()
  url!: string;

  @IsOptional()
  @IsISO8601()
  issuedAt?: string;
}
