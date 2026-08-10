import { Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const LOCALES = ['it', 'en', 'es'] as const;
const BUYER_TYPES = ['prima_casa', 'investimento', 'curiosita'] as const;

export class CreateAsteLeadDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsIn(LOCALES)
  language!: (typeof LOCALES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(8)
  province?: string | null;

  @IsOptional()
  @IsIn(BUYER_TYPES)
  buyerType?: (typeof BUYER_TYPES)[number] | null;

  /** Must be true — false/absent rejected by ValidationPipe / Equals. */
  @Type(() => Boolean)
  @IsBoolean()
  @Equals(true, { message: 'consent must be true' })
  consent!: true;

  @IsIn(LOCALES)
  locale!: (typeof LOCALES)[number];
}
