import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.URL_BANCO_DADOS,
    shadowDatabaseUrl: process.env.URL_BANCO_DADOS_SOMBRA,
  },
});
