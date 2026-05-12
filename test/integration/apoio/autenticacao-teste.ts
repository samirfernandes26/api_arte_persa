import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  criarPayloadPrimeiroMaster,
  criarPayloadUsuario,
  CriarPayloadUsuarioSaida,
} from '../factories/usuario.factory';

export async function criarPrimeiroMaster(app: INestApplication) {
  const payload = criarPayloadPrimeiroMaster();
  const resposta = await request(app.getHttpServer())
    .post('/api/usuarios/primeiro-master')
    .send(payload)
    .expect(201);

  return {
    usuario: resposta.body,
    credenciais: payload,
  };
}

export async function autenticar(
  app: INestApplication,
  email: string,
  senha: string,
) {
  const resposta = await request(app.getHttpServer())
    .post('/api/autenticacao/entrar')
    .send({ email, senha })
    .expect(201);

  return resposta.body as {
    token_acesso: string;
    token_atualizacao: string;
    usuario: { id: string; email: string; perfil: string };
  };
}

export async function criarUsuarioAutenticado(
  app: INestApplication,
  tokenMaster: string,
  parcial?: Partial<CriarPayloadUsuarioSaida>,
) {
  const payload = criarPayloadUsuario(parcial);
  const resposta = await request(app.getHttpServer())
    .post('/api/usuarios')
    .set('Authorization', `Bearer ${tokenMaster}`)
    .send(payload)
    .expect(201);

  return {
    usuario: resposta.body as { id: string; email: string; perfil: string },
    credenciais: payload,
  };
}
