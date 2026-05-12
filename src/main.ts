import 'reflect-metadata';
import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import helmet from 'helmet';
import { FiltroExcecaoGlobal } from './comum/filtros/filtro-excecao-global';
import { ModuloAplicacao } from './modulo-aplicacao';
import { configurarPainelFilas } from './filas/configurar-painel-filas';
import { ServicoPrisma } from './prisma/prisma.service';

async function inicializar(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(ModuloAplicacao, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const prismaService = app.get(ServicoPrisma);
  const jwtService = app.get(JwtService);
  const reflector = app.get(Reflector);
  const logger = new Logger('Inicializacao');

  app.enableShutdownHooks();
  app.setGlobalPrefix(configService.get<string>('PREFIXO_GLOBAL_API', 'api'));
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  app.enableCors({
    origin: configurarOrigensCors(
      configService.get<string>('CORS_ORIGENS_PERMITIDAS', 'http://localhost:3000'),
    ),
    credentials: configService.get<boolean>('CORS_CREDENCIAIS', true),
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

  await prismaService.habilitarHooksEncerramento(app);
  configurarPainelFilas(app, jwtService);

  const host = configService.get<string>('HOST_APLICACAO', '0.0.0.0');
  const porta = configService.get<number>('PORTA_APLICACAO', 3000);

  await app.listen(porta, host);
  logger.log(`Servidor iniciado em http://${host}:${porta}`);
}

function configurarOrigensCors(origensConfiguradas: string): string[] | boolean {
  const origens = origensConfiguradas
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!origens.length || origens.includes('*')) {
    return true;
  }

  return origens;
}

void inicializar();
