import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule], // Khai báo PrismaModule ở đây
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}