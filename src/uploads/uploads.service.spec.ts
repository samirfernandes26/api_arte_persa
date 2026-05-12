import { ServicoUploads } from './uploads.service';
import { TipoDestinoUpload } from '../comum/enums/tipo-destino-upload.enum';

describe('ServicoUploads', () => {
  const prismaMock = {
    ordemServico: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    itemOrdemServico: {
      findUnique: jest.fn(),
    },
    cliente: {
      findUnique: jest.fn(),
    },
    fatura: {
      findUnique: jest.fn(),
    },
    intencaoUpload: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    imagemOrdemServico: {
      create: jest.fn(),
    },
    arquivoCliente: {
      create: jest.fn(),
    },
  };

  const s3Mock = {
    obterUrlPreAssinada: jest.fn(),
    obterUrlObjeto: jest.fn(),
    obterBucketPadrao: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn((chave: string, valorPadrao?: unknown) => {
      if (chave === 'LIMITE_MB_ARQUIVO_IMAGEM') {
        return 15;
      }

      if (chave === 'TIPOS_MIME_PERMITIDOS_IMAGEM') {
        return 'image/jpeg,image/png,image/webp';
      }

      return valorPadrao;
    }),
  };

  let service: ServicoUploads;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1710000000000);
    jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
    s3Mock.obterUrlPreAssinada.mockResolvedValue({
      chave: 'qualquer',
      url: 'https://upload.exemplo',
      metodo: 'PUT',
      expira_em: 900,
      cabecalhos: {},
    });
    s3Mock.obterUrlObjeto.mockReturnValue('https://cdn.exemplo/arquivo');
    s3Mock.obterBucketPadrao.mockReturnValue('bucket-teste');
    prismaMock.ordemServico.findUnique.mockResolvedValue({
      id: 101,
      ativo: true,
      data_exclusao: null,
    });
    prismaMock.itemOrdemServico.findUnique.mockResolvedValue({
      id: 202,
      ordem_servico_id: 101,
      ativo: true,
      data_exclusao: null,
    });
    service = new ServicoUploads(
      configServiceMock as never,
      prismaMock as never,
      s3Mock as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('gera URL pre-assinada na pasta correta da ordem e item', async () => {
    const idOrdem = 101;
    const idItem = 202;

    await service.gerarUrlPreAssinada({
      tipo_destino: TipoDestinoUpload.FOTO_INICIAL_ITEM,
      ordem_servico_id: idOrdem,
      item_ordem_servico_id: idItem,
      nome_arquivo: 'Foto Inicial.JPG',
      tipo_mime: 'image/jpeg',
    }, 7);

    expect(s3Mock.obterUrlPreAssinada).toHaveBeenCalledWith(
      expect.objectContaining({
        chave: expect.stringContaining(`ordens/${idOrdem}/itens/${idItem}/`),
        tipo_conteudo: 'image/jpeg',
      }),
    );
    expect(prismaMock.intencaoUpload.create).toHaveBeenCalled();
  });
});
