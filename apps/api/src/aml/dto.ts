import { IsBoolean, IsIn, IsString, Length } from 'class-validator';

export class OpenKycDto {
  @IsString()
  subjectRef!: string;

  @IsString()
  fullName!: string;

  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @IsBoolean()
  nonEuId!: boolean;

  @IsBoolean()
  cashPayment!: boolean;

  @IsBoolean()
  highValue!: boolean;

  @IsBoolean()
  identityMismatch!: boolean;
}

export class KycEventDto {
  @IsIn(['VERIFY', 'ESCALATE', 'CLEAR', 'REOPEN'])
  event!: 'VERIFY' | 'ESCALATE' | 'CLEAR' | 'REOPEN';
}
