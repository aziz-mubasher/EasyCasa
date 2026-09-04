import { Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsISO8601,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const LOCALES = ['it', 'en', 'es'] as const;

export class CreateCallRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(32)
  phone!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  province!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  reason!: string;

  @IsOptional()
  @IsISO8601()
  preferredAt?: string | null;

  @IsIn(LOCALES)
  locale!: (typeof LOCALES)[number];

  @Type(() => Boolean)
  @IsBoolean()
  @Equals(true, { message: 'consent must be true' })
  consent!: true;
}
