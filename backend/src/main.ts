import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Cho phép Frontend (cổng 3000) gọi API
  app.enableCors({
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Đổi cổng Backend sang 3001
  await app.listen(3001);
  console.log(`🚀 Backend NestJS đang chạy tại: http://localhost:3001`);
}
bootstrap();