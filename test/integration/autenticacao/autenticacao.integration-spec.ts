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
import { ServicoPrisma } from '../../../src/prisma/prisma.service';

describe('Integracao - Autenticacao', () => {
  let app: NestExpressApplication;
  let prisma: ServicoPrisma;

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

  it('realiza o fluxo completo de login e token de atualizacao', async () => {
    const { credenciais } = await criarPrimeiroMaster(app);

    const login = await autenticar(app, credenciais.email, credenciais.senha);
    expect(login.token_acesso).toBeTruthy();
    expect(login.token_atualizacao).toBeTruthy();
    expect(login.usuario.email).toBe(credenciais.email);

    const refresh = await request(app.getHttpServer())
      .post('/api/autenticacao/renovar-token')
      .send({ token_atualizacao: login.token_atualizacao })
      .expect(201);

    expect(refresh.body.token_acesso).toBeTruthy();
    expect(refresh.body.token_atualizacao).toBeTruthy();
    expect(refresh.body.token_atualizacao).not.toBe(login.token_atualizacao);
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
      loginMaster.token_acesso,
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
      .set('Authorization', `Bearer ${loginFuncionario.token_acesso}`)
      .expect(403);
  });
});
