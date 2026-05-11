import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AutenticacaoModule } from './autenticacao/autenticacao.module';
import { ClientesModule } from './clientes/clientes.module';
import { GuardaAutenticacaoJwt } from './comum/guardas/guarda-autenticacao-jwt';
import { GuardaPerfis } from './comum/guardas/guarda-perfis';
import { validarAmbiente } from './configuracao/esquema-ambiente';
import { FaturasModule } from './faturas/faturas.module';
import { FilasModule } from './filas/filas.module';
import { ItensModule } from './itens/itens.module';
import { ObservacoesModule } from './observacoes/observacoes.module';
import { OrdensServicoModule } from './ordens-servico/ordens-servico.module';
import { PrismaModule } from './prisma/prisma.module';
import { S3Module } from './s3/s3.module';
import { ServicosModule } from './servicos/servicos.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ControladorAplicacao } from './controlador-aplicacao';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: validarAmbiente,
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SEGREDO_ACESSO'),
        signOptions: {
          issuer: configService.get<string>('JWT_EMISSOR'),
          audience: configService.get<string>('JWT_AUDIENCIA'),
        },
      }),
    }),
    PrismaModule,
    S3Module,
    FilasModule,
    AutenticacaoModule,
    UsuariosModule,
    ClientesModule,
    ServicosModule,
    ItensModule,
    OrdensServicoModule,
    ObservacoesModule,
    FaturasModule,
    UploadsModule,
  ],
  controllers: [ControladorAplicacao],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GuardaAutenticacaoJwt,
    },
    {
      provide: APP_GUARD,
      useClass: GuardaPerfis,
    },
  ],
})
export class ModuloAplicacao {}
