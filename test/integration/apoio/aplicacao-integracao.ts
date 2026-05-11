import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
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

  app.setGlobalPrefix(configService.get<string>('PREFIXO_GLOBAL_API', 'api'));
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
