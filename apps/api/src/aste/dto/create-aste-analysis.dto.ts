import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const LOCALES = ['it', 'en', 'es'] as const;
const REGISTERS = ['investor', 'first_buyer'] as const;

export class CreateAsteAnalysisDto {
  @IsOptional()
  @IsIn(LOCALES)
  language?: (typeof LOCALES)[number];

  @IsOptional()
  @IsIn(REGISTERS)
  register?: (typeof REGISTERS)[number];
}

export const ASTE_DOC_TYPES = [
  'perizia',
  'avviso',
  'ordinanza',
  'planimetria',
  'altro',
] as const;

export type AsteDocType = (typeof ASTE_DOC_TYPES)[number];

export class UploadAsteDocumentMetaDto {
  @IsIn(ASTE_DOC_TYPES)
  docType!: AsteDocType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  originalFilename?: string;
}
