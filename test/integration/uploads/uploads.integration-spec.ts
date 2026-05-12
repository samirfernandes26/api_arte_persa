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
import { criarPayloadOrdemServico } from '../factories/ordem-servico.factory';
import { criarPayloadServico } from '../factories/servico.factory';
import { ServicoPrisma } from '../../../src/prisma/prisma.service';
import { S3FalsoMemoria } from '../apoio/s3-falso-memoria';

describe('Integracao - Uploads e S3', () => {
  let app: NestExpressApplication;
  let prisma: ServicoPrisma;
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
      .set('Authorization', `Bearer ${loginMaster.token_acesso}`)
      .send(criarPayloadCliente())
      .expect(201);

    const presigned = await request(app.getHttpServer())
      .post('/api/uploads/url-pre-assinada')
      .set('Authorization', `Bearer ${loginMaster.token_acesso}`)
      .send({
        tipo_destino: 'arquivo_cliente',
        cliente_id: cliente.body.id,
        nome_arquivo: 'contrato-cliente.pdf',
        tipo_mime: 'application/pdf',
      })
      .expect(201);

    expect(presigned.body.chave).toContain(`clientes/${cliente.body.id}/arquivos/`);
    const intencaoCriada = await prisma.intencaoUpload.findUnique({
      where: { chave_s3: presigned.body.chave },
    });
    expect(intencaoCriada).toBeTruthy();
    expect(intencaoCriada?.confirmado_em).toBeNull();
    expect(presigned.body.cabecalhos['x-amz-server-side-encryption']).toBe('aws:kms');
    expect(
      presigned.body.cabecalhos['x-amz-server-side-encryption-aws-kms-key-id'],
    ).toContain('arn:aws:kms:us-east-1:123456789012:key/teste-integracao');

    s3Falso.registrarUploadSimulado(
      presigned.body.chave,
      Buffer.from('conteudo-pdf-falso'),
      'application/pdf',
    );

    await request(app.getHttpServer())
      .post('/api/uploads/confirmacoes/arquivo-cliente')
      .set('Authorization', `Bearer ${loginMaster.token_acesso}`)
      .send({
        cliente_id: cliente.body.id,
        chave_s3: presigned.body.chave,
        nome_arquivo: 'contrato-cliente.pdf',
        tipo_mime: 'application/pdf',
        tamanho_bytes: 18,
        rotulo: 'Contrato principal',
      })
      .expect(201);

    const clienteAtualizado = await request(app.getHttpServer())
      .get(`/api/clientes/${cliente.body.id}`)
      .set('Authorization', `Bearer ${loginMaster.token_acesso}`)
      .expect(200);

    expect(clienteAtualizado.body.arquivos).toHaveLength(1);
    expect(clienteAtualizado.body.arquivos[0].chave_s3).toBe(presigned.body.chave);
    expect(s3Falso.listarChaves()).toContain(presigned.body.chave);

    const intencaoConfirmada = await prisma.intencaoUpload.findUnique({
      where: { chave_s3: presigned.body.chave },
    });
    expect(intencaoConfirmada?.confirmado_em).toBeTruthy();
  });

  it('rejeita confirmacao de upload quando a chave nao pertence ao prefixo do cliente', async () => {
    const { credenciais } = await criarPrimeiroMaster(app);
    const loginMaster = await autenticar(app, credenciais.email, credenciais.senha);

    const cliente = await request(app.getHttpServer())
      .post('/api/clientes')
      .set('Authorization', `Bearer ${loginMaster.token_acesso}`)
      .send(criarPayloadCliente())
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/uploads/confirmacoes/arquivo-cliente')
      .set('Authorization', `Bearer ${loginMaster.token_acesso}`)
      .send({
        cliente_id: cliente.body.id,
        chave_s3: 'clientes/00000000-0000-0000-0000-000000000000/arquivos/falso.pdf',
        nome_arquivo: 'falso.pdf',
        tipo_mime: 'application/pdf',
        tamanho_bytes: 1024,
        rotulo: 'Arquivo invalido',
      })
      .expect(400);
  });

  it('rejeita confirmacao quando o objeto ainda nao existe no S3', async () => {
    const { credenciais } = await criarPrimeiroMaster(app);
    const loginMaster = await autenticar(app, credenciais.email, credenciais.senha);

    const cliente = await request(app.getHttpServer())
      .post('/api/clientes')
      .set('Authorization', `Bearer ${loginMaster.token_acesso}`)
      .send(criarPayloadCliente())
      .expect(201);

    const presigned = await request(app.getHttpServer())
      .post('/api/uploads/url-pre-assinada')
      .set('Authorization', `Bearer ${loginMaster.token_acesso}`)
      .send({
        tipo_destino: 'arquivo_cliente',
        cliente_id: cliente.body.id,
        nome_arquivo: 'laudo.pdf',
        tipo_mime: 'application/pdf',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/uploads/confirmacoes/arquivo-cliente')
      .set('Authorization', `Bearer ${loginMaster.token_acesso}`)
      .send({
        cliente_id: cliente.body.id,
        chave_s3: presigned.body.chave,
        nome_arquivo: 'laudo.pdf',
        tipo_mime: 'application/pdf',
        tamanho_bytes: 512,
        rotulo: 'Laudo',
      })
      .expect(400);
  });

  it('vincula foto inicial do item somente pelo fluxo oficial de upload', async () => {
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
        }),
      )
      .expect(201);

    const item = ordem.body.itens[0];
    const presigned = await request(app.getHttpServer())
      .post('/api/uploads/url-pre-assinada')
      .set('Authorization', `Bearer ${loginMaster.token_acesso}`)
      .send({
        tipo_destino: 'foto_inicial_item',
        ordem_servico_id: ordem.body.id,
        item_ordem_servico_id: item.id,
        nome_arquivo: 'foto-inicial-item.jpg',
        tipo_mime: 'image/jpeg',
      })
      .expect(201);

    s3Falso.registrarUploadSimulado(
      presigned.body.chave,
      Buffer.from('foto-inicial-falsa'),
      'image/jpeg',
    );

    const itemAtualizado = await request(app.getHttpServer())
      .patch(`/api/itens/${item.id}`)
      .set('Authorization', `Bearer ${loginMaster.token_acesso}`)
      .send({
        chave_foto_inicial: presigned.body.chave,
      })
      .expect(200);

    expect(itemAtualizado.body.chave_foto_inicial).toBe(presigned.body.chave);
    expect(itemAtualizado.body.url_foto_inicial).toContain(presigned.body.chave);
  });

  it('cria observacao com imagem validada por intencao de upload', async () => {
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
        }),
      )
      .expect(201);

    const presigned = await request(app.getHttpServer())
      .post('/api/uploads/url-pre-assinada')
      .set('Authorization', `Bearer ${loginMaster.token_acesso}`)
      .send({
        tipo_destino: 'imagem_observacao',
        ordem_servico_id: ordem.body.id,
        nome_arquivo: 'observacao-item.jpg',
        tipo_mime: 'image/jpeg',
      })
      .expect(201);

    s3Falso.registrarUploadSimulado(
      presigned.body.chave,
      Buffer.from('imagem-observacao-falsa'),
      'image/jpeg',
    );

    const observacao = await request(app.getHttpServer())
      .post('/api/observacoes')
      .set('Authorization', `Bearer ${loginMaster.token_acesso}`)
      .send({
        tipo_alvo: 'ordem_servico',
        ordem_servico_id: ordem.body.id,
        visibilidade: 'interna',
        conteudo: 'Imagem vinculada pelo fluxo oficial.',
        imagens: [
          {
            chave_s3: presigned.body.chave,
            nome_arquivo: 'observacao-item.jpg',
            tipo_mime: 'image/jpeg',
            tamanho_bytes: 23,
            posicao: 0,
          },
        ],
      })
      .expect(201);

    expect(observacao.body.imagens).toHaveLength(1);
    expect(observacao.body.imagens[0].chave_s3).toBe(presigned.body.chave);
    expect(observacao.body.imagens[0].url_arquivo).toContain(presigned.body.chave);
  });
});
