import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { ModuloAplicacao } from './modulo-aplicacao';
import { configurarPainelFilas } from './filas/configurar-painel-filas';
import { PrismaService } from './prisma/prisma.service';

async function inicializar(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(ModuloAplicacao, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const prismaService = app.get(PrismaService);
  const jwtService = app.get(JwtService);
  const logger = new Logger('Inicializacao');

  app.enableShutdownHooks();
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

  await prismaService.habilitarHooksEncerramento(app);
  configurarPainelFilas(app, jwtService);

  const host = configService.get<string>('HOST_APLICACAO', '0.0.0.0');
  const porta = configService.get<number>('PORTA_APLICACAO', 3000);

  await app.listen(porta, host);
  logger.log(`Servidor iniciado em http://${host}:${porta}`);
}

void inicializar();
