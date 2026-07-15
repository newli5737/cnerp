import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SequenceService {
  constructor(private readonly prisma: PrismaService) {}

  async next(companyId: string, docType: string, prefix: string): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await this.prisma.documentSequence.upsert({
      where: {
        companyId_docType_year: { companyId, docType, year },
      },
      create: { companyId, docType, year, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    const num = String(seq.lastNumber).padStart(5, '0');
    return `${prefix}${year}${num}`;
  }
}
