import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config'; // Đảm bảo đọc được link DATABASE_URL từ file .env

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Khởi tạo Pool kết nối từ đường dẫn .env
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    
    // Gắn "tài xế" PrismaPg vào PrismaClient
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}