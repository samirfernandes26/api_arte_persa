import {
  lerEstadoInfraestrutura,
  montarVariaveisAmbienteIntegracao,
} from './ambiente-integracao';

const CHAVE_GUARDA_BULLMQ = '__guarda_erro_bullmq_teste__';

const estado = lerEstadoInfraestrutura();
const variaveis = montarVariaveisAmbienteIntegracao(estado);

for (const [chave, valor] of Object.entries(variaveis)) {
  process.env[chave] = valor;
}

function deveIgnorarErroBullMq(erro: unknown) {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  return mensagem.includes('Connection is closed');
}

if (!(globalThis as Record<string, unknown>)[CHAVE_GUARDA_BULLMQ]) {
  process.on('uncaughtException', (erro) => {
    if (deveIgnorarErroBullMq(erro)) {
      return;
    }

    throw erro;
  });

  process.on('unhandledRejection', (erro) => {
    if (deveIgnorarErroBullMq(erro)) {
      return;
    }

    throw erro;
  });

  (globalThis as Record<string, unknown>)[CHAVE_GUARDA_BULLMQ] = true;
}
