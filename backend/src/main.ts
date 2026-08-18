import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Sửa chỗ này: Thêm domain Vercel vào danh sách cho phép
  app.enableCors({
    origin: [
      'http://localhost:3000', 
      'https://nguyenducquanghuy.vercel.app'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3001); 
  // Lưu ý: Render thường tự cấp phát cổng qua process.env.PORT, 
  // hãy giữ là process.env.PORT || 3000 để tránh lỗi không khởi động được trên Render.
}
bootstrap();