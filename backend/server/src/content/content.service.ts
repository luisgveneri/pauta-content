import { Injectable } from '@nestjs/common';
import { CreateViralVideoDto } from './dto/create-viral-video.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.viralVideo.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
  }

  create(organizationId: string, dto: CreateViralVideoDto) {
    return this.prisma.viralVideo.create({ data: { ...dto, organizationId } });
  }
}
