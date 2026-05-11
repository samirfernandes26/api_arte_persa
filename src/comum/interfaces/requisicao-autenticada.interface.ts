import { Request } from 'express';
import { PayloadToken } from './payload-token.interface';

export interface RequisicaoAutenticada extends Request {
  usuario?: PayloadToken;
}
