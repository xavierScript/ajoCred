import { Injectable } from '@nestjs/common';
import { CleanverseClientService } from '../common/cleanverse/cleanverse-client.service';

interface WalletInfo {
  address: string;
  chain: string;
}

interface GenerateApassParams {
  customerId: string;
  wallet: WalletInfo;
  expirationTime: number;
  kycSource?: string;
  kycId?: string;
  subTier?: number;
  subGroup?: string;
  override?: boolean;
}

export interface QueryApassData {
  cvRecordId: string;
  subTier: number;
  status: number;
  tier: string;
  expirationTime: number;
  subGroup: string;
  currentKycHash: string;
  group: string;
  countries: string[];
}

@Injectable()
export class ApassService {
  constructor(private readonly cleanverse: CleanverseClientService) {}

  async generate(params: GenerateApassParams) {
    return this.cleanverse.postEncrypted('/generate_apass', params);
  }

  async query(chain: string, address: string): Promise<QueryApassData> {
    return this.cleanverse.postPlain<QueryApassData>('/query_apass', {
      chain,
      address,
    });
  }
}
