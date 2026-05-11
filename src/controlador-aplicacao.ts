import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Publico } from './comum/decoradores/publico.decorator';

@Controller('saude')
export class ControladorAplicacao {
  constructor(private readonly configService: ConfigService) {}

  @Publico()
  @Get()
  obterSaude() {
    return {
      status: 'ok',
      aplicacao: this.configService.get<string>('NOME_APLICACAO'),
      data_hora: new Date().toISOString(),
    };
  }
}
