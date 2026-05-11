import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { createBullBoard } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NextFunction, Request, Response } from 'express';
import { PayloadToken } from '../comum/interfaces/payload-token.interface';
import { FilasService } from './filas.service';

const logger = new Logger('PainelFilas');

const criarMiddlewareAutenticacaoPainel =
  (configService: ConfigService, jwtService: JwtService) =>
  async (requisicao: Request, resposta: Response, proximo: NextFunction) => {
    const autorizacao = requisicao.headers.authorization;

    if (!autorizacao?.startsWith('Bearer ')) {
      resposta.status(401).json({ mensagem: 'Bearer token obrigatorio.' });
      return;
    }

    const token = autorizacao.slice('Bearer '.length);
    const perfisPermitidos = configService
      .get<string>('PERFIS_BULL_BOARD', 'supervisor,master')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      const payload = await jwtService.verifyAsync<PayloadToken>(token, {
        secret: configService.getOrThrow<string>('JWT_SEGREDO_ACESSO'),
        issuer: configService.get<string>('JWT_EMISSOR') || undefined,
        audience: configService.get<string>('JWT_AUDIENCIA') || undefined,
      });

      if (payload.tipo !== 'acesso' || !perfisPermitidos.includes(payload.perfil)) {
        resposta.status(403).json({ mensagem: 'Acesso negado ao Bull Board.' });
        return;
      }

      proximo();
    } catch (erro) {
      logger.warn(
        `Falha na autenticacao do Bull Board: ${
          erro instanceof Error ? erro.message : 'erro desconhecido'
        }`,
      );
      resposta.status(401).json({ mensagem: 'Token invalido.' });
    }
  };

export const configurarPainelFilas = (
  app: NestExpressApplication,
  jwtService?: JwtService,
): void => {
  const configService = app.get(ConfigService);
  const filasService = app.get(FilasService);
  const jwtServiceInterno = jwtService ?? app.get(JwtService);
  const caminhoPainel = configService.get<string>(
    'CAMINHO_BULL_BOARD',
    '/admin/filas',
  );
  const adaptadorServidor = new ExpressAdapter();

  adaptadorServidor.setBasePath(caminhoPainel);

  createBullBoard({
    queues: filasService
      .obterAdaptadoresBullBoard()
      .map((fila) => fila as BullMQAdapter),
    serverAdapter: adaptadorServidor,
  });

  app.use(
    caminhoPainel,
    criarMiddlewareAutenticacaoPainel(configService, jwtServiceInterno!),
    adaptadorServidor.getRouter(),
  );
};
