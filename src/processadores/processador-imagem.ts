import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import Redis from 'ioredis';
import sharp from 'sharp';
import { ServicoS3 } from '../s3/s3.service';
import { NOME_FILA_IMAGEM } from '../filas/constantes-fila';
import { CONEXAO_REDIS } from '../filas/tokens-fila';
import {
  FormatoImagemSuportado,
  ResultadoTarefaOtimizacaoImagem,
  TarefaOtimizacaoImagem,
} from '../tarefas/tarefas-imagem';

@Injectable()
export class ProcessadorImagem implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProcessadorImagem.name);
  private worker?: Worker<TarefaOtimizacaoImagem, ResultadoTarefaOtimizacaoImagem>;
  private conexaoWorker?: Redis;
  private encerramento?: Promise<void>;

  constructor(
    private readonly configService: ConfigService,
    private readonly s3Service: ServicoS3,
    @Inject(CONEXAO_REDIS)
    private readonly conexaoRedis: Redis,
  ) {}

  onModuleInit(): void {
    this.conexaoWorker = this.conexaoRedis.duplicate();
    this.worker = new Worker<TarefaOtimizacaoImagem, ResultadoTarefaOtimizacaoImagem>(
      NOME_FILA_IMAGEM,
      (job) => this.processar(job),
      {
        connection: this.conexaoWorker,
        concurrency: this.configService.get<number>('CONCORRENCIA_FILA_IMAGEM', 2),
        prefix: this.configService.get<string>('BULLMQ_PREFIXO', 'ordens-servico'),
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`Tarefa de imagem ${job.id ?? 'sem-id'} concluida.`);
    });

    this.worker.on('failed', (job, erro) => {
      this.logger.error(
        `Tarefa de imagem ${job?.id ?? 'sem-id'} falhou: ${erro.message}`,
        erro.stack,
      );
    });

    this.worker.on('error', (erro) => {
      if (erro.message.includes('Connection is closed')) {
        this.logger.debug(
          'Worker de imagem encerrado apos fechamento da conexao.',
        );
        return;
      }

      this.logger.error(`Erro no worker de imagem: ${erro.message}`, erro.stack);
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
          `Falha ao encerrar worker de imagem: ${
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
          `Falha ao desconectar worker de imagem: ${
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
          `Falha ao encerrar conexao do worker de imagem: ${
            erro instanceof Error ? erro.message : 'erro desconhecido'
          }`,
        );
      }
    }

    this.worker = undefined;
    this.conexaoWorker = undefined;
  }

  private async processar(
    job: Job<TarefaOtimizacaoImagem, ResultadoTarefaOtimizacaoImagem>,
  ): Promise<ResultadoTarefaOtimizacaoImagem> {
    const bufferOriginal = await this.s3Service.obterBufferObjeto(
      job.data.chave_origem,
    );
    const formatoDestino = job.data.formato ?? 'webp';
    const bufferOtimizado = await this.otimizar(
      bufferOriginal,
      job.data,
      formatoDestino,
    );
    const chaveDestino = this.resolverChaveDestino(job.data, formatoDestino);
    const tipoConteudo = this.resolverTipoConteudo(formatoDestino);

    const upload = await this.s3Service.enviarArquivo({
      chave: chaveDestino,
      corpo: bufferOtimizado,
      tipo_conteudo: tipoConteudo,
      cache_control: 'public, max-age=31536000, immutable',
      metadados: {
        ordem_servico_id: String(job.data.ordem_servico_id),
        chave_origem: job.data.chave_origem,
        ...(job.data.metadados ?? {}),
      },
    });

    if (job.data.apagar_origem_apos_processamento) {
      await this.s3Service.removerArquivo(job.data.chave_origem);
    }

    return {
      chave: upload.chave,
      url: upload.url,
      tipo_conteudo: tipoConteudo,
      tamanho_bytes: bufferOtimizado.byteLength,
      processado_em: new Date().toISOString(),
    };
  }

  private async otimizar(
    bufferOriginal: Buffer,
    carga: TarefaOtimizacaoImagem,
    formatoDestino: FormatoImagemSuportado,
  ): Promise<Buffer> {
    const pipeline = sharp(bufferOriginal, { failOn: 'none' })
      .rotate()
      .resize({
        width: carga.largura_maxima ?? 2400,
        height: carga.altura_maxima ?? 2400,
        fit: 'inside',
        withoutEnlargement: true,
      });

    const qualidade = carga.qualidade ?? 82;
    switch (formatoDestino) {
      case 'jpeg':
        return pipeline.jpeg({ quality: qualidade, mozjpeg: true }).toBuffer();
      case 'png':
        return pipeline.png({ quality: qualidade, compressionLevel: 9 }).toBuffer();
      case 'webp':
      default:
        return pipeline.webp({ quality: qualidade }).toBuffer();
    }
  }

  private resolverChaveDestino(
    carga: TarefaOtimizacaoImagem,
    formatoDestino: FormatoImagemSuportado,
  ): string {
    if (carga.chave_destino) {
      return carga.chave_destino;
    }

    const base = carga.chave_origem.replace(/\.[^.]+$/, '');
    return `${base}.otimizada.${formatoDestino}`;
  }

  private resolverTipoConteudo(formatoDestino: FormatoImagemSuportado): string {
    switch (formatoDestino) {
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
      default:
        return 'image/webp';
    }
  }
}
