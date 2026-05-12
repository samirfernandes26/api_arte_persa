import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '.prisma/client';

@Injectable()
export class ServicoPrisma extends PrismaClient implements OnModuleInit {
  constructor() {
    const urlBancoDados = process.env.URL_BANCO_DADOS;

    if (!urlBancoDados) {
      throw new Error('A variavel URL_BANCO_DADOS nao foi configurada.');
    }

    const url = new URL(urlBancoDados);
    const adapter = new PrismaMariaDb({
      host: url.hostname,
      port: Number(url.port || '3306'),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ''),
    });

    super({
      adapter,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async habilitarHooksEncerramento(app: INestApplication): Promise<void> {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
