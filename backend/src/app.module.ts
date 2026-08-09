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
import { CooperativeModule } from './cooperative/cooperative.module';
import { AdminModule } from './admin/admin.module';
import { RampModule } from './ramp/ramp.module';

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
    CooperativeModule,
    AdminModule,
    RampModule,
  ],
})
export class AppModule {}
