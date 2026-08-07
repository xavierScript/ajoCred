import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { CleanverseModule } from './common/cleanverse/cleanverse.module';
import { ApassModule } from './apass/apass.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ValidatorModule } from './validator/validator.module';
import { FaucetModule } from './faucet/faucet.module';
import { EligibilityModule } from './eligibility/eligibility.module';
import { PoolModule } from './pool/pool.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CleanverseModule,
    ApassModule,
    TransactionsModule,
    ValidatorModule,
    FaucetModule,
    EligibilityModule,
    PoolModule,
  ],
})
export class AppModule {}
