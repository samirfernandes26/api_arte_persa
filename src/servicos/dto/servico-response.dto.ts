import { Exclude, Expose } from 'class-transformer';
import { UnidadeCobrancaServico } from '../../comum/enums/unidade-cobranca-servico.enum';

@Exclude()
export class ServicoResumoResponseDto {
  @Expose()
  id!: number;

  @Expose()
  nome!: string;

  @Expose()
  categoria?: string | null;

  @Expose()
  preco_base!: string;

  @Expose()
  unidade_cobranca!: UnidadeCobrancaServico;

  @Expose()
  ativo!: boolean;
}

@Exclude()
export class ServicoResponseDto extends ServicoResumoResponseDto {
  @Expose()
  descricao?: string | null;

  @Expose()
  prazo_medio_dias?: number | null;

  @Expose()
  data_criacao!: Date;

  @Expose()
  data_atualizacao!: Date;
}
