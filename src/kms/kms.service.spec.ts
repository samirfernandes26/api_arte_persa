import { KMSClient } from '@aws-sdk/client-kms';
import { KmsService } from './kms.service';

describe('KmsService', () => {
  const configServiceMock = {
    get: jest.fn((chave: string, valorPadrao?: unknown) => {
      if (chave === 'USE_KMS_ENCRYPTION') {
        return false;
      }

      if (chave === 'CRIPTOGRAFIA_CHAVE_LOCAL_BASE64') {
        return 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
      }

      if (chave === 'AWS_KMS_KEY_ID') {
        return undefined;
      }

      if (chave === 'NOME_APLICACAO') {
        return 'api-teste';
      }

      return valorPadrao;
    }),
    getOrThrow: jest.fn((chave: string) => {
      if (chave === 'CRIPTOGRAFIA_HASH_SEGREDO') {
        return 'segredo-hmac-local-super-seguro-1234567890';
      }

      throw new Error(`Chave inesperada: ${chave}`);
    }),
  };

  const kmsClientMock = {
    send: jest.fn(),
  };

  let service: KmsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new KmsService(
      configServiceMock as never,
      kmsClientMock as unknown as KMSClient,
    );
  });

  it('criptografa e descriptografa texto com envelope local', async () => {
    const cifrado = await service.encryptData('12345678900', {
      entidade: 'cliente',
      campo: 'documento',
    });

    expect(cifrado).toContain('kms-envelope-v1:');
    expect(cifrado).not.toContain('12345678900');

    const texto = await service.decryptData(cifrado);
    expect(texto).toBe('12345678900');
  });

  it('criptografa e descriptografa JSON mantendo compatibilidade de leitura', async () => {
    const valor = {
      documento: '12345678900',
      telefone: '11999999999',
    };

    const cifrado = await service.criptografarJson(valor, {
      entidade: 'ordem_servico',
      campo: 'snapshot_cliente',
    });
    const decifrado = await service.descriptografarJson<typeof valor>(cifrado);

    expect(cifrado).toHaveProperty('__kms_envelope_v1');
    expect(decifrado).toEqual(valor);
  });

  it('gera hash deterministico para suportar busca exata de documento', () => {
    const hash1 = service.gerarHashDeterministico('12345678900');
    const hash2 = service.gerarHashDeterministico('12345678900');

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });
});
