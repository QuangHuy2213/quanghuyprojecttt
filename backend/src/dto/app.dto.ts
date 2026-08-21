import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class SubmitContactDto {
  @ApiProperty({ example: 'Pham Van E' })
  @IsString()
  @MinLength(2)
  fullName!: string;

  @ApiProperty({ example: 'phamvane@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Can ho tro dang tin' })
  @IsString()
  @MinLength(1)
  subject!: string;

  @ApiProperty({
    example: 'Toi can ho tro ve quy trinh dang tin va kiem duyet bai dang.',
  })
  @IsString()
  @MinLength(1)
  message!: string;
}

export class SubmitReportDto {
  @ApiProperty({ description: 'ID người dùng lấy từ phiên đăng nhập hiện tại' })
  @IsString()
  userId!: string;

  @ApiProperty({ description: 'ID bài đăng lấy từ dữ liệu bài đăng thực tế', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  postId?: number;

  @ApiProperty({ example: 'Tai khoan dang noi dung sai su that', required: false })
  @IsOptional()
  @IsString()
  targetUserId?: string;

  @ApiProperty({ example: 'Bai dang sai thong tin, gia khong trung thuc.' })
  @IsString()
  @MinLength(1)
  reason!: string;
}
