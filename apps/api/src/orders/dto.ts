import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateOrderDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  items?: string[];

  @IsOptional()
  @IsString()
  packageCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  referenceValueCents?: number;
}
