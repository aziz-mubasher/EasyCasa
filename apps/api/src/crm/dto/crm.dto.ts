import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateCrmContactDto {
  @IsString()
  @MinLength(1)
  fullName!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['it', 'en', 'es'])
  locale?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  notesSummary?: string;
}

export class PatchCrmContactDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @IsOptional()
  @IsString()
  email?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsIn(['it', 'en', 'es'])
  locale?: string;

  @IsOptional()
  @IsUUID()
  ownerAdminId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  notesSummary?: string | null;
}

export class AttachCrmRoleDto {
  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  searchIntent?: Record<string, unknown>;

  @IsOptional()
  @IsIn(['email', 'phone', 'whatsapp'])
  preferredChannel?: 'email' | 'phone' | 'whatsapp';

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  listingIds?: string[];

  @IsOptional()
  @IsIn(['photographer', 'notary', 'conductor', 'agent', 'other'])
  partnerType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceZones?: string[];

  @IsOptional()
  @IsString()
  vatNumber?: string | null;
}

export class PatchCrmRoleDto {
  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsIn(['email', 'phone', 'whatsapp'])
  preferredChannel?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  listingIds?: string[];
}

export class CreateCrmActivityDto {
  @IsIn(['note', 'call', 'email'])
  type!: 'note' | 'call' | 'email';

  @IsString()
  @MinLength(1)
  body!: string;
}

export class CreateCrmTaskDto {
  @IsUUID()
  contactId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  dueAt?: string;

  @IsOptional()
  @IsUUID()
  assigneeAdminId?: string;
}

export class PatchCrmTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  dueAt?: string | null;

  @IsOptional()
  @IsIn(['open', 'done', 'cancelled'])
  status?: 'open' | 'done' | 'cancelled';

  @IsOptional()
  @IsUUID()
  assigneeAdminId?: string;
}

export class ErasureRequestDto {
  @IsBoolean()
  confirm!: boolean;
}
