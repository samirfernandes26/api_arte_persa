import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TipoAlvoObservacao } from '../../comum/enums/tipo-alvo-observacao.enum';
import { VisibilidadeObservacao } from '../../comum/enums/visibilidade-observacao.enum';

export class AdicionarImagemObservacaoDto {
  @IsString()
  @IsNotEmpty()
  chave_s3!: string;

  @IsString()
  @IsNotEmpty()
  nome_arquivo!: string;

  @IsString()
  @IsNotEmpty()
  tipo_mime!: string;

  @IsNumber()
  @Min(1)
  tamanho_bytes!: number;

  @IsInt()
  @Min(0)
  @Max(1)
  posicao!: number;
}

/**
 * Regras de negocio relevantes:
 * - observacoes aceitam no maximo 2 imagens.
 * - o `tipo_alvo` define qual identificador deve ser preenchido.
 */
export class AdicionarObservacaoDto {
  @IsEnum(TipoAlvoObservacao)
  tipo_alvo!: TipoAlvoObservacao;

  @IsOptional()
  @IsUUID()
  ordem_servico_id?: string;

  @IsOptional()
  @IsUUID()
  item_ordem_servico_id?: string;

  @IsOptional()
  @IsUUID()
  cliente_id?: string;

  @IsOptional()
  @IsUUID()
  fatura_id?: string;

  @IsOptional()
  @IsEnum(VisibilidadeObservacao)
  visibilidade?: VisibilidadeObservacao;

  @IsOptional()
  @IsString()
  titulo?: string;

  @IsString()
  conteudo!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2, { message: 'Cada observacao pode receber no maximo 2 imagens.' })
  @ValidateNested({ each: true })
  @Type(() => AdicionarImagemObservacaoDto)
  imagens?: AdicionarImagemObservacaoDto[];
}
