import request from 'supertest';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  criarAplicacaoIntegracao,
  encerrarAplicacaoIntegracao,
} from '../apoio/aplicacao-integracao';
import { autenticar, criarPrimeiroMaster } from '../apoio/autenticacao-teste';
import {
  aguardarFilasOciosas,
  limparBanco,
  limparFilas,
} from '../apoio/limpeza-integracao';
import { criarPayloadCliente } from '../factories/cliente.factory';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { S3FalsoMemoria } from '../apoio/s3-falso-memoria';

describe('Integracao - Uploads e S3', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let s3Falso: S3FalsoMemoria;

  beforeAll(async () => {
    const contexto = await criarAplicacaoIntegracao();
    app = contexto.app;
    prisma = contexto.prisma;
    s3Falso = contexto.s3Falso;
  });

  afterAll(async () => {
    await encerrarAplicacaoIntegracao(app);
  });

  beforeEach(async () => {
    s3Falso.limpar();
    await limparFilas(app);
    await limparBanco(prisma);
  });

  afterEach(async () => {
    await aguardarFilasOciosas(app);
  });

  it('gera URL pre-assinada e confirma upload de arquivo do cliente', async () => {
    const { credenciais } = await criarPrimeiroMaster(app);
    const loginMaster = await autenticar(app, credenciais.email, credenciais.senha);

    const cliente = await request(app.getHttpServer())
      .post('/api/clientes')
      .set('Authorization', `Bearer ${loginMaster.access_token}`)
      .send(criarPayloadCliente())
      .expect(201);

    const presigned = await request(app.getHttpServer())
      .post('/api/uploads/url-pre-assinada')
      .set('Authorization', `Bearer ${loginMaster.access_token}`)
      .send({
        tipo_destino: 'arquivo_cliente',
        cliente_id: cliente.body.id,
        nome_arquivo: 'contrato-cliente.pdf',
        tipo_mime: 'application/pdf',
      })
      .expect(201);

    expect(presigned.body.chave).toContain(`clientes/${cliente.body.id}/arquivos/`);

    s3Falso.registrarUploadSimulado(
      presigned.body.chave,
      Buffer.from('conteudo-pdf-falso'),
      'application/pdf',
    );

    await request(app.getHttpServer())
      .post('/api/uploads/confirmacoes/arquivo-cliente')
      .set('Authorization', `Bearer ${loginMaster.access_token}`)
      .send({
        cliente_id: cliente.body.id,
        chave_s3: presigned.body.chave,
        nome_arquivo: 'contrato-cliente.pdf',
        tipo_mime: 'application/pdf',
        tamanho_bytes: 1024,
        rotulo: 'Contrato principal',
      })
      .expect(201);

    const clienteAtualizado = await request(app.getHttpServer())
      .get(`/api/clientes/${cliente.body.id}`)
      .set('Authorization', `Bearer ${loginMaster.access_token}`)
      .expect(200);

    expect(clienteAtualizado.body.arquivos).toHaveLength(1);
    expect(clienteAtualizado.body.arquivos[0].chave_s3).toBe(presigned.body.chave);
    expect(s3Falso.listarChaves()).toContain(presigned.body.chave);
  });
});
