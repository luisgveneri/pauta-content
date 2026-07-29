import { Injectable } from '@nestjs/common';
import { CreateViralVideoDto } from './dto/create-viral-video.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.viralVideo.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateViralVideoDto) {
    return this.prisma.viralVideo.create({ data: dto });
  }
}
