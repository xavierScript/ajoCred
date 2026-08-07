import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EncryptionService } from './encryption.service';

interface CleanverseResponse<T = unknown> {
  code: string;
  message?: string;
  data?: T;
}

/**
 * Central HTTP client for Cleanverse's Cooperate API.
 * Every module talks to Cleanverse through this service instead of calling fetch() directly.
 */
@Injectable()
export class CleanverseClientService {
  private readonly baseUrl: string;
  private readonly apiId: string;

  constructor(
    private readonly config: ConfigService,
    private readonly encryption: EncryptionService,
  ) {
    const baseUrl = this.config.get<string>('cleanverse.baseUrl');
    const apiId = this.config.get<string>('cleanverse.apiId');
    if (!baseUrl || !apiId) {
      throw new Error(
        'Missing CLEANVERSE_BASE_URL or CLEANVERSE_API_ID configuration',
      );
    }
    this.baseUrl = baseUrl;
    this.apiId = apiId;
  }

  /** For endpoints requiring plain JSON bodies (reads, e.g. query_apass, query_txs). */
  async postPlain<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.send<T>(path, body);
  }

  /** For endpoints requiring AES-encrypted bodies (mutations, e.g. generate_apass, validator/register). */
  async postEncrypted<T = unknown>(path: string, body: unknown): Promise<T> {
    const ciphertext = this.encryption.encrypt(body);
    return this.send<T>(path, { data: ciphertext });
  }

  private async send<T>(path: string, body: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-id': this.apiId,
          'X-Request-ID': crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new HttpException(
        'Cleanverse service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (response.status === 403) {
      throw new HttpException(
        'Cleanverse authentication failed (invalid api-id)',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const result = (await response.json()) as CleanverseResponse<T>;

    if (result.code !== '0000') {
      throw new HttpException(
        result.message ?? `Cleanverse request failed with code ${result.code}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return result.data as T;
  }
}
