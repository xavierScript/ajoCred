import { Module } from '@nestjs/common';
import { CleanverseModule } from '../common/cleanverse/cleanverse.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from '../common/admin/admin.guard';

@Module({
  imports: [CleanverseModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
