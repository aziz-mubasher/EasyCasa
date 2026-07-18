import { IsIn, IsInt, IsString, Min } from 'class-validator';

export class CreateIntentDto {
  @IsString()
  orderId!: string;

  @IsIn(['DUE_NOW', 'PROVVIGIONE'])
  purpose!: 'DUE_NOW' | 'PROVVIGIONE';

  @IsInt()
  @Min(1)
  amountCents!: number;
}

export class WebhookDto {
  @IsString()
  providerRef!: string;

  @IsIn(['processing', 'succeeded', 'failed'])
  type!: 'processing' | 'succeeded' | 'failed';
}
