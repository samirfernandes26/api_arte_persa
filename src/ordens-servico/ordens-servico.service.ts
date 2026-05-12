import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CategoriaItem as CategoriaItemPrisma,
  MaterialItem as MaterialItemPrisma,
  Prisma,
  ServicoCatalogo,
  StatusOrdemServico as StatusOrdemServicoPrisma,
  UnidadeCobrancaServico as UnidadeCobrancaServicoPrisma,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { ClientesService } from '../clientes/clientes.service';
import { PerfilUsuario } from '../comum/enums/perfil-usuario.enum';
import { StatusOrdemServico } from '../comum/enums/status-ordem-servico.enum';
import { PayloadAutenticacao } from '../comum/interfaces/payload-token.interface';
import { gerarCodigoExterno } from '../comum/utilitarios/codigo-externo.util';
import {
  arredondarMoeda,
  dividirMoeda,
  paraDecimal,
  somarDecimais,
} from '../comum/utilitarios/dinheiro.util';
import { validarDescontoPorPerfil } from '../comum/utilitarios/desconto.util';
import { validarTransicaoStatusOrdemServico } from '../comum/utilitarios/status-ordem-servico.util';
import { FilasService } from '../filas/filas.service';
import { KmsService } from '../kms/kms.service';
import { ServicoPrisma } from '../prisma/prisma.service';
import { AtualizarOrdemServicoDto } from './dto/atualizar-ordem-servico.dto';
import { AtualizarStatusOrdemServicoDto } from './dto/atualizar-status-ordem-servico.dto';
import { ConsultarOrdensServicoDto } from './dto/consultar-ordens-servico.dto';
import {
  CriarItemOrdemServicoDto,
  CriarOrdemServicoDto,
  CriarServicoExecutadoItemDto,
} from './dto/criar-ordem-servico.dto';

interface ServicoExecutadoMontado {
  servico_catalogo_id?: number;
  nome_servico_snapshot: string;
  categoria_servico_snapshot?: string;
  unidade_cobranca_snapshot: UnidadeCobrancaServicoPrisma;
  valor_unitario_snapshot: Prisma.Decimal;
  quantidade: Prisma.Decimal;
  valor_desconto: Prisma.Decimal;
  valor_total: Prisma.Decimal;
  observacoes?: string;
}

interface ItemMontado {
  descricao: string;
  categoria: CategoriaItemPrisma;
  material?: MaterialItemPrisma;
  quantidade: number;
  largura_cm?: number;
  altura_cm?: number;
  profundidade_cm?: number;
  area_m2?: number;
  valor_declarado?: number;
  estado_atual?: string;
  cuidados_especiais?: string;
  valor_unitario_base: Prisma.Decimal;
  valor_unitario_desconto: Prisma.Decimal;
  valor_unitario_final: Prisma.Decimal;
  valor_total_bruto: Prisma.Decimal;
  valor_total_desconto: Prisma.Decimal;
  valor_total_final: Prisma.Decimal;
  servicos_executados: ServicoExecutadoMontado[];
}

const incluirOrdemCompleta = {
  cliente: true,
  criado_por: {
    select: { id: true, nome: true, email: true, perfil: true },
  },
  atualizado_por: {
    select: { id: true, nome: true, email: true, perfil: true },
  },
  responsavel: {
    select: { id: true, nome: true, email: true, perfil: true },
  },
  aprovado_por_desconto: {
    select: { id: true, nome: true, email: true, perfil: true },
  },
  itens: {
    where: { ativo: true, data_exclusao: null },
    include: {
      servicos_executados: {
        where: { ativo: true, data_exclusao: null },
      },
      observacoes: {
        where: { ativo: true, data_exclusao: null },
      },
    },
    orderBy: { data_criacao: 'asc' as const },
  },
  historico_status: {
    where: { ativo: true, data_exclusao: null },
    include: {
      usuario: {
        select: { id: true, nome: true, email: true, perfil: true },
      },
    },
    orderBy: { data_criacao: 'desc' as const },
  },
  observacoes: {
    where: { ativo: true, data_exclusao: null },
    include: { imagens: true },
    orderBy: { data_criacao: 'desc' as const },
  },
  imagens: {
    where: { ativo: true, data_exclusao: null },
    orderBy: { ordem_exibicao: 'asc' as const },
  },
  fatura: true,
} satisfies Prisma.OrdemServicoInclude;

type OrdemServicoCompleta = Prisma.OrdemServicoGetPayload<{
  include: typeof incluirOrdemCompleta;
}>;

@Injectable()
export class OrdensServicoService {
  private readonly logger = new Logger(OrdensServicoService.name);

  constructor(
    private readonly prisma: ServicoPrisma,
    private readonly configService: ConfigService,
    private readonly clientesService: ClientesService,
    private readonly filasService: FilasService,
    private readonly kmsService: KmsService,
  ) {}

  async criar(dto: CriarOrdemServicoDto, usuarioAtual: PayloadAutenticacao) {
    const cliente = await this.clientesService.obterSnapshotCliente(dto.cliente_id);
    const itensMontados = await this.montarItens(dto.itens);
    const limites = this.obterLimitesDesconto();
    const percentualDesconto = dto.percentual_desconto ?? 0;
    const aprovador = dto.aprovado_por_desconto_id
      ? await this.obterUsuarioAtivo(dto.aprovado_por_desconto_id)
      : null;

    this.validarMotivoDesconto(percentualDesconto, dto.motivo_desconto);

    validarDescontoPorPerfil({
      perfilSolicitante: usuarioAtual.perfil as PerfilUsuario,
      percentualSolicitado: percentualDesconto,
      perfilAprovador: (aprovador?.perfil as PerfilUsuario | undefined) ?? null,
      limites,
    });

    const totais = this.calcularTotais(
      itensMontados,
      percentualDesconto,
      paraDecimal(dto.valor_frete ?? 0),
    );
    const snapshotClienteCriptografado = await this.kmsService.criptografarJson(
      cliente.cliente,
      {
        entidade: 'ordem_servico',
        campo: 'snapshot_cliente',
      },
    );
    const snapshotEnderecoColetaCriptografado =
      await this.kmsService.criptografarJson(
        dto.snapshot_endereco_coleta ?? cliente.endereco_padrao,
        {
          entidade: 'ordem_servico',
          campo: 'snapshot_endereco_coleta',
        },
      );
    const snapshotEnderecoEntregaCriptografado =
      await this.kmsService.criptografarJson(
        dto.snapshot_endereco_entrega ?? cliente.endereco_padrao,
        {
          entidade: 'ordem_servico',
          campo: 'snapshot_endereco_entrega',
        },
      );
    const motivoDescontoCriptografado = await this.kmsService.encryptData(
      dto.motivo_desconto,
      {
        entidade: 'ordem_servico',
        campo: 'motivo_desconto',
      },
    );
    const observacoesInternasCriptografadas = await this.kmsService.encryptData(
      dto.observacoes_internas,
      {
        entidade: 'ordem_servico',
        campo: 'observacoes_internas',
      },
    );
    const observacoesClienteCriptografadas = await this.kmsService.encryptData(
      dto.observacoes_cliente,
      {
        entidade: 'ordem_servico',
        campo: 'observacoes_cliente',
      },
    );
    const responsavelId = dto.responsavel_id ?? usuarioAtual.sub;
    await this.obterUsuarioAtivo(responsavelId);

    const ordemId = await this.criarOrdemComCodigoSeguro({
      dto,
      cliente,
      itensMontados,
      limites,
      totais,
      responsavelId,
      usuarioAtual,
      snapshotClienteCriptografado,
      snapshotEnderecoColetaCriptografado,
      snapshotEnderecoEntregaCriptografado,
      motivoDescontoCriptografado,
      observacoesInternasCriptografadas,
      observacoesClienteCriptografadas,
    });

    const ordemCompleta = await this.buscarPorId(ordemId);
    await this.enfileirarGeracaoPdf(ordemCompleta);
    return ordemCompleta;
  }

  async listar(consulta: ConsultarOrdensServicoDto) {
    const pagina = consulta.pagina ?? 1;
    const limite = consulta.limite ?? 20;

    const ordens = await this.prisma.ordemServico.findMany({
      where: {
        ativo: true,
        data_exclusao: null,
        status: consulta.status as StatusOrdemServicoPrisma | undefined,
        cliente_id: consulta.cliente_id,
        OR: consulta.busca
          ? [
              { codigo: { contains: consulta.busca } },
              { cliente: { nome_razao_social: { contains: consulta.busca } } },
            ]
          : undefined,
      },
      include: {
        cliente: true,
        responsavel: {
          select: { id: true, nome: true, email: true, perfil: true },
        },
      },
      orderBy: { data_criacao: 'desc' },
      skip: (pagina - 1) * limite,
      take: limite,
    });

    return Promise.all(ordens.map((ordem) => this.descriptografarOrdemServico(ordem)));
  }

  async buscarPorId(id: number): Promise<OrdemServicoCompleta> {
    const ordem = await this.prisma.ordemServico.findUnique({
      where: { id },
      include: incluirOrdemCompleta,
    });

    if (!ordem || !ordem.ativo || ordem.data_exclusao) {
      throw new NotFoundException('Ordem de servico nao encontrada.');
    }

    return this.descriptografarOrdemServico(ordem);
  }

  async atualizar(
    id: number,
    dto: AtualizarOrdemServicoDto,
    usuarioAtual: PayloadAutenticacao,
  ) {
    if (dto.itens && dto.itens.length === 0) {
      throw new BadRequestException(
        'A ordem de servico precisa manter pelo menos um item.',
      );
    }

    const ordemAtual = await this.buscarPorId(id);
    const clienteId = dto.cliente_id ?? ordemAtual.cliente_id;
    const cliente = await this.clientesService.obterSnapshotCliente(clienteId);
    const percentualDesconto =
      dto.percentual_desconto ?? Number(ordemAtual.percentual_desconto);
    const valorFrete = paraDecimal(dto.valor_frete ?? ordemAtual.valor_frete);
    const limites = this.obterLimitesDesconto();
    const aprovador = dto.aprovado_por_desconto_id
      ? await this.obterUsuarioAtivo(dto.aprovado_por_desconto_id)
      : ordemAtual.aprovado_por_desconto_id
        ? await this.obterUsuarioAtivo(ordemAtual.aprovado_por_desconto_id)
        : null;

    validarDescontoPorPerfil({
      perfilSolicitante: usuarioAtual.perfil as PerfilUsuario,
      percentualSolicitado: percentualDesconto,
      perfilAprovador: (aprovador?.perfil as PerfilUsuario | undefined) ?? null,
      limites,
    });
    this.validarMotivoDesconto(
      percentualDesconto,
      dto.motivo_desconto ?? ordemAtual.motivo_desconto ?? undefined,
    );

    const itensMontados = dto.itens
      ? await this.montarItens(dto.itens)
      : this.reaproveitarItensDaOrdem(ordemAtual);
    const totais = this.calcularTotais(itensMontados, percentualDesconto, valorFrete);
    const itemIdsAtivos = ordemAtual.itens.map((item) => item.id);
    const snapshotClienteCriptografado = await this.kmsService.criptografarJson(
      cliente.cliente,
      {
        entidade: 'ordem_servico',
        campo: 'snapshot_cliente',
        identificador: id,
      },
    );
    const snapshotEnderecoColetaCriptografado =
      await this.kmsService.criptografarJson(
        dto.snapshot_endereco_coleta ??
          ordemAtual.snapshot_endereco_coleta ??
          cliente.endereco_padrao,
        {
          entidade: 'ordem_servico',
          campo: 'snapshot_endereco_coleta',
          identificador: id,
        },
      );
    const snapshotEnderecoEntregaCriptografado =
      await this.kmsService.criptografarJson(
        dto.snapshot_endereco_entrega ??
          ordemAtual.snapshot_endereco_entrega ??
          cliente.endereco_padrao,
        {
          entidade: 'ordem_servico',
          campo: 'snapshot_endereco_entrega',
          identificador: id,
        },
      );
    const motivoDescontoCriptografado =
      dto.motivo_desconto !== undefined
        ? await this.kmsService.encryptData(dto.motivo_desconto, {
            entidade: 'ordem_servico',
            campo: 'motivo_desconto',
            identificador: id,
          })
        : undefined;
    const observacoesInternasCriptografadas =
      dto.observacoes_internas !== undefined
        ? await this.kmsService.encryptData(dto.observacoes_internas, {
            entidade: 'ordem_servico',
            campo: 'observacoes_internas',
            identificador: id,
          })
        : undefined;
    const observacoesClienteCriptografadas =
      dto.observacoes_cliente !== undefined
        ? await this.kmsService.encryptData(dto.observacoes_cliente, {
            entidade: 'ordem_servico',
            campo: 'observacoes_cliente',
            identificador: id,
          })
        : undefined;

    await this.prisma.$transaction(async (transacao) => {
      const agora = new Date();

      await transacao.ordemServico.update({
        where: { id },
        data: {
          cliente_id: clienteId,
          atualizado_por_id: usuarioAtual.sub,
          responsavel_id: dto.responsavel_id ?? ordemAtual.responsavel_id,
          aprovado_por_desconto_id:
            dto.aprovado_por_desconto_id ?? ordemAtual.aprovado_por_desconto_id,
          canal_entrada: dto.canal_entrada ?? ordemAtual.canal_entrada,
          snapshot_cliente: this.paraJson(snapshotClienteCriptografado),
          snapshot_endereco_coleta: this.paraJson(snapshotEnderecoColetaCriptografado),
          snapshot_endereco_entrega: this.paraJson(snapshotEnderecoEntregaCriptografado),
          snapshot_politica_desconto: this.paraJson(limites),
          percentual_desconto: paraDecimal(percentualDesconto),
          valor_desconto: totais.valor_desconto,
          valor_frete: valorFrete,
          valor_subtotal: totais.valor_subtotal,
          valor_total: totais.valor_total,
          motivo_desconto: motivoDescontoCriptografado,
          observacoes_internas: observacoesInternasCriptografadas,
          observacoes_cliente: observacoesClienteCriptografadas,
        },
      });

      if (dto.itens) {
        if (itemIdsAtivos.length) {
          await transacao.servicoExecutadoItem.updateMany({
            where: {
              item_ordem_servico_id: { in: itemIdsAtivos },
              ativo: true,
              data_exclusao: null,
            },
            data: {
              ativo: false,
              data_exclusao: agora,
            },
          });
        }

        await transacao.itemOrdemServico.updateMany({
          where: {
            ordem_servico_id: id,
            ativo: true,
            data_exclusao: null,
          },
          data: {
            ativo: false,
            data_exclusao: agora,
            atualizado_por_id: usuarioAtual.sub,
          },
        });

        await this.criarItensDaOrdem(transacao, id, itensMontados, usuarioAtual.sub);
      }
    });

    const ordemAtualizada = await this.buscarPorId(id);
    await this.enfileirarGeracaoPdf(ordemAtualizada);
    return ordemAtualizada;
  }

  async atualizarStatus(
    id: number,
    dto: AtualizarStatusOrdemServicoDto,
    usuarioAtual: PayloadAutenticacao,
  ) {
    const ordem = await this.buscarPorId(id);
    validarTransicaoStatusOrdemServico(
      ordem.status as unknown as StatusOrdemServico,
      dto.status,
    );

    const marcadores = this.obterMarcadoresStatus(
      ordem.status as unknown as StatusOrdemServico,
      dto.status,
    );

    await this.prisma.$transaction(async (transacao) => {
      await transacao.ordemServico.update({
        where: { id },
        data: {
          status: dto.status as unknown as StatusOrdemServicoPrisma,
          atualizado_por_id: usuarioAtual.sub,
          ...marcadores,
        },
      });

      await transacao.historicoStatusOrdemServico.create({
        data: {
          ordem_servico_id: id,
          usuario_id: usuarioAtual.sub,
          status_origem: ordem.status,
          status_destino: dto.status as unknown as StatusOrdemServicoPrisma,
          motivo: dto.motivo,
          metadados: this.paraJson({ origem: 'atualizacao_status' }),
        },
      });
    });

    const atualizada = await this.buscarPorId(id);

    await this.filasService.adicionarTarefaNotificacao({
      canal: 'email',
      tipo: 'ordem_servico_status',
      destinatario: atualizada.cliente.email_principal ?? atualizada.codigo,
      assunto: `Status da ordem ${atualizada.codigo} alterado`,
      mensagem: `Novo status: ${dto.status}`,
      metadados: {
        ordem_servico_id: atualizada.id,
        status: String(dto.status),
      },
    });

    await this.enfileirarGeracaoPdf(atualizada);
    return atualizada;
  }

  async solicitarGeracaoPdf(id: number) {
    const ordem = await this.buscarPorId(id);
    await this.enfileirarGeracaoPdf(ordem);
    return { mensagem: 'Geracao de PDF solicitada com sucesso.' };
  }

  private async montarItens(
    itens: CriarItemOrdemServicoDto[],
  ): Promise<ItemMontado[]> {
    if (!itens.length) {
      throw new BadRequestException(
        'A ordem de servico precisa ter pelo menos um item.',
      );
    }

    const idsServicos = Array.from(
      new Set(
        itens.flatMap((item) =>
          item.servicos_executados
            .map((servico) => servico.servico_catalogo_id)
            .filter((valor): valor is number => valor !== undefined),
        ),
      ),
    );

    const servicosCatalogo = idsServicos.length
      ? await this.prisma.servicoCatalogo.findMany({
          where: {
            id: { in: idsServicos },
            ativo: true,
            data_exclusao: null,
          },
        })
      : [];

    const mapaServicos = new Map<number, ServicoCatalogo>(
      servicosCatalogo.map((servico) => [servico.id, servico]),
    );

    return itens.map((item) => this.montarItem(item, mapaServicos));
  }

  private montarItem(
    item: CriarItemOrdemServicoDto,
    mapaServicos: Map<number, ServicoCatalogo>,
  ): ItemMontado {
    if (!item.servicos_executados.length) {
      throw new BadRequestException(
        `O item "${item.descricao}" precisa ter ao menos um servico executado.`,
      );
    }

    const servicosExecutados = item.servicos_executados.map((servico) =>
      this.montarServicoExecutado(servico, mapaServicos),
    );

    const valorTotalBruto = somarDecimais(
      servicosExecutados.map((servico) =>
        servico.valor_unitario_snapshot.mul(servico.quantidade),
      ),
    );
    const valorTotalDesconto = somarDecimais(
      servicosExecutados.map((servico) => servico.valor_desconto),
    );
    const valorTotalFinal = somarDecimais(
      servicosExecutados.map((servico) => servico.valor_total),
    );

    return {
      descricao: item.descricao,
      categoria: item.categoria as unknown as CategoriaItemPrisma,
      material: item.material as unknown as MaterialItemPrisma | undefined,
      quantidade: item.quantidade,
      largura_cm: item.largura_cm,
      altura_cm: item.altura_cm,
      profundidade_cm: item.profundidade_cm,
      area_m2: item.area_m2,
      valor_declarado: item.valor_declarado,
      estado_atual: item.estado_atual,
      cuidados_especiais: item.cuidados_especiais,
      valor_unitario_base: dividirMoeda(valorTotalBruto, item.quantidade),
      valor_unitario_desconto: dividirMoeda(valorTotalDesconto, item.quantidade),
      valor_unitario_final: dividirMoeda(valorTotalFinal, item.quantidade),
      valor_total_bruto: valorTotalBruto,
      valor_total_desconto: valorTotalDesconto,
      valor_total_final: valorTotalFinal,
      servicos_executados: servicosExecutados,
    };
  }

  private montarServicoExecutado(
    servico: CriarServicoExecutadoItemDto,
    mapaServicos: Map<number, ServicoCatalogo>,
  ): ServicoExecutadoMontado {
    const servicoCatalogo = servico.servico_catalogo_id
      ? mapaServicos.get(servico.servico_catalogo_id)
      : undefined;

    if (servico.servico_catalogo_id && !servicoCatalogo) {
      throw new NotFoundException(
        `Servico de catalogo ${servico.servico_catalogo_id} nao encontrado.`,
      );
    }

    const nomeServico = servico.nome_servico_snapshot ?? servicoCatalogo?.nome;
    const categoriaServico =
      servico.categoria_servico_snapshot ?? servicoCatalogo?.categoria ?? undefined;
    const unidadeCobranca =
      servico.unidade_cobranca_snapshot ?? servicoCatalogo?.unidade_cobranca;

    if (!nomeServico || !unidadeCobranca) {
      throw new BadRequestException(
        'Cada servico executado precisa ter nome e unidade de cobranca definidos.',
      );
    }

    const valorUnitario = paraDecimal(
      servico.valor_unitario_snapshot ?? servicoCatalogo?.preco_base ?? 0,
    );
    const quantidade = paraDecimal(servico.quantidade);
    const valorBruto = arredondarMoeda(valorUnitario.mul(quantidade));
    const valorDesconto = arredondarMoeda(servico.valor_desconto);

    if (valorDesconto.greaterThan(valorBruto)) {
      throw new BadRequestException(
        `O desconto do servico ${nomeServico} nao pode ultrapassar o valor bruto.`,
      );
    }

    return {
      servico_catalogo_id: servico.servico_catalogo_id,
      nome_servico_snapshot: nomeServico,
      categoria_servico_snapshot: categoriaServico,
      unidade_cobranca_snapshot:
        unidadeCobranca as unknown as UnidadeCobrancaServicoPrisma,
      valor_unitario_snapshot: valorUnitario,
      quantidade,
      valor_desconto: valorDesconto,
      valor_total: arredondarMoeda(valorBruto.minus(valorDesconto)),
      observacoes: servico.observacoes,
    };
  }

  private reaproveitarItensDaOrdem(ordem: OrdemServicoCompleta): ItemMontado[] {
    return ordem.itens.map<ItemMontado>((item) => ({
      descricao: item.descricao,
      categoria: item.categoria,
      material: item.material ?? undefined,
      quantidade: item.quantidade,
      largura_cm: item.largura_cm ? Number(item.largura_cm) : undefined,
      altura_cm: item.altura_cm ? Number(item.altura_cm) : undefined,
      profundidade_cm: item.profundidade_cm
        ? Number(item.profundidade_cm)
        : undefined,
      area_m2: item.area_m2 ? Number(item.area_m2) : undefined,
      valor_declarado: item.valor_declarado ? Number(item.valor_declarado) : undefined,
      estado_atual: item.estado_atual ?? undefined,
      cuidados_especiais: item.cuidados_especiais ?? undefined,
      valor_unitario_base: paraDecimal(item.valor_unitario_base),
      valor_unitario_desconto: paraDecimal(item.valor_unitario_desconto),
      valor_unitario_final: paraDecimal(item.valor_unitario_final),
      valor_total_bruto: paraDecimal(item.valor_total_bruto),
      valor_total_desconto: paraDecimal(item.valor_total_desconto),
      valor_total_final: paraDecimal(item.valor_total_final),
      servicos_executados: item.servicos_executados.map((servico) => ({
        servico_catalogo_id: servico.servico_catalogo_id ?? undefined,
        nome_servico_snapshot: servico.nome_servico_snapshot,
        categoria_servico_snapshot:
          servico.categoria_servico_snapshot ?? undefined,
        unidade_cobranca_snapshot: servico.unidade_cobranca_snapshot,
        valor_unitario_snapshot: paraDecimal(servico.valor_unitario_snapshot),
        quantidade: paraDecimal(servico.quantidade),
        valor_desconto: paraDecimal(servico.valor_desconto),
        valor_total: paraDecimal(servico.valor_total),
        observacoes: servico.observacoes ?? undefined,
      })),
    }));
  }

  private calcularTotais(
    itens: ItemMontado[],
    percentualDesconto: number,
    valorFrete: Prisma.Decimal,
  ) {
    const valorSubtotal = somarDecimais(itens.map((item) => item.valor_total_bruto));
    const valorDescontoItens = somarDecimais(
      itens.map((item) => item.valor_total_desconto),
    );
    const baseDescontoPercentual = valorSubtotal.minus(valorDescontoItens);
    const percentualDecimal = paraDecimal(percentualDesconto).div(100);
    const valorDescontoPercentual = arredondarMoeda(
      baseDescontoPercentual.mul(percentualDecimal),
    );
    const valorDesconto = somarDecimais([
      valorDescontoItens,
      valorDescontoPercentual,
    ]);
    const valorTotal = arredondarMoeda(
      valorSubtotal.minus(valorDesconto).plus(valorFrete),
    );

    if (valorTotal.isNegative()) {
      throw new ForbiddenException(
        'A composicao financeira da ordem resultou em valor total negativo.',
      );
    }

    return {
      valor_subtotal: valorSubtotal,
      valor_desconto: valorDesconto,
      valor_total: valorTotal,
    };
  }

  private obterLimitesDesconto(): Record<PerfilUsuario, number> {
    return {
      [PerfilUsuario.FUNCIONARIO]: this.configService.get<number>(
        'DESCONTO_MAXIMO_FUNCIONARIO',
        10,
      ),
      [PerfilUsuario.SUPERVISOR]: this.configService.get<number>(
        'DESCONTO_MAXIMO_SUPERVISOR',
        20,
      ),
      [PerfilUsuario.MASTER]: this.configService.get<number>(
        'DESCONTO_MAXIMO_MASTER',
        100,
      ),
    };
  }

  private async obterUsuarioAtivo(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true, perfil: true, ativo: true, data_exclusao: true },
    });

    if (!usuario || !usuario.ativo || usuario.data_exclusao) {
      throw new NotFoundException(`Usuario ${id} nao encontrado ou inativo.`);
    }

    return usuario;
  }

  private validarMotivoDesconto(
    percentualDesconto: number,
    motivoDesconto?: string,
  ): void {
    if (percentualDesconto > 0 && !motivoDesconto?.trim()) {
      throw new BadRequestException(
        'Informe o motivo do desconto quando houver percentual de desconto.',
      );
    }
  }

  private async criarOrdemComCodigoSeguro(entrada: {
    dto: CriarOrdemServicoDto;
    cliente: Awaited<ReturnType<ClientesService['obterSnapshotCliente']>>;
    itensMontados: ItemMontado[];
    limites: Record<PerfilUsuario, number>;
    totais: {
      valor_subtotal: Prisma.Decimal;
      valor_desconto: Prisma.Decimal;
      valor_total: Prisma.Decimal;
    };
    responsavelId: number;
    usuarioAtual: PayloadAutenticacao;
    snapshotClienteCriptografado: unknown;
    snapshotEnderecoColetaCriptografado: unknown;
    snapshotEnderecoEntregaCriptografado: unknown;
    motivoDescontoCriptografado: string | null | undefined;
    observacoesInternasCriptografadas: string | null | undefined;
    observacoesClienteCriptografadas: string | null | undefined;
  }): Promise<number> {
    for (let tentativa = 1; tentativa <= 5; tentativa += 1) {
      const codigo = this.gerarCodigoOrdemServico();

      try {
        return await this.prisma.$transaction(async (transacao) => {
          const ordem = await transacao.ordemServico.create({
            data: {
              codigo,
              cliente_id: entrada.dto.cliente_id,
              criado_por_id: entrada.usuarioAtual.sub,
              atualizado_por_id: entrada.usuarioAtual.sub,
              responsavel_id: entrada.responsavelId,
              aprovado_por_desconto_id: entrada.dto.aprovado_por_desconto_id,
              canal_entrada: entrada.dto.canal_entrada,
              snapshot_cliente: this.paraJson(
                entrada.snapshotClienteCriptografado,
              ),
              snapshot_endereco_coleta: this.paraJson(
                entrada.snapshotEnderecoColetaCriptografado,
              ),
              snapshot_endereco_entrega: this.paraJson(
                entrada.snapshotEnderecoEntregaCriptografado,
              ),
              snapshot_politica_desconto: this.paraJson(entrada.limites),
              percentual_desconto: paraDecimal(
                entrada.dto.percentual_desconto ?? 0,
              ),
              valor_desconto: entrada.totais.valor_desconto,
              valor_frete: paraDecimal(entrada.dto.valor_frete ?? 0),
              valor_subtotal: entrada.totais.valor_subtotal,
              valor_total: entrada.totais.valor_total,
              motivo_desconto: entrada.motivoDescontoCriptografado,
              observacoes_internas: entrada.observacoesInternasCriptografadas,
              observacoes_cliente: entrada.observacoesClienteCriptografadas,
            },
          });

          await this.criarItensDaOrdem(
            transacao,
            ordem.id,
            entrada.itensMontados,
            entrada.usuarioAtual.sub,
          );

          await transacao.historicoStatusOrdemServico.create({
            data: {
              ordem_servico_id: ordem.id,
              usuario_id: entrada.usuarioAtual.sub,
              status_destino: StatusOrdemServicoPrisma.aberta,
              motivo: 'Ordem criada.',
              metadados: this.paraJson({ origem: 'criacao' }),
            },
          });

          return ordem.id;
        });
      } catch (erro) {
        if (this.ehColisaoCampoUnico(erro, 'codigo')) {
          this.logger.warn(
            `Colisao ao gerar codigo da ordem de servico na tentativa ${tentativa}.`,
          );
          continue;
        }

        throw erro;
      }
    }

    throw new InternalServerErrorException(
      'Nao foi possivel gerar um codigo unico para a ordem de servico.',
    );
  }

  private gerarCodigoOrdemServico() {
    return gerarCodigoExterno('OS');
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

  private obterMarcadoresStatus(
    _statusAtual: StatusOrdemServico,
    proximoStatus: StatusOrdemServico,
  ) {
    const agora = new Date();

    switch (proximoStatus) {
      case StatusOrdemServico.COLETADA:
      case StatusOrdemServico.EM_HIGIENIZACAO:
      case StatusOrdemServico.EM_MANUTENCAO:
        return { iniciada_em: agora };
      case StatusOrdemServico.ENTREGUE:
        return { finalizada_em: agora };
      case StatusOrdemServico.CANCELADA:
        return { cancelada_em: agora };
      default:
        return {};
    }
  }

  private async criarItensDaOrdem(
    transacao: Prisma.TransactionClient,
    ordemId: number,
    itens: ItemMontado[],
    usuarioId: number,
  ) {
    for (const item of itens) {
      const itemCriado = await transacao.itemOrdemServico.create({
        data: {
          ordem_servico_id: ordemId,
          criado_por_id: usuarioId,
          atualizado_por_id: usuarioId,
          descricao: item.descricao,
          categoria: item.categoria,
          material: item.material,
          quantidade: item.quantidade,
          largura_cm: item.largura_cm,
          altura_cm: item.altura_cm,
          profundidade_cm: item.profundidade_cm,
          area_m2: item.area_m2,
          valor_declarado: item.valor_declarado,
          estado_atual: item.estado_atual,
          cuidados_especiais: item.cuidados_especiais,
          valor_unitario_base: item.valor_unitario_base,
          valor_unitario_desconto: item.valor_unitario_desconto,
          valor_unitario_final: item.valor_unitario_final,
          valor_total_bruto: item.valor_total_bruto,
          valor_total_desconto: item.valor_total_desconto,
          valor_total_final: item.valor_total_final,
        },
      });

      await transacao.servicoExecutadoItem.createMany({
        data: item.servicos_executados.map((servico) => ({
          item_ordem_servico_id: itemCriado.id,
          servico_catalogo_id: servico.servico_catalogo_id,
          nome_servico_snapshot: servico.nome_servico_snapshot,
          categoria_servico_snapshot: servico.categoria_servico_snapshot,
          unidade_cobranca_snapshot: servico.unidade_cobranca_snapshot,
          valor_unitario_snapshot: servico.valor_unitario_snapshot,
          quantidade: servico.quantidade,
          valor_desconto: servico.valor_desconto,
          valor_total: servico.valor_total,
          observacoes: servico.observacoes,
        })),
      });
    }
  }

  private async enfileirarGeracaoPdf(ordem: OrdemServicoCompleta) {
    await this.filasService.adicionarTarefaGeracaoPdf({
      ordem_servico_id: ordem.id,
      codigo_ordem_servico: ordem.codigo,
      nome_cliente: ordem.cliente.nome_razao_social,
      status: ordem.status,
      chave_arquivo: `ordens/${ordem.id}/documentos/ordem-servico-${ordem.codigo}.pdf`,
      observacoes: ordem.observacoes_cliente ?? ordem.observacoes_internas ?? undefined,
      valor_subtotal: paraDecimal(ordem.valor_subtotal).toFixed(2),
      valor_desconto: paraDecimal(ordem.valor_desconto).toFixed(2),
      valor_total: paraDecimal(ordem.valor_total).toFixed(2),
      itens: ordem.itens.map((item) => ({
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_total: paraDecimal(item.valor_total_final).toFixed(2),
      })),
    });

    this.logger.debug(`PDF da ordem ${ordem.codigo} enviado para a fila.`);
  }

  private paraJson(
    valor: unknown,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (valor === undefined) {
      return undefined;
    }

    return valor as Prisma.InputJsonValue;
  }

  private async descriptografarOrdemServico<T extends Record<string, unknown>>(
    ordem: T,
  ): Promise<T> {
    const cliente = ordem.cliente as
      | {
          documento?: string | null;
          email_principal?: string | null;
          telefone_principal?: string | null;
        }
      | undefined;

    return {
      ...ordem,
      cliente: cliente
        ? {
            ...cliente,
            documento: await this.kmsService.decryptData(cliente.documento),
            email_principal: await this.kmsService.decryptData(
              cliente.email_principal,
            ),
            telefone_principal: await this.kmsService.decryptData(
              cliente.telefone_principal,
            ),
          }
        : cliente,
      snapshot_cliente: await this.kmsService.descriptografarJson(
        ordem.snapshot_cliente,
      ),
      snapshot_endereco_coleta: await this.kmsService.descriptografarJson(
        ordem.snapshot_endereco_coleta,
      ),
      snapshot_endereco_entrega: await this.kmsService.descriptografarJson(
        ordem.snapshot_endereco_entrega,
      ),
      motivo_desconto:
        (await this.kmsService.decryptData(
          ordem.motivo_desconto as string | null | undefined,
        )) ?? null,
      observacoes_internas:
        (await this.kmsService.decryptData(
          ordem.observacoes_internas as string | null | undefined,
        )) ?? null,
      observacoes_cliente:
        (await this.kmsService.decryptData(
          ordem.observacoes_cliente as string | null | undefined,
        )) ?? null,
    } as T;
  }
}
