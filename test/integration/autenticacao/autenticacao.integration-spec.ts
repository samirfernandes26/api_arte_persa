import request from 'supertest';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  criarAplicacaoIntegracao,
  encerrarAplicacaoIntegracao,
} from '../apoio/aplicacao-integracao';
import {
  autenticar,
  criarPrimeiroMaster,
  criarUsuarioAutenticado,
} from '../apoio/autenticacao-teste';
import {
  aguardarFilasOciosas,
  limparBanco,
  limparFilas,
} from '../apoio/limpeza-integracao';
import { PerfilUsuario } from '../../../src/comum/enums/perfil-usuario.enum';
import { PrismaService } from '../../../src/prisma/prisma.service';

describe('Integracao - Autenticacao', () => {
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

  it('realiza o fluxo completo de login e refresh token', async () => {
    const { credenciais } = await criarPrimeiroMaster(app);

    const login = await autenticar(app, credenciais.email, credenciais.senha);
    expect(login.access_token).toBeTruthy();
    expect(login.refresh_token).toBeTruthy();
    expect(login.usuario.email).toBe(credenciais.email);

    const refresh = await request(app.getHttpServer())
      .post('/api/autenticacao/refresh')
      .send({ refresh_token: login.refresh_token })
      .expect(201);

    expect(refresh.body.access_token).toBeTruthy();
    expect(refresh.body.refresh_token).toBeTruthy();
    expect(refresh.body.refresh_token).not.toBe(login.refresh_token);
  });

  it('nao expone senha_hash na resposta de criacao do primeiro master', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/api/usuarios/primeiro-master')
      .send({
        nome: 'Master Inicial',
        email: 'master.inicial@empresa.com.br',
        senha: 'SenhaSegura@123',
        perfil: 'master',
      })
      .expect(201);

    expect(resposta.body.id).toBeTruthy();
    expect(resposta.body.email).toBe('master.inicial@empresa.com.br');
    expect(resposta.body.senha_hash).toBeUndefined();
  });

  it('retorna 401 ao acessar rota protegida sem token', async () => {
    await request(app.getHttpServer()).get('/api/autenticacao/eu').expect(401);
  });

  it('retorna 403 quando um funcionario tenta acessar rota restrita a supervisor/master', async () => {
    const { credenciais } = await criarPrimeiroMaster(app);
    const loginMaster = await autenticar(app, credenciais.email, credenciais.senha);

    const funcionario = await criarUsuarioAutenticado(
      app,
      loginMaster.access_token,
      {
        perfil: PerfilUsuario.FUNCIONARIO,
      },
    );

    const loginFuncionario = await autenticar(
      app,
      funcionario.credenciais.email,
      funcionario.credenciais.senha,
    );

    await request(app.getHttpServer())
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${loginFuncionario.access_token}`)
      .expect(403);
  });
});
