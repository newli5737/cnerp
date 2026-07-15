import { Module } from '@nestjs/common';
import { ArApService } from './ar-ap.service';
import { ArApController } from './ar-ap.controller';

@Module({
  controllers: [ArApController],
  providers: [ArApService],
})
export class ArApModule {}
