export async function esperar(milisegundos: number) {
  await new Promise((resolve) => setTimeout(resolve, milisegundos));
}

export async function esperarAte<T>(
  buscar: () => Promise<T>,
  validar: (valor: T) => boolean,
  opcoes?: { timeoutMs?: number; intervaloMs?: number; mensagemErro?: string },
): Promise<T> {
  const timeoutMs = opcoes?.timeoutMs ?? 5000;
  const intervaloMs = opcoes?.intervaloMs ?? 100;
  const limite = Date.now() + timeoutMs;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const valor = await buscar();
    if (validar(valor)) {
      return valor;
    }

    if (Date.now() >= limite) {
      throw new Error(
        opcoes?.mensagemErro ??
          'Tempo limite excedido aguardando a condicao esperada.',
      );
    }

    await esperar(intervaloMs);
  }
}
