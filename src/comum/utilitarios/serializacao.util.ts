import { ClassConstructor, plainToInstance } from 'class-transformer';

const normalizarValorSerializavel = <T>(dados: T): T =>
  JSON.parse(JSON.stringify(dados)) as T;

export const serializarDto = <T, V>(classe: ClassConstructor<T>, dados: V): T =>
  plainToInstance(classe, normalizarValorSerializavel(dados) as object, {
    excludeExtraneousValues: true,
  });

export const serializarListaDto = <T, V>(
  classe: ClassConstructor<T>,
  dados: V[],
): T[] =>
  plainToInstance(classe, normalizarValorSerializavel(dados) as object[], {
    excludeExtraneousValues: true,
  });
