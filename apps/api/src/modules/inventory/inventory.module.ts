import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { SequenceService } from '../../common/prisma/sequence.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, SequenceService],
  exports: [InventoryService, SequenceService],
})
export class InventoryModule {}
