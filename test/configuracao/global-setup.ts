import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import mariadb from 'mariadb';
import { GenericContainer, Wait } from 'testcontainers';
import {
  caminhoEstadoInfraestrutura,
  EstadoInfraestruturaIntegracao,
  montarVariaveisAmbienteIntegracao,
} from './ambiente-integracao';

export default async function configurarInfraestruturaGlobal() {
  process.env.TESTCONTAINERS_RYUK_DISABLED = 'true';
  process.env.TESTCONTAINERS_CHECKS_DISABLE = 'true';

  const senhaRoot = 'root_teste_123';
  const usuario = 'teste';
  const senha = 'teste_123';
  const banco = 'ordens_servico_teste';

  const mysql = await new GenericContainer('mysql:8.0')
    .withEnvironment({
      MYSQL_ROOT_PASSWORD: senhaRoot,
      MYSQL_DATABASE: banco,
      MYSQL_USER: usuario,
      MYSQL_PASSWORD: senha,
    })
    .withCommand(['--default-authentication-plugin=mysql_native_password'])
    .withExposedPorts(3306)
    .withWaitStrategy(Wait.forLogMessage(/ready for connections/i))
    .start();

  const redis = await new GenericContainer('redis:latest')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/i))
    .start();

  const estado: EstadoInfraestruturaIntegracao = {
    mysql: {
      id: mysql.getId(),
      host: mysql.getHost(),
      porta: mysql.getMappedPort(3306),
      usuario,
      senha,
      banco,
      senhaRoot,
    },
    redis: {
      id: redis.getId(),
      host: redis.getHost(),
      porta: redis.getMappedPort(6379),
    },
  };

  mkdirSync(dirname(caminhoEstadoInfraestrutura), { recursive: true });
  writeFileSync(
    caminhoEstadoInfraestrutura,
    JSON.stringify(estado, null, 2),
    'utf-8',
  );

  await aguardarMysqlDisponivel(estado);

  execSync('npx prisma db push --accept-data-loss', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      ...montarVariaveisAmbienteIntegracao(estado),
    },
  });
}

async function aguardarMysqlDisponivel(
  estado: EstadoInfraestruturaIntegracao,
): Promise<void> {
  const limite = Date.now() + 30000;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const conexao = await mariadb.createConnection({
        host: estado.mysql.host,
        port: estado.mysql.porta,
        user: estado.mysql.usuario,
        password: estado.mysql.senha,
        database: estado.mysql.banco,
        allowPublicKeyRetrieval: true,
      });

      await conexao.query('SELECT 1');
      await conexao.end();
      return;
    } catch (erro) {
      if (Date.now() >= limite) {
        throw erro;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
