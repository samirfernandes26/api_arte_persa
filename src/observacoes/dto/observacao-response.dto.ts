import { Exclude, Expose, Type } from 'class-transformer';
import { TipoAlvoObservacao } from '../../comum/enums/tipo-alvo-observacao.enum';
import { VisibilidadeObservacao } from '../../comum/enums/visibilidade-observacao.enum';
import { UsuarioResumidoDto } from '../../usuarios/dto/usuario-response.dto';

@Exclude()
export class ImagemObservacaoResponseDto {
  @Expose()
  id!: string;

  @Expose()
  chave_s3!: string;

  @Expose()
  url_arquivo?: string | null;

  @Expose()
  nome_arquivo!: string;

  @Expose()
  tipo_mime!: string;

  @Expose()
  tamanho_bytes!: number;

  @Expose()
  posicao!: number;
}

@Exclude()
export class ObservacaoResponseDto {
  @Expose()
  id!: string;

  @Expose()
  tipo_alvo!: TipoAlvoObservacao;

  @Expose()
  ordem_servico_id?: string | null;

  @Expose()
  item_ordem_servico_id?: string | null;

  @Expose()
  cliente_id?: string | null;

  @Expose()
  fatura_id?: string | null;

  @Expose()
  visibilidade!: VisibilidadeObservacao;

  @Expose()
  titulo?: string | null;

  @Expose()
  conteudo!: string;

  @Expose()
  ativo!: boolean;

  @Expose()
  data_criacao!: Date;

  @Expose()
  data_atualizacao!: Date;

  @Expose()
  @Type(() => UsuarioResumidoDto)
  criado_por?: UsuarioResumidoDto | null;

  @Expose()
  @Type(() => UsuarioResumidoDto)
  atualizado_por?: UsuarioResumidoDto | null;

  @Expose()
  @Type(() => ImagemObservacaoResponseDto)
  imagens?: ImagemObservacaoResponseDto[];
}
