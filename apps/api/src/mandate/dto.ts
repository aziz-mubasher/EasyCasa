import { IsBoolean, IsEmail, IsInt, IsString, IsUrl, Max, Min } from 'class-validator';

export class CreateMandateDto {
  @IsString()
  orderId!: string;

  @IsBoolean()
  exclusive!: boolean;

  @IsInt()
  @Min(1)
  @Max(36)
  durationMonths!: number;
}

export class RequestSignatureDto {
  @IsEmail()
  signerEmail!: string;

  @IsUrl()
  documentUrl!: string;
}

export class SignatureWebhookDto {
  @IsString()
  envelopeId!: string;

  @IsString()
  signedAt!: string;
}
