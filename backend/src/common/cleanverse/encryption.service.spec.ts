import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  it('round-trips a plain object through encrypt/decrypt with a 32-byte key', async () => {
    const apiKey = Buffer.alloc(32, 7).toString('base64');
    const moduleRef = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: { get: () => apiKey },
        },
      ],
    }).compile();

    const service = moduleRef.get(EncryptionService);
    const payload = { chain: 'base', address: '0x123' };

    const ciphertext = service.encrypt(payload);
    expect(typeof ciphertext).toBe('string');
    expect(service.decrypt(ciphertext)).toEqual(payload);
  });

  it('throws when the decoded api-key is neither 16 nor 32 bytes', async () => {
    const apiKey = Buffer.alloc(10, 1).toString('base64');
    const moduleBuilder = Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: { get: () => apiKey },
        },
      ],
    });

    await expect(moduleBuilder.compile()).rejects.toThrow();
  });
});
