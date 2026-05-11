import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import Redis from 'ioredis';
import { NOME_FILA_NOTIFICACAO } from '../filas/constantes-fila';
import { CONEXAO_REDIS } from '../filas/tokens-fila';
import {
  ResultadoTarefaNotificacao,
  TarefaNotificacao,
} from '../tarefas/tarefas-notificacao';

@Injectable()
export class ProcessadorNotificacao implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProcessadorNotificacao.name);
  private worker?: Worker<TarefaNotificacao, ResultadoTarefaNotificacao>;
  private conexaoWorker?: Redis;
  private encerramento?: Promise<void>;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CONEXAO_REDIS)
    private readonly conexaoRedis: Redis,
  ) {}

  onModuleInit(): void {
    this.conexaoWorker = this.conexaoRedis.duplicate();
    this.worker = new Worker<TarefaNotificacao, ResultadoTarefaNotificacao>(
      NOME_FILA_NOTIFICACAO,
      (job) => this.processar(job),
      {
        connection: this.conexaoWorker,
        concurrency: this.configService.get<number>(
          'CONCORRENCIA_FILA_NOTIFICACAO',
          4,
        ),
        prefix: this.configService.get<string>('BULLMQ_PREFIXO', 'ordens-servico'),
      },
    );

    this.worker.on('error', (erro) => {
      if (erro.message.includes('Connection is closed')) {
        this.logger.debug(
          'Worker de notificacao encerrado apos fechamento da conexao.',
        );
        return;
      }

      this.logger.error(
        `Erro no worker de notificacao: ${erro.message}`,
        erro.stack,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.encerrar();
  }

  async encerrar(): Promise<void> {
    if (!this.encerramento) {
      this.encerramento = this.encerrarInternamente();
    }

    await this.encerramento;
  }

  private async encerrarInternamente(): Promise<void> {
    try {
      await this.worker?.close(true);
    } catch (erro) {
      if (
        !(erro instanceof Error) ||
        !erro.message.includes('Connection is closed')
      ) {
        this.logger.warn(
          `Falha ao encerrar worker de notificacao: ${
            erro instanceof Error ? erro.message : 'erro desconhecido'
          }`,
        );
      }
    }

    try {
      await this.worker?.disconnect();
    } catch (erro) {
      if (
        !(erro instanceof Error) ||
        !erro.message.includes('Connection is closed')
      ) {
        this.logger.warn(
          `Falha ao desconectar worker de notificacao: ${
            erro instanceof Error ? erro.message : 'erro desconhecido'
          }`,
        );
      }
    }

    try {
      if (this.conexaoWorker && this.conexaoWorker.status !== 'end') {
        await this.conexaoWorker.quit();
      }
    } catch (erro) {
      if (
        !(erro instanceof Error) ||
        !erro.message.includes('Connection is closed')
      ) {
        this.logger.warn(
          `Falha ao encerrar conexao do worker de notificacao: ${
            erro instanceof Error ? erro.message : 'erro desconhecido'
          }`,
        );
      }
    }

    this.worker = undefined;
    this.conexaoWorker = undefined;
  }

  private async processar(
    job: Job<TarefaNotificacao, ResultadoTarefaNotificacao>,
  ): Promise<ResultadoTarefaNotificacao> {
    this.logger.log(
      `Notificacao preparada para ${job.data.canal}:${job.data.destinatario}`,
    );

    return {
      entregue: true,
      processado_em: new Date().toISOString(),
    };
  }
}
