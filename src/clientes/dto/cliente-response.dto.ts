import { Exclude, Expose, Type } from 'class-transformer';
import { TipoContatoCliente } from '../../comum/enums/tipo-contato-cliente.enum';
import { TipoEnderecoCliente } from '../../comum/enums/tipo-endereco-cliente.enum';
import { TipoPessoaCliente } from '../../comum/enums/tipo-pessoa-cliente.enum';

@Exclude()
export class ContatoClienteResponseDto {
  @Expose()
  id!: number;

  @Expose()
  nome!: string;

  @Expose()
  setor?: string | null;

  @Expose()
  cargo?: string | null;

  @Expose()
  tipo_contato!: TipoContatoCliente;

  @Expose()
  valor!: string;

  @Expose()
  principal!: boolean;

  @Expose()
  observacoes?: string | null;
}

@Exclude()
export class EnderecoClienteResponseDto {
  @Expose()
  id!: number;

  @Expose()
  tipo_endereco!: TipoEnderecoCliente;

  @Expose()
  rotulo?: string | null;

  @Expose()
  destinatario?: string | null;

  @Expose()
  cep?: string | null;

  @Expose()
  logradouro!: string;

  @Expose()
  numero?: string | null;

  @Expose()
  complemento?: string | null;

  @Expose()
  bairro?: string | null;

  @Expose()
  cidade!: string;

  @Expose()
  estado!: string;

  @Expose()
  principal!: boolean;
}

@Exclude()
export class ArquivoClienteResponseDto {
  @Expose()
  id!: number;

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
  rotulo?: string | null;

  @Expose()
  data_criacao!: Date;
}

@Exclude()
export class ClienteResponseDto {
  @Expose()
  id!: number;

  @Expose()
  tipo_pessoa!: TipoPessoaCliente;

  @Expose()
  documento?: string | null;

  @Expose()
  nome_razao_social!: string;

  @Expose()
  nome_fantasia_apelido?: string | null;

  @Expose()
  email_principal?: string | null;

  @Expose()
  telefone_principal?: string | null;

  @Expose()
  observacoes_internas?: string | null;

  @Expose()
  ativo!: boolean;

  @Expose()
  data_criacao!: Date;

  @Expose()
  data_atualizacao!: Date;

  @Expose()
  @Type(() => ContatoClienteResponseDto)
  contatos?: ContatoClienteResponseDto[];

  @Expose()
  @Type(() => EnderecoClienteResponseDto)
  enderecos?: EnderecoClienteResponseDto[];

  @Expose()
  @Type(() => ArquivoClienteResponseDto)
  arquivos?: ArquivoClienteResponseDto[];
}
