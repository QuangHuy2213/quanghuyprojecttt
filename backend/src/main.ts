import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  
  // Sửa chỗ này: Thêm domain Vercel vào danh sách cho phép
  app.enableCors({
    origin: [
      'http://localhost:3000', 
      'https://nguyenducquanghuy.vercel.app'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 🌟 CẤU HÌNH SWAGGER BẮT ĐẦU TỪ ĐÂY 🌟
  const config = new DocumentBuilder()
    .setTitle('Nhà Tốt API') 
    .setDescription('Tài liệu API cho hệ thống nền tảng bất động sản Nhà Tốt')
    .setVersion('1.0')
    .addBearerAuth() // Thêm ô nhập Token JWT cho các API cần đăng nhập
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  
  // Thiết lập đường dẫn truy cập tài liệu Swagger là /api
  SwaggerModule.setup('api', app, document); 
  // 🌟 KẾT THÚC CẤU HÌNH SWAGGER 🌟

  await app.listen(process.env.PORT || 3001); 
  // Lưu ý: Render thường tự cấp phát cổng qua process.env.PORT, 
  // hãy giữ là process.env.PORT || 3000 để tránh lỗi không khởi động được trên Render.
}
bootstrap();