import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ControladorAplicacao } from '../../src/controlador-aplicacao';

describe('E2E - Saude da aplicacao', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              NOME_APLICACAO: 'api-ordens-servico-teste',
            }),
          ],
        }),
      ],
      controllers: [ControladorAplicacao],
    }).compile();

    app = modulo.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('responde com status ok no endpoint de saude', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/api/saude')
      .expect(200);

    expect(resposta.body.status).toBe('ok');
    expect(resposta.body.aplicacao).toBe('api-ordens-servico-teste');
  });
});
