import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusFatura as StatusFaturaPrisma } from '@prisma/client';
import { gerarCodigoExterno } from '../comum/utilitarios/codigo-externo.util';
import {
  arredondarMoeda,
  paraDecimal,
} from '../comum/utilitarios/dinheiro.util';
import { FilasService } from '../filas/filas.service';
import { KmsService } from '../kms/kms.service';
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
    private readonly kmsService: KmsService,
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

    const valorSubtotal = paraDecimal(dto.valor_subtotal ?? ordem.valor_subtotal);
    const valorDesconto = paraDecimal(dto.valor_desconto ?? ordem.valor_desconto);
    const valorImpostos = paraDecimal(dto.valor_impostos ?? 0);
    const valorTotal = dto.valor_total
      ? paraDecimal(dto.valor_total)
      : arredondarMoeda(valorSubtotal.minus(valorDesconto).plus(valorImpostos));

    if (valorTotal.isNegative()) {
      throw new BadRequestException('O valor total da fatura nao pode ser negativo.');
    }

    const fatura = await this.criarFaturaComNumeroSeguro({
      dto,
      usuarioAtual,
      valorSubtotal,
      valorDesconto,
      valorImpostos,
      valorTotal,
    });
    const emailCliente = await this.kmsService.decryptData(ordem.cliente.email_principal);

    await this.filasService.adicionarTarefaNotificacao({
      canal: 'email',
      tipo: 'fatura_criada',
      destinatario: emailCliente ?? fatura.numero,
      assunto: `Fatura ${fatura.numero} criada`,
      mensagem: `A fatura da ordem ${ordem.codigo} foi criada.`,
      metadados: {
        fatura_id: fatura.id,
        ordem_servico_id: ordem.id,
      },
    });

    return this.descriptografarFatura(fatura);
  }

  async listar(consulta: ConsultarFaturasDto) {
    const pagina = consulta.pagina ?? 1;
    const limite = consulta.limite ?? 20;

    const faturas = await this.prisma.fatura.findMany({
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

    return Promise.all(faturas.map((fatura) => this.descriptografarFatura(fatura)));
  }

  async buscarPorId(id: string) {
    const fatura = await this.prisma.fatura.findUnique({
      where: { id },
      include: this.includeCompleto(),
    });

    if (!fatura || !fatura.ativo || fatura.data_exclusao) {
      throw new NotFoundException('Fatura nao encontrada.');
    }

    return this.descriptografarFatura(fatura);
  }

  async atualizarStatus(
    id: string,
    dto: AtualizarStatusFaturaDto,
    usuarioAtual: PayloadToken,
  ) {
    await this.buscarPorId(id);

    const dadosStatus = this.mapearStatus(dto.status);

    const fatura = await this.prisma.fatura.update({
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

    return this.descriptografarFatura(fatura);
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

  private gerarNumeroFatura() {
    return gerarCodigoExterno('FAT');
  }

  private async criarFaturaComNumeroSeguro(entrada: {
    dto: CriarFaturaDto;
    usuarioAtual: PayloadToken;
    valorSubtotal: Prisma.Decimal;
    valorDesconto: Prisma.Decimal;
    valorImpostos: Prisma.Decimal;
    valorTotal: Prisma.Decimal;
  }) {
    for (let tentativa = 1; tentativa <= 5; tentativa += 1) {
      const numero = entrada.dto.numero ?? this.gerarNumeroFatura();

      try {
        return await this.prisma.fatura.create({
          data: {
            ordem_servico_id: entrada.dto.ordem_servico_id,
            numero,
            criado_por_id: entrada.usuarioAtual.sub,
            atualizado_por_id: entrada.usuarioAtual.sub,
            vencimento_em: entrada.dto.vencimento_em
              ? new Date(entrada.dto.vencimento_em)
              : undefined,
            metodo_pagamento: entrada.dto.metodo_pagamento,
            valor_subtotal: entrada.valorSubtotal,
            valor_desconto: entrada.valorDesconto,
            valor_impostos: entrada.valorImpostos,
            valor_total: entrada.valorTotal,
            observacoes: entrada.dto.observacoes,
          },
          include: this.includeCompleto(),
        });
      } catch (erro) {
        if (this.ehColisaoCampoUnico(erro, 'numero')) {
          continue;
        }

        if (this.ehColisaoCampoUnico(erro, 'ordem_servico_id')) {
          throw new ConflictException('Esta ordem de servico ja possui uma fatura.');
        }

        throw erro;
      }
    }

    throw new InternalServerErrorException(
      'Nao foi possivel gerar um numero unico para a fatura.',
    );
  }

  private ehColisaoCampoUnico(erro: unknown, campo: string): boolean {
    if (!(erro instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    if (erro.code !== 'P2002') {
      return false;
    }

    const alvo = erro.meta?.target;
    if (Array.isArray(alvo)) {
      return alvo.includes(campo);
    }

    return typeof alvo === 'string' && alvo.includes(campo);
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

  private async descriptografarFatura<T extends Record<string, unknown>>(
    fatura: T,
  ): Promise<T> {
    const ordemServico = fatura.ordem_servico as
      | {
          cliente?: {
            email_principal?: string | null;
          } | null;
        }
      | undefined;

    return {
      ...fatura,
      ordem_servico: ordemServico
        ? {
            ...ordemServico,
            cliente: ordemServico.cliente
              ? {
                  ...ordemServico.cliente,
                  email_principal:
                    (await this.kmsService.decryptData(
                      ordemServico.cliente.email_principal,
                    )) ?? null,
                }
              : ordemServico.cliente,
          }
        : ordemServico,
    } as T;
  }
}
