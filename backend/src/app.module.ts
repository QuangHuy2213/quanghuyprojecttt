import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostsController } from './api/posts/posts.controller';
import { PostsService } from './api/posts/posts.service';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './api/auth/auth.module'; 
import { NotificationModule } from './api/notification/notification.module';
import { AdminModule } from './api/admin/admin.module';
@Module({
  imports: [AuthModule, NotificationModule, AdminModule],
  controllers: [AppController, PostsController],
  providers: [AppService, PostsService, PrismaService],
})
export class AppModule {}