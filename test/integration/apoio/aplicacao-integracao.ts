import 'reflect-metadata';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { FiltroExcecaoGlobal } from '../../../src/comum/filtros/filtro-excecao-global';
import { ModuloAplicacao } from '../../../src/modulo-aplicacao';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { S3Service } from '../../../src/s3/s3.service';
import { S3FalsoMemoria } from './s3-falso-memoria';

export interface ContextoAplicacaoIntegracao {
  app: NestExpressApplication;
  prisma: PrismaService;
  s3Falso: S3FalsoMemoria;
}

export async function criarAplicacaoIntegracao(): Promise<ContextoAplicacaoIntegracao> {
  const s3Falso = new S3FalsoMemoria();
  const modulo = await Test.createTestingModule({
    imports: [ModuloAplicacao],
  })
    .overrideProvider(S3Service)
    .useValue(s3Falso)
    .compile();

  const app = modulo.createNestApplication<NestExpressApplication>();
  const configService = app.get(ConfigService);
  const reflector = app.get(Reflector);

  app.setGlobalPrefix(configService.get<string>('PREFIXO_GLOBAL_API', 'api'));
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['ETag'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));
  app.useGlobalFilters(new FiltroExcecaoGlobal());

  await app.init();

  return {
    app,
    prisma: app.get(PrismaService),
    s3Falso,
  };
}

export async function encerrarAplicacaoIntegracao(
  app?: NestExpressApplication,
): Promise<void> {
  if (!app) {
    return;
  }

  await app.close();
  await new Promise((resolve) => setTimeout(resolve, 300));
}
