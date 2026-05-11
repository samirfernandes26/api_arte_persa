import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusFatura as StatusFaturaPrisma } from '@prisma/client';
import { FilasService } from '../filas/filas.service';
import { PrismaService } from '../prisma/prisma.service';
import { PayloadToken } from '../comum/interfaces/payload-token.interface';
import { StatusFatura } from '../comum/enums/status-fatura.enum';
import { AtualizarStatusFaturaDto } from './dto/atualizar-status-fatura.dto';
import { ConsultarFaturasDto } from './dto/consultar-faturas.dto';
import { CriarFaturaDto } from './dto/criar-fatura.dto';

@Injectable()
export class FaturasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filasService: FilasService,
  ) {}

  async criar(dto: CriarFaturaDto, usuarioAtual: PayloadToken) {
    const ordem = await this.prisma.ordemServico.findUnique({
      where: { id: dto.ordem_servico_id },
      include: {
        cliente: true,
        fatura: true,
      },
    });

    if (!ordem || !ordem.ativo || ordem.data_exclusao) {
      throw new NotFoundException('Ordem de servico nao encontrada.');
    }

    if (ordem.fatura) {
      throw new ConflictException('Esta ordem de servico ja possui uma fatura.');
    }

    const numero = dto.numero ?? (await this.gerarNumeroFatura());
    const valorSubtotal = dto.valor_subtotal ?? Number(ordem.valor_subtotal);
    const valorDesconto = dto.valor_desconto ?? Number(ordem.valor_desconto);
    const valorImpostos = dto.valor_impostos ?? 0;
    const valorTotal =
      dto.valor_total ?? valorSubtotal - valorDesconto + valorImpostos;

    if (valorTotal < 0) {
      throw new BadRequestException('O valor total da fatura nao pode ser negativo.');
    }

    const fatura = await this.prisma.fatura.create({
      data: {
        ordem_servico_id: dto.ordem_servico_id,
        numero,
        criado_por_id: usuarioAtual.sub,
        atualizado_por_id: usuarioAtual.sub,
        vencimento_em: dto.vencimento_em ? new Date(dto.vencimento_em) : undefined,
        metodo_pagamento: dto.metodo_pagamento,
        valor_subtotal: valorSubtotal,
        valor_desconto: valorDesconto,
        valor_impostos: valorImpostos,
        valor_total: valorTotal,
        observacoes: dto.observacoes,
      },
      include: this.includeCompleto(),
    });

    await this.filasService.adicionarTarefaNotificacao({
      canal: 'email',
      tipo: 'fatura_criada',
      destinatario: ordem.cliente.email_principal ?? numero,
      assunto: `Fatura ${numero} criada`,
      mensagem: `A fatura da ordem ${ordem.codigo} foi criada.`,
      metadados: {
        fatura_id: fatura.id,
        ordem_servico_id: ordem.id,
      },
    });

    return fatura;
  }

  async listar(consulta: ConsultarFaturasDto) {
    const pagina = consulta.pagina ?? 1;
    const limite = consulta.limite ?? 20;

    return this.prisma.fatura.findMany({
      where: {
        ativo: true,
        data_exclusao: null,
        status: consulta.status as StatusFaturaPrisma | undefined,
        ordem_servico_id: consulta.ordem_servico_id,
        OR: consulta.busca
          ? [
              { numero: { contains: consulta.busca } },
              { ordem_servico: { codigo: { contains: consulta.busca } } },
              {
                ordem_servico: {
                  cliente: { nome_razao_social: { contains: consulta.busca } },
                },
              },
            ]
          : undefined,
      },
      include: this.includeCompleto(),
      orderBy: { data_criacao: 'desc' },
      skip: (pagina - 1) * limite,
      take: limite,
    });
  }

  async buscarPorId(id: string) {
    const fatura = await this.prisma.fatura.findUnique({
      where: { id },
      include: this.includeCompleto(),
    });

    if (!fatura || !fatura.ativo || fatura.data_exclusao) {
      throw new NotFoundException('Fatura nao encontrada.');
    }

    return fatura;
  }

  async atualizarStatus(
    id: string,
    dto: AtualizarStatusFaturaDto,
    usuarioAtual: PayloadToken,
  ) {
    await this.buscarPorId(id);

    const dadosStatus = this.mapearStatus(dto.status);

    return this.prisma.fatura.update({
      where: { id },
      data: {
        status: dto.status as unknown as StatusFaturaPrisma,
        metodo_pagamento: dto.metodo_pagamento,
        observacoes: dto.observacoes,
        atualizado_por_id: usuarioAtual.sub,
        ...dadosStatus,
      },
      include: this.includeCompleto(),
    });
  }

  private mapearStatus(status: StatusFatura) {
    const agora = new Date();

    switch (status) {
      case StatusFatura.EMITIDA:
        return { emitida_em: agora };
      case StatusFatura.PAGA:
        return { paga_em: agora, emitida_em: agora };
      case StatusFatura.VENCIDA:
        return {};
      case StatusFatura.CANCELADA:
        return {};
      case StatusFatura.RASCUNHO:
      default:
        return {};
    }
  }

  private async gerarNumeroFatura() {
    const agora = new Date();
    const dataCodigo = agora.toISOString().slice(0, 10).replace(/-/g, '');
    const inicioDia = new Date(agora);
    inicioDia.setHours(0, 0, 0, 0);

    const quantidadeHoje = await this.prisma.fatura.count({
      where: {
        data_criacao: { gte: inicioDia },
      },
    });

    return `FAT-${dataCodigo}-${String(quantidadeHoje + 1).padStart(4, '0')}`;
  }

  private includeCompleto() {
    return {
      ordem_servico: {
        include: {
          cliente: true,
        },
      },
      criado_por: {
        select: { id: true, nome: true, email: true, perfil: true },
      },
      atualizado_por: {
        select: { id: true, nome: true, email: true, perfil: true },
      },
      observacoes_relacionadas: {
        where: { ativo: true, data_exclusao: null },
        include: {
          imagens: true,
        },
        orderBy: { data_criacao: 'desc' as const },
      },
    };
  }
}
