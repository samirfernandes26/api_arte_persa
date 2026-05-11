import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class FiltroExcecaoGlobal implements ExceptionFilter {
  private readonly logger = new Logger(FiltroExcecaoGlobal.name);

  catch(excecao: unknown, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const resposta = contexto.getResponse<Response>();
    const requisicao = contexto.getRequest<Request>();

    const status =
      excecao instanceof HttpException
        ? excecao.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const respostaExcecao =
      excecao instanceof HttpException ? excecao.getResponse() : undefined;

    const mensagem = this.resolverMensagem(respostaExcecao, excecao);
    const erro = this.resolverErro(respostaExcecao, excecao, status);
    const detalhes = this.resolverDetalhes(respostaExcecao);

    if (status >= 500) {
      this.logger.error(
        `Falha nao tratada em ${requisicao.method} ${requisicao.url}: ${mensagem}`,
        excecao instanceof Error ? excecao.stack : undefined,
      );
    }

    resposta.status(status).json({
      statusCode: status,
      erro,
      error: erro,
      mensagem,
      message: mensagem,
      detalhes,
      caminho: requisicao.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolverMensagem(respostaExcecao: unknown, excecao: unknown): string | string[] {
    if (typeof respostaExcecao === 'string') {
      return respostaExcecao;
    }

    if (
      typeof respostaExcecao === 'object' &&
      respostaExcecao &&
      'message' in respostaExcecao
    ) {
      return (respostaExcecao as { message: string | string[] }).message;
    }

    if (excecao instanceof Error) {
      return excecao.message;
    }

    return 'Erro interno do servidor.';
  }

  private resolverErro(
    respostaExcecao: unknown,
    excecao: unknown,
    status: number,
  ): string {
    if (
      typeof respostaExcecao === 'object' &&
      respostaExcecao &&
      'error' in respostaExcecao
    ) {
      return String((respostaExcecao as { error: unknown }).error);
    }

    if (excecao instanceof HttpException) {
      return excecao.name;
    }

    return status === HttpStatus.INTERNAL_SERVER_ERROR
      ? 'InternalServerError'
      : 'Erro';
  }

  private resolverDetalhes(respostaExcecao: unknown): unknown {
    if (
      typeof respostaExcecao === 'object' &&
      respostaExcecao &&
      'message' in respostaExcecao
    ) {
      return respostaExcecao;
    }

    return undefined;
  }
}
