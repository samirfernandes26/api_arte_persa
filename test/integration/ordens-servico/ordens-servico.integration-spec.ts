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
import { criarPayloadCliente } from '../factories/cliente.factory';
import { criarPayloadOrdemServico } from '../factories/ordem-servico.factory';
import { criarPayloadServico } from '../factories/servico.factory';
import { PerfilUsuario } from '../../../src/comum/enums/perfil-usuario.enum';
import { PrismaService } from '../../../src/prisma/prisma.service';

describe('Integracao - Ordens de Servico', () => {
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

  it('cria ordem completa, registra observacao e congela o preco do servico', async () => {
    const { credenciais } = await criarPrimeiroMaster(app);
    const loginMaster = await autenticar(app, credenciais.email, credenciais.senha);
    const funcionario = await criarUsuarioAutenticado(
      app,
      loginMaster.access_token,
      { perfil: PerfilUsuario.FUNCIONARIO },
    );
    const loginFuncionario = await autenticar(
      app,
      funcionario.credenciais.email,
      funcionario.credenciais.senha,
    );

    const servico = await request(app.getHttpServer())
      .post('/api/servicos')
      .set('Authorization', `Bearer ${loginMaster.access_token}`)
      .send(criarPayloadServico({ preco_base: 800 }))
      .expect(201);

    const cliente = await request(app.getHttpServer())
      .post('/api/clientes')
      .set('Authorization', `Bearer ${loginMaster.access_token}`)
      .send(criarPayloadCliente())
      .expect(201);

    const payloadOrdem = criarPayloadOrdemServico({
      clienteId: cliente.body.id,
      servicoCatalogoId: servico.body.id,
      responsavelId: funcionario.usuario.id,
      percentualDesconto: 5,
    });

    const ordem = await request(app.getHttpServer())
      .post('/api/ordens-servico')
      .set('Authorization', `Bearer ${loginFuncionario.access_token}`)
      .send(payloadOrdem)
      .expect(201);

    expect(ordem.body.id).toBeTruthy();
    expect(ordem.body.itens).toHaveLength(1);
    expect(ordem.body.itens[0].servicos_executados[0].valor_unitario_snapshot).toBe(
      '800',
    );
    expect(ordem.body.historico_status).toHaveLength(1);

    await request(app.getHttpServer())
      .post('/api/observacoes')
      .set('Authorization', `Bearer ${loginFuncionario.access_token}`)
      .send({
        tipo_alvo: 'ordem_servico',
        ordem_servico_id: ordem.body.id,
        visibilidade: 'interna',
        titulo: 'Observacao inicial',
        conteudo: 'Tapete recebido sem avarias aparentes.',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/servicos/${servico.body.id}`)
      .set('Authorization', `Bearer ${loginMaster.access_token}`)
      .send({ preco_base: 1200 })
      .expect(200);

    const ordemAtualizada = await request(app.getHttpServer())
      .get(`/api/ordens-servico/${ordem.body.id}`)
      .set('Authorization', `Bearer ${loginFuncionario.access_token}`)
      .expect(200);

    expect(ordemAtualizada.body.itens[0].servicos_executados[0].valor_unitario_snapshot).toBe(
      '800',
    );
    expect(ordemAtualizada.body.observacoes).toHaveLength(1);
  });

  it('bloqueia desconto acima do limite de funcionario sem aprovacao', async () => {
    const { credenciais } = await criarPrimeiroMaster(app);
    const loginMaster = await autenticar(app, credenciais.email, credenciais.senha);
    const funcionario = await criarUsuarioAutenticado(
      app,
      loginMaster.access_token,
      { perfil: PerfilUsuario.FUNCIONARIO },
    );
    const loginFuncionario = await autenticar(
      app,
      funcionario.credenciais.email,
      funcionario.credenciais.senha,
    );

    const servico = await request(app.getHttpServer())
      .post('/api/servicos')
      .set('Authorization', `Bearer ${loginMaster.access_token}`)
      .send(criarPayloadServico({ preco_base: 800 }))
      .expect(201);

    const cliente = await request(app.getHttpServer())
      .post('/api/clientes')
      .set('Authorization', `Bearer ${loginMaster.access_token}`)
      .send(criarPayloadCliente())
      .expect(201);

    const payloadOrdem = criarPayloadOrdemServico({
      clienteId: cliente.body.id,
      servicoCatalogoId: servico.body.id,
      responsavelId: funcionario.usuario.id,
      percentualDesconto: 15,
    });

    await request(app.getHttpServer())
      .post('/api/ordens-servico')
      .set('Authorization', `Bearer ${loginFuncionario.access_token}`)
      .send(payloadOrdem)
      .expect(403);
  });

  it('permite desconto com aprovacao de supervisor e registra historico de status', async () => {
    const { credenciais } = await criarPrimeiroMaster(app);
    const loginMaster = await autenticar(app, credenciais.email, credenciais.senha);
    const supervisor = await criarUsuarioAutenticado(
      app,
      loginMaster.access_token,
      { perfil: PerfilUsuario.SUPERVISOR },
    );
    const funcionario = await criarUsuarioAutenticado(
      app,
      loginMaster.access_token,
      { perfil: PerfilUsuario.FUNCIONARIO },
    );
    const loginFuncionario = await autenticar(
      app,
      funcionario.credenciais.email,
      funcionario.credenciais.senha,
    );

    const servico = await request(app.getHttpServer())
      .post('/api/servicos')
      .set('Authorization', `Bearer ${loginMaster.access_token}`)
      .send(criarPayloadServico({ preco_base: 800 }))
      .expect(201);

    const cliente = await request(app.getHttpServer())
      .post('/api/clientes')
      .set('Authorization', `Bearer ${loginMaster.access_token}`)
      .send(criarPayloadCliente())
      .expect(201);

    const payloadOrdem = criarPayloadOrdemServico({
      clienteId: cliente.body.id,
      servicoCatalogoId: servico.body.id,
      responsavelId: funcionario.usuario.id,
      aprovadoPorDescontoId: supervisor.usuario.id,
      percentualDesconto: 15,
    });

    const ordem = await request(app.getHttpServer())
      .post('/api/ordens-servico')
      .set('Authorization', `Bearer ${loginFuncionario.access_token}`)
      .send(payloadOrdem)
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/ordens-servico/${ordem.body.id}/status`)
      .set('Authorization', `Bearer ${loginFuncionario.access_token}`)
      .send({ status: 'aguardando_coleta', motivo: 'Coleta agendada.' })
      .expect(200);

    const respostaStatus = await request(app.getHttpServer())
      .patch(`/api/ordens-servico/${ordem.body.id}/status`)
      .set('Authorization', `Bearer ${loginFuncionario.access_token}`)
      .send({ status: 'coletada', motivo: 'Item coletado no cliente.' })
      .expect(200);

    expect(respostaStatus.body.percentual_desconto).toBe('15');
    expect(respostaStatus.body.historico_status.length).toBeGreaterThanOrEqual(3);
    expect(
      respostaStatus.body.historico_status.some(
        (registro: { status_destino: string }) =>
          registro.status_destino === 'coletada',
      ),
    ).toBe(true);
  });

  it('exige motivo ao atualizar uma ordem para aplicar desconto', async () => {
    const { credenciais } = await criarPrimeiroMaster(app);
    const loginMaster = await autenticar(app, credenciais.email, credenciais.senha);

    const servico = await request(app.getHttpServer())
      .post('/api/servicos')
      .set('Authorization', `Bearer ${loginMaster.access_token}`)
      .send(criarPayloadServico({ preco_base: 800 }))
      .expect(201);

    const cliente = await request(app.getHttpServer())
      .post('/api/clientes')
      .set('Authorization', `Bearer ${loginMaster.access_token}`)
      .send(criarPayloadCliente())
      .expect(201);

    const ordem = await request(app.getHttpServer())
      .post('/api/ordens-servico')
      .set('Authorization', `Bearer ${loginMaster.access_token}`)
      .send(
        criarPayloadOrdemServico({
          clienteId: cliente.body.id,
          servicoCatalogoId: servico.body.id,
          responsavelId: loginMaster.usuario.id,
          percentualDesconto: 0,
          motivoDesconto: '',
        }),
      )
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/ordens-servico/${ordem.body.id}`)
      .set('Authorization', `Bearer ${loginMaster.access_token}`)
      .send({
        percentual_desconto: 5,
      })
      .expect(400);
  });
});
