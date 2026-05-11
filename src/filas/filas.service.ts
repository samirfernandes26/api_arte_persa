import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { JobsOptions, Queue } from 'bullmq';
import Redis from 'ioredis';
import {
  NOME_TAREFA_ENVIAR_NOTIFICACAO,
  NOME_TAREFA_GERAR_PDF,
  NOME_TAREFA_OTIMIZAR_IMAGEM,
} from './constantes-fila';
import {
  CONEXAO_REDIS,
  FILA_IMAGEM,
  FILA_NOTIFICACAO,
  FILA_PDF,
} from './tokens-fila';
import {
  ResultadoTarefaNotificacao,
  TarefaNotificacao,
} from '../tarefas/tarefas-notificacao';
import {
  ResultadoTarefaGeracaoPdfOrdemServico,
  TarefaGeracaoPdfOrdemServico,
} from '../tarefas/tarefas-pdf';
import {
  ResultadoTarefaOtimizacaoImagem,
  TarefaOtimizacaoImagem,
} from '../tarefas/tarefas-imagem';
import { ProcessadorImagem } from '../processadores/processador-imagem';
import { ProcessadorNotificacao } from '../processadores/processador-notificacao';
import { ProcessadorPdf } from '../processadores/processador-pdf';

@Injectable()
export class FilasService implements OnModuleDestroy {
  private readonly logger = new Logger(FilasService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly processadorImagem: ProcessadorImagem,
    private readonly processadorPdf: ProcessadorPdf,
    private readonly processadorNotificacao: ProcessadorNotificacao,
    @Inject(FILA_IMAGEM)
    private readonly filaImagem: Queue<
      TarefaOtimizacaoImagem,
      ResultadoTarefaOtimizacaoImagem
    >,
    @Inject(FILA_PDF)
    private readonly filaPdf: Queue<
      TarefaGeracaoPdfOrdemServico,
      ResultadoTarefaGeracaoPdfOrdemServico
    >,
    @Inject(FILA_NOTIFICACAO)
    private readonly filaNotificacao: Queue<
      TarefaNotificacao,
      ResultadoTarefaNotificacao
    >,
    @Inject(CONEXAO_REDIS)
    private readonly conexaoRedis: Redis,
  ) {}

  async adicionarTarefaOtimizacaoImagem(
    carga: TarefaOtimizacaoImagem,
    opcoes?: JobsOptions,
  ) {
    this.logger.debug(`Enfileirando otimizacao da imagem ${carga.chave_origem}`);
    return this.filaImagem.add(NOME_TAREFA_OTIMIZAR_IMAGEM, carga, opcoes);
  }

  async adicionarTarefaGeracaoPdf(
    carga: TarefaGeracaoPdfOrdemServico,
    opcoes?: JobsOptions,
  ) {
    this.logger.debug(`Enfileirando PDF da ordem ${carga.ordem_servico_id}`);
    return this.filaPdf.add(NOME_TAREFA_GERAR_PDF, carga, opcoes);
  }

  async adicionarTarefaNotificacao(
    carga: TarefaNotificacao,
    opcoes?: JobsOptions,
  ) {
    this.logger.debug(`Enfileirando notificacao para ${carga.destinatario}`);
    return this.filaNotificacao.add(
      NOME_TAREFA_ENVIAR_NOTIFICACAO,
      carga,
      opcoes,
    );
  }

  obterAdaptadoresBullBoard() {
    return [
      new BullMQAdapter(this.filaImagem),
      new BullMQAdapter(this.filaPdf),
      new BullMQAdapter(this.filaNotificacao),
    ];
  }

  obterSaudeRedis() {
    return {
      host: this.configService.get<string>('REDIS_HOST'),
      porta: this.configService.get<number>('REDIS_PORTA'),
      banco: this.configService.get<number>('REDIS_BANCO'),
      status: this.conexaoRedis.status,
    };
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.processadorImagem.encerrar(),
      this.processadorPdf.encerrar(),
      this.processadorNotificacao.encerrar(),
    ]);

    await Promise.allSettled([
      this.filaImagem.close(),
      this.filaPdf.close(),
      this.filaNotificacao.close(),
    ]);

    await Promise.allSettled([
      this.filaImagem.disconnect(),
      this.filaPdf.disconnect(),
      this.filaNotificacao.disconnect(),
    ]);

    if (this.conexaoRedis.status !== 'end') {
      await this.conexaoRedis.quit();
    }
  }
}
