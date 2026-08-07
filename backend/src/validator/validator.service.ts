import { Injectable } from '@nestjs/common';
import { CleanverseClientService } from '../common/cleanverse/cleanverse-client.service';

export interface VerifyResult {
  chain: string;
  contract_address: string;
  user_address: string;
  valid: boolean;
}

@Injectable()
export class ValidatorService {
  constructor(private readonly cleanverse: CleanverseClientService) {}

  async verify(
    chain: string,
    contractAddress: string,
    userAddress: string,
  ): Promise<VerifyResult> {
    return this.cleanverse.postPlain<VerifyResult>('/validator/verify', {
      chain,
      contract_address: contractAddress,
      user_address: userAddress,
    });
  }
}
