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

  // =====================================================
  // CORS
  // =====================================================

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://nguyenducquanghuy.vercel.app',
      'http://127.0.0.1:8000',
      'https://quanghuy-security.onrender.com',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Client-Id',
      'X-Security-Gateway-Key',
    ],
  });

  // =====================================================
  // SECURITY GATEWAY
  // =====================================================

  const gatewaySecret =
    process.env.SECURITY_GATEWAY_SECRET;

  app.use((req, res, next) => {
    const path = req.path;

    // Các route được phép truy cập trực tiếp
    const publicPaths = [
      '/health',
      '/auth/google',
      '/auth/google/callback',
      '/api',
    ];

    const isPublicPath = publicPaths.some((publicPath) => {
      if (publicPath === '/api') {
        // Cho Swagger hoạt động
        return (
          path === '/api' ||
          path.startsWith('/api/')
        );
      }

      return (
        path === publicPath ||
        path.startsWith(`${publicPath}/`)
      );
    });

    if (isPublicPath) {
      return next();
    }

    const securityKey =
      req.headers['x-security-gateway-key'];

    if (
      !gatewaySecret ||
      securityKey !== gatewaySecret
    ) {
      return res.status(403).json({
        statusCode: 403,
        message:
          'Yêu cầu phải đi qua Security Gateway.',
      });
    }

    next();
  });

  // =====================================================
  // SWAGGER
  // =====================================================

  const config = new DocumentBuilder()
    .setTitle('Nhà Tốt API')
    .setDescription(
      'Tài liệu API cho hệ thống nền tảng bất động sản Nhà Tốt',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(
    app,
    config,
  );

  SwaggerModule.setup(
    'api',
    app,
    document,
  );

  // =====================================================
  // START SERVER
  // =====================================================

  const port =
    process.env.PORT || 3001;

  await app.listen(
    port,
    '0.0.0.0',
  );

  console.log(
    `Backend đang chạy tại port ${port}`,
  );

  console.log(
    gatewaySecret
      ? 'Security Gateway đã được cấu hình.'
      : 'CẢNH BÁO: SECURITY_GATEWAY_SECRET chưa được cấu hình!',
  );
}

bootstrap();