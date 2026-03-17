import { ExpressAdapter } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { json, urlencoded } from 'express';

// Use require for express so Vercel/CommonJS gets the callable (no default export interop issue)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const express = require('express') as typeof import('express');

let cachedApp: ReturnType<typeof express> | null = null;

function createExpressApp(): ReturnType<typeof express> {
  const expressApp = express();
  expressApp.use(json({ limit: '15mb' }));
  expressApp.use(urlencoded({ extended: true, limit: '15mb' }));
  return expressApp;
}

async function createNestApp(expressApp: ReturnType<typeof express>): Promise<INestApplication> {
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter, { bodyParser: false });

  const config = app.get(ConfigService);
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MenuMind API')
    .setDescription('MenuMind backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  app.use(helmet());
  const corsOrigins = config.get<string>('CORS_ORIGINS');
  app.enableCors({
    origin: corsOrigins ? corsOrigins.split(',').map((o) => o.trim()) : false,
    credentials: true,
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return app;
}

/**
 * Returns the Express app for Vercel serverless. Caches the app so we don't re-bootstrap on every request.
 */
export function getVercelHandler(): ReturnType<typeof express> {
  if (cachedApp) {
    return cachedApp;
  }
  const expressApp = createExpressApp();
  let appPromise: Promise<INestApplication> | null = null;

  const getApp = (): Promise<INestApplication> => {
    if (!appPromise) {
      appPromise = createNestApp(expressApp);
    }
    return appPromise;
  };

  expressApp.use((req: Request, res: Response, next: NextFunction) => {
    getApp()
      .then(() => next())
      .catch((err) => next(err));
  });

  cachedApp = expressApp;
  return expressApp;
}
