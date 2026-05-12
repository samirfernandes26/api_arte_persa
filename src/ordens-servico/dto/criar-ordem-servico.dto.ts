import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CanalEntradaOrdemServico } from '../../comum/enums/canal-entrada-ordem-servico.enum';
import { CategoriaItem } from '../../comum/enums/categoria-item.enum';
import { MaterialItem } from '../../comum/enums/material-item.enum';
import { UnidadeCobrancaServico } from '../../comum/enums/unidade-cobranca-servico.enum';

export class CriarServicoExecutadoItemDto {
  @IsOptional()
  @IsUUID()
  servico_catalogo_id?: string;

  @IsOptional()
  @IsString()
  nome_servico_snapshot?: string;

  @IsOptional()
  @IsString()
  categoria_servico_snapshot?: string;

  @IsOptional()
  @IsEnum(UnidadeCobrancaServico)
  unidade_cobranca_snapshot?: UnidadeCobrancaServico;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor_unitario_snapshot!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantidade!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor_desconto!: number;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class CriarItemOrdemServicoDto {
  @IsString()
  @IsNotEmpty()
  descricao!: string;

  @IsEnum(CategoriaItem)
  categoria!: CategoriaItem;

  @IsOptional()
  @IsEnum(MaterialItem)
  material?: MaterialItem;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantidade!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  largura_cm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  altura_cm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  profundidade_cm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  area_m2?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor_declarado?: number;

  @IsOptional()
  @IsString()
  estado_atual?: string;

  @IsOptional()
  @IsString()
  cuidados_especiais?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(15)
  @ValidateNested({ each: true })
  @Type(() => CriarServicoExecutadoItemDto)
  servicos_executados!: CriarServicoExecutadoItemDto[];
}

/**
 * Exemplo de payload:
 * {
 *   "cliente_id": "uuid-do-cliente",
 *   "canal_entrada": "whatsapp",
 *   "percentual_desconto": 5,
 *   "valor_frete": 25,
 *   "snapshot_endereco_coleta": { "logradouro": "Rua A", "cidade": "Sao Paulo" },
 *   "itens": [
 *     {
 *       "descricao": "Tapete persa sala principal",
 *       "categoria": "tapete_persa",
 *       "material": "la",
 *       "quantidade": 1,
 *       "largura_cm": 250,
 *       "altura_cm": 350,
 *       "servicos_executados": [
 *         {
 *           "servico_catalogo_id": "uuid-servico",
 *           "valor_unitario_snapshot": 800,
 *           "quantidade": 1,
 *           "valor_desconto": 40
 *         }
 *       ]
 *     }
 *   ]
 * }
 *
 * Validacoes em destaque:
 * - `percentual_desconto` e limitado de 0 a 100 no DTO.
 * - a regra real por perfil de usuario sera reforcada no service.
 * - os servicos do item congelam nome/preco no momento da criacao.
 */
export class CriarOrdemServicoDto {
  @IsUUID()
  cliente_id!: string;

  @IsOptional()
  @IsEnum(CanalEntradaOrdemServico)
  canal_entrada?: CanalEntradaOrdemServico;

  @IsOptional()
  @IsUUID()
  responsavel_id?: string;

  @IsOptional()
  @IsUUID()
  aprovado_por_desconto_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percentual_desconto?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor_frete?: number;

  @IsOptional()
  @IsObject()
  snapshot_endereco_coleta?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  snapshot_endereco_entrega?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  motivo_desconto?: string;

  @IsOptional()
  @IsString()
  observacoes_internas?: string;

  @IsOptional()
  @IsString()
  observacoes_cliente?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CriarItemOrdemServicoDto)
  itens!: CriarItemOrdemServicoDto[];
}
