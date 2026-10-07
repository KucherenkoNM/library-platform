import { Module } from '@nestjs/common';
import { BranchesRepository } from './branches.repository.js';

@Module({
  providers: [BranchesRepository],
  exports: [BranchesRepository],
})
export class BranchesModule {}
