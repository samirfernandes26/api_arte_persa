import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import {
  caminhoEstadoInfraestrutura,
  lerEstadoInfraestrutura,
} from './ambiente-integracao';

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function encerrarInfraestruturaGlobal() {
  if (!existsSync(caminhoEstadoInfraestrutura)) {
    return;
  }

  const estado = lerEstadoInfraestrutura();
  await esperar(1000);

  if (estado.modo === 'testcontainers') {
    execSync(`docker rm -f ${estado.mysql.id} ${estado.redis.id}`, {
      stdio: 'ignore',
    });
  }

  rmSync(caminhoEstadoInfraestrutura, { force: true });
}
