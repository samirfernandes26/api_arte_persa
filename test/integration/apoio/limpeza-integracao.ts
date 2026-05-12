import { INestApplication } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { ServicoPrisma } from '../../../src/prisma/prisma.service';
import {
  CONEXAO_REDIS,
  FILA_IMAGEM,
  FILA_NOTIFICACAO,
  FILA_PDF,
} from '../../../src/filas/tokens-fila';
import { esperar } from './esperas';

const tabelas = [
  'imagens_observacao',
  'observacoes',
  'intencoes_upload',
  'historicos_status_ordem_servico',
  'servicos_executados_item',
  'imagens_ordem_servico',
  'itens_ordem_servico',
  'faturas',
  'ordens_servico',
  'arquivos_cliente',
  'enderecos_cliente',
  'contatos_cliente',
  'clientes',
  'servicos_catalogo',
  'tokens_refresh',
  'usuarios',
] as const;

export async function aguardarFilasOciosas(app?: INestApplication) {
  if (!app) {
    return;
  }

  const filas = obterFilas(app);
  const timeoutMs = 12000;
  const intervaloMs = 200;
  const limite = Date.now() + timeoutMs;
  let ultimoResumo = 'sem detalhes';

  while (Date.now() < limite) {
    const contagens = await Promise.all(
      filas.map(async (fila) => {
        const total = await fila.getJobCounts(
          'waiting',
          'active',
          'delayed',
          'prioritized',
          'failed',
          'completed',
        );
        const ativos = await fila.getJobs(
          ['waiting', 'active', 'delayed', 'prioritized', 'failed'],
          0,
          5,
          true,
        );

        return {
          fila: fila.name,
          total,
          jobs: ativos.map((job) => `${job.id}:${job.name}`),
        };
      }),
    );

    ultimoResumo = contagens
      .map(
        ({ fila, total, jobs }) =>
          `${fila}: waiting=${total.waiting} active=${total.active} delayed=${total.delayed} prioritized=${total.prioritized} failed=${total.failed} completed=${total.completed} jobs=[${jobs.join(', ')}]`,
      )
      .join(' | ');

    const pendentes = contagens.reduce(
      (acumulado, { total }) =>
        acumulado +
        total.waiting +
        total.active +
        total.delayed +
        total.prioritized,
      0,
    );

    if (pendentes === 0) {
      return;
    }

    await esperar(intervaloMs);
  }

  throw new Error(`As filas nao ficaram ociosas a tempo. ${ultimoResumo}`);
}

export async function limparFilas(app?: INestApplication) {
  if (!app) {
    return;
  }

  const filas = obterFilas(app);
  for (const fila of filas) {
    await fila.obliterate({ force: true });
  }

  const redis = app.get<Redis>(CONEXAO_REDIS);
  await redis.flushdb();
}

export async function limparBanco(prisma: ServicoPrisma) {
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
  for (const tabela of tabelas) {
    await prisma.$executeRawUnsafe(`DELETE FROM \`${tabela}\``);
    await prisma.$executeRawUnsafe(`ALTER TABLE \`${tabela}\` AUTO_INCREMENT = 1`);
  }
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
}

function obterFilas(app: INestApplication) {
  return [
    app.get<Queue>(FILA_IMAGEM),
    app.get<Queue>(FILA_PDF),
    app.get<Queue>(FILA_NOTIFICACAO),
  ];
}
