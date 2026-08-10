import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

/** EC-25 — POST chat body. */
export class AsteChatAskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  question!: string;

  @IsIn(['it', 'en'])
  lang!: 'it' | 'en';
}
