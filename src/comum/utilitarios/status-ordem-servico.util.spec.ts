import { BadRequestException } from '@nestjs/common';
import { StatusOrdemServico } from '../enums/status-ordem-servico.enum';
import { validarTransicaoStatusOrdemServico } from './status-ordem-servico.util';

describe('validarTransicaoStatusOrdemServico', () => {
  it('aceita transicao valida', () => {
    expect(() =>
      validarTransicaoStatusOrdemServico(
        StatusOrdemServico.ABERTA,
        StatusOrdemServico.AGUARDANDO_COLETA,
      ),
    ).not.toThrow();
  });

  it('rejeita transicao invalida', () => {
    expect(() =>
      validarTransicaoStatusOrdemServico(
        StatusOrdemServico.ABERTA,
        StatusOrdemServico.ENTREGUE,
      ),
    ).toThrow(BadRequestException);
  });
});
