import { Prisma } from '@prisma/client';

const ZERO = new Prisma.Decimal(0);

export const paraDecimal = (
  valor?: Prisma.Decimal | string | number | null,
): Prisma.Decimal => {
  if (valor instanceof Prisma.Decimal) {
    return valor;
  }

  if (valor === null || valor === undefined) {
    return ZERO;
  }

  return new Prisma.Decimal(valor);
};

export const arredondarMoeda = (
  valor: Prisma.Decimal | string | number,
): Prisma.Decimal => new Prisma.Decimal(paraDecimal(valor).toFixed(2));

export const somarDecimais = (
  valores: Iterable<Prisma.Decimal | string | number | null | undefined>,
): Prisma.Decimal => {
  let total = ZERO;

  for (const valor of valores) {
    total = total.plus(paraDecimal(valor));
  }

  return arredondarMoeda(total);
};

export const dividirMoeda = (
  valor: Prisma.Decimal | string | number,
  divisor: Prisma.Decimal | string | number,
): Prisma.Decimal => {
  const divisorDecimal = paraDecimal(divisor);

  if (divisorDecimal.equals(ZERO)) {
    throw new Error('Nao e possivel dividir por zero.');
  }

  return arredondarMoeda(paraDecimal(valor).div(divisorDecimal));
};
