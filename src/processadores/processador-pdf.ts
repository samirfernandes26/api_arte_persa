import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Job, Worker } from 'bullmq';
import Redis from 'ioredis';
import { ServicoPrisma } from '../prisma/prisma.service';
import { ServicoS3 } from '../s3/s3.service';
import { NOME_FILA_PDF } from '../filas/constantes-fila';
import { CONEXAO_REDIS } from '../filas/tokens-fila';
import {
  ResultadoTarefaGeracaoPdfOrdemServico,
  TarefaGeracaoPdfOrdemServico,
} from '../tarefas/tarefas-pdf';

@Injectable()
export class ProcessadorPdf implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProcessadorPdf.name);
  private worker?: Worker<
    TarefaGeracaoPdfOrdemServico,
    ResultadoTarefaGeracaoPdfOrdemServico
  >;
  private conexaoWorker?: Redis;
  private encerramento?: Promise<void>;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: ServicoPrisma,
    private readonly s3Service: ServicoS3,
    @Inject(CONEXAO_REDIS)
    private readonly conexaoRedis: Redis,
  ) {}

  onModuleInit(): void {
    this.conexaoWorker = this.conexaoRedis.duplicate();
    this.worker = new Worker<
      TarefaGeracaoPdfOrdemServico,
      ResultadoTarefaGeracaoPdfOrdemServico
    >(
      NOME_FILA_PDF,
      (job) => this.processar(job),
      {
        connection: this.conexaoWorker,
        concurrency: this.configService.get<number>('CONCORRENCIA_FILA_PDF', 2),
        prefix: this.configService.get<string>('BULLMQ_PREFIXO', 'ordens-servico'),
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`Tarefa de PDF ${job.id ?? 'sem-id'} concluida.`);
    });

    this.worker.on('failed', (job, erro) => {
      this.logger.error(
        `Tarefa de PDF ${job?.id ?? 'sem-id'} falhou: ${erro.message}`,
        erro.stack,
      );
    });

    this.worker.on('error', (erro) => {
      if (erro.message.includes('Connection is closed')) {
        this.logger.debug('Worker de PDF encerrado apos fechamento da conexao.');
        return;
      }

      this.logger.error(`Erro no worker de PDF: ${erro.message}`, erro.stack);
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
          `Falha ao encerrar worker de PDF: ${
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
          `Falha ao desconectar worker de PDF: ${
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
          `Falha ao encerrar conexao do worker de PDF: ${
            erro instanceof Error ? erro.message : 'erro desconhecido'
          }`,
        );
      }
    }

    this.worker = undefined;
    this.conexaoWorker = undefined;
  }

  private async processar(
    job: Job<
      TarefaGeracaoPdfOrdemServico,
      ResultadoTarefaGeracaoPdfOrdemServico
    >,
  ): Promise<ResultadoTarefaGeracaoPdfOrdemServico> {
    const documento = await PDFDocument.create();
    const pagina = documento.addPage([595.28, 841.89]);
    const fonte = await documento.embedFont(StandardFonts.Helvetica);

    const linhas = [
      'Ordem de Servico',
      `Codigo: ${job.data.codigo_ordem_servico}`,
      `Cliente: ${job.data.nome_cliente}`,
      `Status: ${job.data.status}`,
      `Subtotal: ${job.data.valor_subtotal ?? '-'}`,
      `Desconto: ${job.data.valor_desconto ?? '-'}`,
      `Total: ${job.data.valor_total ?? '-'}`,
      '',
      'Itens:',
      ...(job.data.itens?.map(
        (item) =>
          `- ${item.descricao} | qtd ${item.quantidade} | total ${item.valor_total}`,
      ) ?? ['- Nenhum item informado']),
      '',
      `Observacoes: ${job.data.observacoes ?? '-'}`,
      `Gerado em: ${new Date().toISOString()}`,
    ];

    let y = 790;
    linhas.forEach((linha, indice) => {
      const tamanho = indice === 0 ? 18 : 11;
      pagina.drawText(linha, {
        x: 40,
        y,
        size: tamanho,
        font: fonte,
        color: indice === 0 ? rgb(0.08, 0.16, 0.34) : rgb(0.12, 0.12, 0.12),
      });
      y -= indice === 0 ? 28 : 18;
    });

    const buffer = Buffer.from(await documento.save());
    const chaveArquivo =
      job.data.chave_arquivo ??
      `ordens/${job.data.ordem_servico_id}/pdf/ordem-${job.data.codigo_ordem_servico}.pdf`;

    const upload = await this.s3Service.enviarArquivo({
      chave: chaveArquivo,
      corpo: buffer,
      tipo_conteudo: 'application/pdf',
      cache_control: 'private, max-age=0, no-cache',
      metadados: {
        ordem_servico_id: job.data.ordem_servico_id,
        codigo_ordem_servico: job.data.codigo_ordem_servico,
      },
    });

    await this.prisma.ordemServico.update({
      where: { id: job.data.ordem_servico_id },
      data: {
        chave_pdf: upload.chave,
        url_pdf: upload.url,
      },
    });

    return {
      chave: upload.chave,
      url: upload.url,
      paginas: documento.getPageCount(),
      gerado_em: new Date().toISOString(),
    };
  }
}
