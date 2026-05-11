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
  if (process.env.INTEGRACAO_USAR_SERVICOS_EXTERNOS === 'true') {
    const estado = obterEstadoServicosExternos();

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

    return;
  }

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
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  const redis = await new GenericContainer('redis:latest')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  const estado: EstadoInfraestruturaIntegracao = {
    modo: 'testcontainers',
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

function obterEstadoServicosExternos(): EstadoInfraestruturaIntegracao {
  return {
    modo: 'servicos_externos',
    mysql: {
      id: 'externo:mysql',
      host: process.env.INTEGRACAO_MYSQL_HOST || '127.0.0.1',
      porta: Number(process.env.INTEGRACAO_MYSQL_PORTA || 3306),
      usuario: process.env.INTEGRACAO_MYSQL_USUARIO || 'teste',
      senha: process.env.INTEGRACAO_MYSQL_SENHA || 'teste_123',
      banco: process.env.INTEGRACAO_MYSQL_BANCO || 'ordens_servico_teste',
      senhaRoot:
        process.env.INTEGRACAO_MYSQL_SENHA_ROOT ||
        process.env.INTEGRACAO_MYSQL_SENHA ||
        'root_teste_123',
    },
    redis: {
      id: 'externo:redis',
      host: process.env.INTEGRACAO_REDIS_HOST || '127.0.0.1',
      porta: Number(process.env.INTEGRACAO_REDIS_PORTA || 6379),
    },
  };
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
