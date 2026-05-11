import { randomUUID } from 'crypto';

export const gerarCodigoExterno = (
  prefixo: string,
  dataReferencia = new Date(),
): string => {
  const ano = dataReferencia.getFullYear();
  const mes = String(dataReferencia.getMonth() + 1).padStart(2, '0');
  const trechoAleatorio = randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();

  return `${prefixo}-${ano}${mes}-${trechoAleatorio}`;
};
