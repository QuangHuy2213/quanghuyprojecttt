import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

// Khai báo các enum tương ứng với Prisma Schema
enum TransactionType {
  SALE = 'SALE',
  RENT = 'RENT',
  PROJECT = 'PROJECT',
}

enum PosterType {
  OWNER = 'OWNER',
  BROKER = 'BROKER',
}

export class PostsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 8, minimum: 1, default: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Mã thành phố lấy từ GET /cities' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Mã quận/huyện lấy từ GET /districts/{cityCode}' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: 'căn hộ' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ example: '1b-3b', enum: ['under-1b', '1b-3b', '3b-5b', 'over-5b'] })
  @IsOptional()
  @IsString()
  price?: string;

  @ApiPropertyOptional({ example: '50-80', enum: ['under-30', '30-50', '50-80', 'over-80'] })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  transactionType?: TransactionType;
}

export class CreatePostDto {
  @ApiProperty({ example: 'Bán căn hộ 2 phòng ngủ tại Quận 7' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 3200000000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 68 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  area!: number;

  @ApiProperty({ description: 'Mã thành phố lấy từ GET /cities' })
  @IsString()
  city!: string;

  @ApiProperty({ description: 'Mã quận/huyện thuộc city, lấy từ GET /districts/{cityCode}' })
  @IsString()
  district!: string;

  @ApiProperty({ example: 'Căn hộ gần trung tâm, đầy đủ tiện ích...', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ example: 'https://example.com/images/post-thumbnail.jpg', required: false })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  // 🌟 BỔ SUNG: Mảng nhiều ảnh tải lên hoặc dán link
  @ApiProperty({ example: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  // 🌟 BỔ SUNG: Loại giao dịch (SALE hoặc RENT)
  @ApiProperty({ example: 'SALE', enum: ['SALE', 'RENT', 'PROJECT'], required: false })
  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType;

  // 🌟 BỔ SUNG: Tư cách người đăng (OWNER hoặc BROKER)
  @ApiProperty({ example: 'OWNER', enum: ['OWNER', 'BROKER'], required: false })
  @IsOptional()
  @IsEnum(PosterType)
  posterType?: PosterType;

  // 🌟 BỔ SUNG: Tỉ lệ phần trăm hoa hồng môi giới
  @ApiProperty({ example: 2.0, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  brokerCommission?: number;

  @ApiProperty({ description: 'ID người dùng lấy từ phiên đăng nhập', required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ example: 'Chuyền Nguyễn', required: false })
  @IsOptional()
  @IsString()
  sellerName?: string;

  @ApiProperty({ example: '123 Nguyen Van Linh, Phuong Tan Phong', required: false })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bathrooms?: number;
}

export class ToggleFavoriteDto {
  @ApiProperty({ description: 'ID người dùng lấy từ phiên đăng nhập' })
  @IsString()
  userId!: string;
}

export class UpdatePostDto {
  @ApiProperty({ description: 'ID người dùng lấy từ phiên đăng nhập' })
  @IsString()
  userId!: string;

  @ApiPropertyOptional({ example: 'Bán nhà phố mặt tiền Quận 2' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 4500000000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  area?: number;

  @ApiPropertyOptional({ description: 'Mã thành phố lấy từ GET /cities' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Mã quận/huyện thuộc city, lấy từ GET /districts/{cityCode}' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: 'Nhà đẹp, sổ hồng riêng, vào ở ngay.' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ example: 'https://example.com/images/updated-thumbnail.jpg' })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional({ example: ['https://example.com/img1.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ example: 'SALE', enum: ['SALE', 'RENT', 'PROJECT'] })
  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType;

  @ApiPropertyOptional({ example: 'OWNER', enum: ['OWNER', 'BROKER'] })
  @IsOptional()
  @IsEnum(PosterType)
  posterType?: PosterType;

  @ApiPropertyOptional({ example: 2.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  brokerCommission?: number;

  @ApiPropertyOptional({ example: 'PENDING', enum: ['PENDING', 'ACTIVE', 'SOLD', 'HIDDEN'] })
  status?: 'PENDING' | 'ACTIVE' | 'SOLD' | 'HIDDEN';

  @ApiPropertyOptional({ example: 'Le Van C' })
  @IsOptional()
  @IsString()
  sellerName?: string;

  @ApiPropertyOptional({ example: '45 Le Loi, Phuong Ben Nghe' })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bathrooms?: number;
}
