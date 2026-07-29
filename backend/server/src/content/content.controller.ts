import { Body, Controller, Get, Post } from '@nestjs/common';
import { ContentService } from './content.service';
import { CreateViralVideoDto } from './dto/create-viral-video.dto';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('videos')
  listViralVideos() {
    return this.contentService.findAll();
  }

  @Post('videos')
  createViralVideo(@Body() dto: CreateViralVideoDto) {
    return this.contentService.create(dto);
  }
}
