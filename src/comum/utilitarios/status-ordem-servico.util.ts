import { BadRequestException } from '@nestjs/common';
import { StatusOrdemServico } from '../enums/status-ordem-servico.enum';

const mapaTransicoes: Record<StatusOrdemServico, StatusOrdemServico[]> = {
  [StatusOrdemServico.ABERTA]: [
    StatusOrdemServico.AGUARDANDO_COLETA,
    StatusOrdemServico.CANCELADA,
  ],
  [StatusOrdemServico.AGUARDANDO_COLETA]: [
    StatusOrdemServico.COLETADA,
    StatusOrdemServico.CANCELADA,
  ],
  [StatusOrdemServico.COLETADA]: [
    StatusOrdemServico.EM_HIGIENIZACAO,
    StatusOrdemServico.CANCELADA,
  ],
  [StatusOrdemServico.EM_HIGIENIZACAO]: [
    StatusOrdemServico.EM_MANUTENCAO,
    StatusOrdemServico.CONTROLE_QUALIDADE,
    StatusOrdemServico.CANCELADA,
  ],
  [StatusOrdemServico.EM_MANUTENCAO]: [
    StatusOrdemServico.CONTROLE_QUALIDADE,
    StatusOrdemServico.CANCELADA,
  ],
  [StatusOrdemServico.CONTROLE_QUALIDADE]: [
    StatusOrdemServico.PRONTA_PARA_ENTREGA,
    StatusOrdemServico.EM_MANUTENCAO,
    StatusOrdemServico.CANCELADA,
  ],
  [StatusOrdemServico.PRONTA_PARA_ENTREGA]: [
    StatusOrdemServico.ENTREGUE,
    StatusOrdemServico.CANCELADA,
  ],
  [StatusOrdemServico.ENTREGUE]: [],
  [StatusOrdemServico.CANCELADA]: [],
};

export const validarTransicaoStatusOrdemServico = (
  statusAtual: StatusOrdemServico,
  proximoStatus: StatusOrdemServico,
): void => {
  if (statusAtual === proximoStatus) {
    return;
  }

  const permitidos = mapaTransicoes[statusAtual];
  if (!permitidos.includes(proximoStatus)) {
    throw new BadRequestException(
      `Transicao de status invalida: ${statusAtual} -> ${proximoStatus}.`,
    );
  }
};
