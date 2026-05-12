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
      id: '11111111-1111-1111-1111-111111111111',
      ativo: true,
      data_exclusao: null,
    });
    prismaMock.itemOrdemServico.findUnique.mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
      ordem_servico_id: '11111111-1111-1111-1111-111111111111',
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
    const uuidOrdem = '11111111-1111-1111-1111-111111111111';
    const uuidItem = '22222222-2222-2222-2222-222222222222';

    await service.gerarUrlPreAssinada({
      tipo_destino: TipoDestinoUpload.FOTO_INICIAL_ITEM,
      ordem_servico_id: uuidOrdem,
      item_ordem_servico_id: uuidItem,
      nome_arquivo: 'Foto Inicial.JPG',
      tipo_mime: 'image/jpeg',
    }, 'usuario-teste');

    expect(s3Mock.obterUrlPreAssinada).toHaveBeenCalledWith(
      expect.objectContaining({
        chave: expect.stringContaining(`ordens/${uuidOrdem}/itens/${uuidItem}/`),
        tipo_conteudo: 'image/jpeg',
      }),
    );
    expect(prismaMock.intencaoUpload.create).toHaveBeenCalled();
  });
});
