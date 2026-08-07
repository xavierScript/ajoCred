import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Implements Cleanverse's exact encryption spec for mutation endpoints:
 * AES/CBC/PKCS5Padding, fixed IV of 16 zero bytes, key = Base64-decoded api-key.
 *
 * The AES variant (256 vs 128) is derived from the decoded key length rather than
 * hardcoded, since the docs only say "AES" without specifying key size.
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly iv = Buffer.alloc(16, 0); // fixed 16 zero bytes per Cleanverse spec
  private readonly algorithm: 'aes-256-cbc' | 'aes-128-cbc';

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('cleanverse.apiKey');
    if (!apiKey) {
      throw new Error('Missing CLEANVERSE_API_KEY configuration');
    }
    this.key = Buffer.from(apiKey, 'base64');

    if (this.key.length === 32) {
      this.algorithm = 'aes-256-cbc';
    } else if (this.key.length === 16) {
      this.algorithm = 'aes-128-cbc';
    } else {
      throw new Error(
        `Unexpected decoded CLEANVERSE_API_KEY length: ${this.key.length} bytes (expected 16 or 32)`,
      );
    }
  }

  encrypt(plainObj: unknown): string {
    const json = JSON.stringify(plainObj);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
    const encrypted = Buffer.concat([
      cipher.update(json, 'utf8'),
      cipher.final(),
    ]);
    return encrypted.toString('base64');
  }

  decrypt<T = unknown>(base64Ciphertext: string): T {
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(base64Ciphertext, 'base64')),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString('utf8')) as T;
  }
}
