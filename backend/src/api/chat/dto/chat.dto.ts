import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ConversationDto {
  @IsUUID()
  receiverId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  postId?: number;
}

export class SendMessageDto extends ConversationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;

  @IsUUID()
  clientMessageId!: string;
}

export class MessageQueryDto extends ConversationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  before?: number;
}

export class ReadMessagesDto extends ConversationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  throughId!: number;
}
