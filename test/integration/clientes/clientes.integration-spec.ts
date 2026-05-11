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

describe('Integracao - Clientes', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const contexto = await criarAplicacaoIntegracao();
    app = contexto.app;
    prisma = contexto.prisma;
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

  it('cria cliente com contatos e enderecos aninhados', async () => {
    const { credenciais } = await criarPrimeiroMaster(app);
    const login = await autenticar(app, credenciais.email, credenciais.senha);

    const payload = criarPayloadCliente();
    const resposta = await request(app.getHttpServer())
      .post('/api/clientes')
      .set('Authorization', `Bearer ${login.access_token}`)
      .send(payload)
      .expect(201);

    expect(resposta.body.id).toBeTruthy();
    expect(resposta.body.contatos).toHaveLength(2);
    expect(resposta.body.enderecos).toHaveLength(2);
    expect(resposta.body.nome_razao_social).toBe(payload.nome_razao_social);
  });

  it('aplica validacao aninhada e rejeita endereco invalido', async () => {
    const { credenciais } = await criarPrimeiroMaster(app);
    const login = await autenticar(app, credenciais.email, credenciais.senha);

    const payload = criarPayloadCliente({
      enderecos: [
        {
          tipo_endereco: 'coleta',
          logradouro: 'Rua Invalida',
          numero: '1',
          cidade: 'Sao Paulo',
          estado: 'SPS',
          principal: true,
        },
      ],
    });

    const resposta = await request(app.getHttpServer())
      .post('/api/clientes')
      .set('Authorization', `Bearer ${login.access_token}`)
      .send(payload)
      .expect(400);

    expect(JSON.stringify(resposta.body.message)).toContain('estado');
  });

  it('lista e busca clientes por termo', async () => {
    const { credenciais } = await criarPrimeiroMaster(app);
    const login = await autenticar(app, credenciais.email, credenciais.senha);

    await request(app.getHttpServer())
      .post('/api/clientes')
      .set('Authorization', `Bearer ${login.access_token}`)
      .send(criarPayloadCliente({ nome_razao_social: 'Cliente Alfa Persianas' }))
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/clientes')
      .set('Authorization', `Bearer ${login.access_token}`)
      .send(criarPayloadCliente({ nome_razao_social: 'Cliente Beta Sofas' }))
      .expect(201);

    const resposta = await request(app.getHttpServer())
      .get('/api/clientes?busca=Alfa')
      .set('Authorization', `Bearer ${login.access_token}`)
      .expect(200);

    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].nome_razao_social).toContain('Alfa');
  });
});
