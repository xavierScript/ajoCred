import { Injectable } from '@nestjs/common';
import { CleanverseClientService } from '../common/cleanverse/cleanverse-client.service';

const STATUS_ACTIVE = '1';
const STATUS_FROZEN = '2';

@Injectable()
export class AdminService {
  constructor(private readonly cleanverse: CleanverseClientService) {}

  /**
   * Freeze a user's A-Pass on Cleanverse. Wraps the `update_status` encrypted endpoint.
   * `blacklistReason` is optional and defaults to "admin_freeze" for auditability.
   */
  async freeze(
    address: string,
    chain = 'base',
    reason = 'admin_freeze',
  ): Promise<unknown> {
    return this.cleanverse.postEncrypted('/update_status', {
      status: STATUS_FROZEN,
      blacklistReason: reason,
      wallet: { chain, address },
    });
  }

  /**
   * Restore a user's A-Pass status to active.
   */
  async unfreeze(address: string, chain = 'base'): Promise<unknown> {
    return this.cleanverse.postEncrypted('/update_status', {
      status: STATUS_ACTIVE,
      wallet: { chain, address },
    });
  }
}
