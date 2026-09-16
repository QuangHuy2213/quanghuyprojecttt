import { IsString, MaxLength, MinLength } from 'class-validator';

export class AiChatDto {
  @IsString()
  @MinLength(2)
  @MaxLength(1200)
  message!: string;
}