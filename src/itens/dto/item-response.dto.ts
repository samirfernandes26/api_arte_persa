import { Exclude, Expose, Type } from 'class-transformer';
import { CategoriaItem } from '../../comum/enums/categoria-item.enum';
import { MaterialItem } from '../../comum/enums/material-item.enum';
import { ServicoExecutadoItemResponseDto } from '../../ordens-servico/dto/ordem-servico-response.dto';

@Exclude()
export class ItemResponseDto {
  @Expose()
  id!: number;

  @Expose()
  ordem_servico_id!: number;

  @Expose()
  descricao!: string;

  @Expose()
  categoria!: CategoriaItem;

  @Expose()
  material?: MaterialItem | null;

  @Expose()
  quantidade!: number;

  @Expose()
  largura_cm?: string | null;

  @Expose()
  altura_cm?: string | null;

  @Expose()
  profundidade_cm?: string | null;

  @Expose()
  area_m2?: string | null;

  @Expose()
  valor_declarado?: string | null;

  @Expose()
  estado_atual?: string | null;

  @Expose()
  cuidados_especiais?: string | null;

  @Expose()
  valor_unitario_base!: string;

  @Expose()
  valor_unitario_desconto!: string;

  @Expose()
  valor_unitario_final!: string;

  @Expose()
  valor_total_bruto!: string;

  @Expose()
  valor_total_desconto!: string;

  @Expose()
  valor_total_final!: string;

  @Expose()
  chave_foto_inicial?: string | null;

  @Expose()
  url_foto_inicial?: string | null;

  @Expose()
  data_criacao!: Date;

  @Expose()
  data_atualizacao!: Date;

  @Expose()
  @Type(() => ServicoExecutadoItemResponseDto)
  servicos_executados?: ServicoExecutadoItemResponseDto[];
}
