import { Request } from 'express';
import { PayloadAutenticacao } from './payload-token.interface';

export interface RequisicaoAutenticada extends Request {
  usuario?: PayloadAutenticacao;
}
