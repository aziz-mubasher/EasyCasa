import { Body, Controller, Post, UnprocessableEntityException } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { OptionalUser } from '../auth/optional-user.decorator';
import { Public } from '../auth/public.decorator';
import type { AuthUser } from '../auth/auth.types';
import { AvmService } from './avm.service';
import { InsufficientDataError } from './domain/estimate';
import type { SubjectProperty } from './domain/types';

const TYPES = ['apartment', 'house', 'villa', 'room', 'land', 'commercial'] as const;
const ENERGY = ['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
const CONDITIONS = ['new', 'renovated', 'good', 'to_renovate'] as const;

export class SubjectDto {
  @IsString() comune!: string;
  @IsString() provincia!: string;
  @IsNumber() @Min(-90) @Max(90) lat!: number;
  @IsNumber() @Min(-180) @Max(180) lng!: number;
  @IsIn(TYPES) type!: (typeof TYPES)[number];
  @IsNumber() @Min(1) areaM2!: number;
  @IsInt() @Min(0) rooms!: number;
  @IsOptional() @IsInt() floor?: number | null;
  @IsOptional() @IsIn(ENERGY) energyClass?: (typeof ENERGY)[number] | null;
  @IsOptional() @IsIn(CONDITIONS) condition?: (typeof CONDITIONS)[number] | null;
  @IsOptional() @IsInt() yearBuilt?: number | null;
}

export class EstimateDto {
  @ValidateNested()
  @Type(() => SubjectDto)
  subject!: SubjectDto;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}

@Controller('avm')
export class AvmController {
  constructor(private readonly service: AvmService) {}

  /** Public "what's my home worth?" estimate — the lead magnet. */
  @Public()
  @Post('estimate')
  async estimate(@OptionalUser() user: AuthUser | null, @Body() dto: EstimateDto) {
    const subject: SubjectProperty = {
      comune: dto.subject.comune,
      provincia: dto.subject.provincia,
      lat: dto.subject.lat,
      lng: dto.subject.lng,
      type: dto.subject.type,
      areaM2: dto.subject.areaM2,
      rooms: dto.subject.rooms,
      floor: dto.subject.floor ?? null,
      energyClass: dto.subject.energyClass ?? null,
      condition: dto.subject.condition ?? null,
      yearBuilt: dto.subject.yearBuilt ?? null,
    };
    try {
      return await this.service.estimate(subject, {
        contactEmail: dto.contactEmail ?? null,
        userId: user?.sub ?? null,
      });
    } catch (err) {
      if (err instanceof InsufficientDataError) {
        throw new UnprocessableEntityException(err.message);
      }
      throw err;
    }
  }
}
