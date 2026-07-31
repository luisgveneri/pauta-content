import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentOrg } from '../auth/current-org.decorator';
import { ContentService } from './content.service';
import { CreateViralVideoDto } from './dto/create-viral-video.dto';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('videos')
  listViralVideos(@CurrentOrg() organizationId: string) {
    return this.contentService.findAll(organizationId);
  }

  @Post('videos')
  createViralVideo(@CurrentOrg() organizationId: string, @Body() dto: CreateViralVideoDto) {
    return this.contentService.create(organizationId, dto);
  }
}
