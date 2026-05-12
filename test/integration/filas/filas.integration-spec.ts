import request from 'supertest';
import { Queue } from 'bullmq';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  criarAplicacaoIntegracao,
  encerrarAplicacaoIntegracao,
} from '../apoio/aplicacao-integracao';
import { autenticar, criarPrimeiroMaster } from '../apoio/autenticacao-teste';
import { esperarAte } from '../apoio/esperas';
import {
  aguardarFilasOciosas,
  limparBanco,
  limparFilas,
} from '../apoio/limpeza-integracao';
import { criarPayloadCliente } from '../factories/cliente.factory';
import { criarPayloadOrdemServico } from '../factories/ordem-servico.factory';
import { criarPayloadServico } from '../factories/servico.factory';
import { FILA_PDF } from '../../../src/filas/tokens-fila';
import { ServicoPrisma } from '../../../src/prisma/prisma.service';

describe('Integracao - Filas BullMQ', () => {
  let app: NestExpressApplication;
  let prisma: ServicoPrisma;
  let filaPdf: Queue;

  beforeAll(async () => {
    const contexto = await criarAplicacaoIntegracao();
    app = contexto.app;
    prisma = contexto.prisma;
    filaPdf = app.get<Queue>(FILA_PDF);
  });

  afterAll(async () => {
    await encerrarAplicacaoIntegracao(app);
  });

  beforeEach(async () => {
    await limparFilas(app);
    await limparBanco(prisma);
  });

  afterEach(async () => {
    await aguardarFilasOciosas(app);
  });

  it('adiciona job de geracao de PDF e persiste o resultado na ordem', async () => {
    const { credenciais } = await criarPrimeiroMaster(app);
    const loginMaster = await autenticar(app, credenciais.email, credenciais.senha);

    const servico = await request(app.getHttpServer())
      .post('/api/servicos')
      .set('Authorization', `Bearer ${loginMaster.token_acesso}`)
      .send(criarPayloadServico())
      .expect(201);

    const cliente = await request(app.getHttpServer())
      .post('/api/clientes')
      .set('Authorization', `Bearer ${loginMaster.token_acesso}`)
      .send(criarPayloadCliente())
      .expect(201);

    const ordem = await request(app.getHttpServer())
      .post('/api/ordens-servico')
      .set('Authorization', `Bearer ${loginMaster.token_acesso}`)
      .send(
        criarPayloadOrdemServico({
          clienteId: cliente.body.id,
          servicoCatalogoId: servico.body.id,
          responsavelId: loginMaster.usuario.id,
          percentualDesconto: 5,
        }),
      )
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/ordens-servico/${ordem.body.id}/gerar-pdf`)
      .set('Authorization', `Bearer ${loginMaster.token_acesso}`)
      .expect(201);

    const jobs = await esperarAte(
      async () => filaPdf.getJobs(['waiting', 'active', 'completed', 'delayed']),
      (lista) =>
        lista.some((job) => job.data.ordem_servico_id === ordem.body.id),
      {
        timeoutMs: 8000,
        intervaloMs: 200,
        mensagemErro: 'Nenhum job de PDF foi encontrado na fila.',
      },
    );

    expect(jobs.some((job) => job.data.ordem_servico_id === ordem.body.id)).toBe(true);

    const ordemComPdf = await esperarAte(
      async () =>
        prisma.ordemServico.findUnique({
          where: { id: ordem.body.id },
        }),
      (registro) => Boolean(registro?.chave_pdf && registro?.url_pdf),
      {
        timeoutMs: 8000,
        intervaloMs: 200,
        mensagemErro: 'O PDF nao foi persistido na ordem de servico.',
      },
    );

    expect(ordemComPdf?.chave_pdf).toContain(`ordens/${ordem.body.id}/documentos/`);
    expect(ordemComPdf?.url_pdf).toBeTruthy();
  });
});
