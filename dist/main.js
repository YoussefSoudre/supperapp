"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log', 'debug'],
    });
    app.enableVersioning({ type: common_1.VersioningType.URI });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.enableCors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3001'],
        credentials: true,
    });
    if (process.env.NODE_ENV !== 'production') {
        const config = new swagger_1.DocumentBuilder()
            .setTitle('SuperApp BF API')
            .setDescription('API de la Super App Burkina Faso 🇧🇫 — Rides, Food, Delivery, Wallet, Payments')
            .setVersion('1.0')
            .addBearerAuth()
            .addTag('Auth')
            .addTag('Users')
            .addTag('Drivers')
            .addTag('Rides')
            .addTag('Delivery')
            .addTag('Food')
            .addTag('Wallet')
            .addTag('Payments')
            .addTag('Pricing')
            .addTag('Referral')
            .addTag('Notifications')
            .addTag('Cities')
            .addTag('Admin')
            .addTag('Analytics')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('docs', app, document, {
            swaggerOptions: { persistAuthorization: true },
        });
        logger.log('Swagger docs available at /docs');
    }
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    logger.log(`🚀 SuperApp BF API running on: http://localhost:${port}/api`);
    logger.log(`📖 Swagger docs: http://localhost:${port}/docs`);
}
void bootstrap();
//# sourceMappingURL=main.js.map