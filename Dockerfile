FROM node:22-bookworm-slim AS base

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma

RUN npm ci

FROM base AS desenvolvimento

ENV NODE_ENV=development

COPY nest-cli.json tsconfig*.json ./
COPY src ./src
COPY test ./test

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

FROM base AS compilacao

COPY nest-cli.json tsconfig*.json ./
COPY src ./src
COPY test ./test

RUN npm run build

FROM node:22-bookworm-slim AS producao

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma

RUN npm ci --omit=dev \
  && npm run prisma:generate

COPY --from=compilacao /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
