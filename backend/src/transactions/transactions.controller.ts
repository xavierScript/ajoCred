import { Controller, Get, Param, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';

const DEFAULT_CHAIN = 'base';

@Controller('api/transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get(':address')
  async query(
    @Param('address') address: string,
    @Query('chain') chain?: string,
    @Query('symbol') symbol?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.transactionsService.query({
      chain: chain ?? DEFAULT_CHAIN,
      address,
      symbol,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }
}
