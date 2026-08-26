import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsInt, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserRoleDto {
  @ApiProperty({ example: 'AGENT', enum: ['USER', 'AGENT', 'ADMIN'] })
  @IsString()
  role!: 'USER' | 'AGENT' | 'ADMIN';
}

export class CreateUserDto {
  @ApiProperty({ example: 'agent@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', required: false })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ example: 'Nguyen Thi D' })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: '0912345678', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: 'USER', enum: ['USER', 'AGENT', 'ADMIN'], required: false })
  @IsOptional()
  @IsString()
  role?: 'USER' | 'AGENT' | 'ADMIN';
}

export class UpdateUserDetailsDto {
  @ApiPropertyOptional({ example: 'Nguyen Thi D Updated' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '0988888888' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'ADMIN', enum: ['USER', 'AGENT', 'ADMIN'] })
  @IsOptional()
  @IsString()
  role?: 'USER' | 'AGENT' | 'ADMIN';

  // CHO PHÉP NHẬN LỆNH KHÓA / MỞ KHÓA
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  // 🌟 MỚI: THÊM TRƯỜNG LÝ DO KHÓA TÀI KHOẢN
  @ApiPropertyOptional({ example: 'Có hành vi gian lận trốn phí giao dịch' })
  @IsOptional()
  @IsString()
  lockReason?: string;
}

export class ReviewPostDto {
  @ApiProperty({ example: 'ACTIVE', enum: ['ACTIVE', 'HIDDEN'] })
  @IsString()
  status!: 'ACTIVE' | 'HIDDEN';

  @ApiPropertyOptional({ example: 'Nội dung bài đăng cần bổ sung giấy tờ pháp lý.' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateContactStatusDto {
  @ApiProperty({ example: 'REPLIED', enum: ['PENDING', 'REPLIED'] })
  @IsString()
  status!: string;
}

export class UpdateReportStatusDto {
  @ApiProperty({ example: 'RESOLVED', enum: ['RESOLVED', 'IGNORED'] })
  @IsString()
  status!: 'RESOLVED' | 'IGNORED';
}

export class ReplyContactEmailDto {
  @ApiProperty({ description: 'ID liên hệ lấy từ GET /admin/contacts' })
  @Type(() => Number)
  @IsInt()
  contactId!: number;

  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Phan hoi yeu cau ho tro' })
  @IsString()
  subject!: string;

  @ApiProperty({ example: 'Cam on ban da lien he. Chung toi se ho tro trong hom nay.' })
  @IsString()
  message!: string;
}

// 🌟 MỚI: DTO CHO API XỬ LÝ TRANH CHẤP GIAO DỊCH (ESCROW)
export class ResolveTransactionDto {
  @ApiProperty({ example: 'SUCCESS', enum: ['SUCCESS', 'CANCELLED'] })
  @IsString()
  resolutionStatus!: 'SUCCESS' | 'CANCELLED';

  @ApiPropertyOptional({ example: 450000, description: 'Số tiền phí phạt hoặc phí hoa hồng Admin quyết định thu' })
  @IsOptional()
  @IsNumber()
  finalFee?: number;
}