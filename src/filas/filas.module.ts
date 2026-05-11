import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { S3Module } from '../s3/s3.module';
import { ProcessadorImagem } from '../processadores/processador-imagem';
import { ProcessadorNotificacao } from '../processadores/processador-notificacao';
import { ProcessadorPdf } from '../processadores/processador-pdf';
import {
  NOME_FILA_IMAGEM,
  NOME_FILA_NOTIFICACAO,
  NOME_FILA_PDF,
} from './constantes-fila';
import { FilasService } from './filas.service';
import {
  CONEXAO_REDIS,
  FILA_IMAGEM,
  FILA_NOTIFICACAO,
  FILA_PDF,
} from './tokens-fila';

@Module({
  imports: [ConfigModule, S3Module],
  providers: [
    {
      provide: CONEXAO_REDIS,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new Redis({
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORTA', 6379),
          password: configService.get<string>('REDIS_SENHA') || undefined,
          db: configService.get<number>('REDIS_BANCO', 0),
          maxRetriesPerRequest: null,
          enableReadyCheck: true,
          lazyConnect: false,
          tls: configService.get<boolean>('REDIS_TLS', false) ? {} : undefined,
        }),
    },
    {
      provide: FILA_IMAGEM,
      inject: [ConfigService, CONEXAO_REDIS],
      useFactory: (configService: ConfigService, conexao: Redis) =>
        new Queue(NOME_FILA_IMAGEM, {
          connection: conexao,
          prefix: configService.get<string>('BULLMQ_PREFIXO', 'ordens-servico'),
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: {
              age: configService.get<number>(
                'BULLMQ_REMOVER_CONCLUIDOS_SEGUNDOS',
                86400,
              ),
            },
            removeOnFail: {
              age: configService.get<number>(
                'BULLMQ_REMOVER_FALHAS_SEGUNDOS',
                604800,
              ),
            },
          },
        }),
    },
    {
      provide: FILA_PDF,
      inject: [ConfigService, CONEXAO_REDIS],
      useFactory: (configService: ConfigService, conexao: Redis) =>
        new Queue(NOME_FILA_PDF, {
          connection: conexao,
          prefix: configService.get<string>('BULLMQ_PREFIXO', 'ordens-servico'),
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 3000 },
            removeOnComplete: {
              age: configService.get<number>(
                'BULLMQ_REMOVER_CONCLUIDOS_SEGUNDOS',
                86400,
              ),
            },
            removeOnFail: {
              age: configService.get<number>(
                'BULLMQ_REMOVER_FALHAS_SEGUNDOS',
                604800,
              ),
            },
          },
        }),
    },
    {
      provide: FILA_NOTIFICACAO,
      inject: [ConfigService, CONEXAO_REDIS],
      useFactory: (configService: ConfigService, conexao: Redis) =>
        new Queue(NOME_FILA_NOTIFICACAO, {
          connection: conexao,
          prefix: configService.get<string>('BULLMQ_PREFIXO', 'ordens-servico'),
          defaultJobOptions: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: {
              age: configService.get<number>(
                'BULLMQ_REMOVER_CONCLUIDOS_SEGUNDOS',
                86400,
              ),
            },
            removeOnFail: {
              age: configService.get<number>(
                'BULLMQ_REMOVER_FALHAS_SEGUNDOS',
                604800,
              ),
            },
          },
        }),
    },
    FilasService,
    ProcessadorImagem,
    ProcessadorPdf,
    ProcessadorNotificacao,
  ],
  exports: [FilasService, FILA_IMAGEM, FILA_PDF, FILA_NOTIFICACAO],
})
export class FilasModule implements OnModuleInit {
  constructor(
    private readonly processadorImagem: ProcessadorImagem,
    private readonly processadorPdf: ProcessadorPdf,
    private readonly processadorNotificacao: ProcessadorNotificacao,
  ) {}

  onModuleInit(): void {
    void this.processadorImagem;
    void this.processadorPdf;
    void this.processadorNotificacao;
  }
}
