import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from '../ai/ai.service';

@Controller('ideas')
export class IdeasController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate')
  async generate(@Body('topic') topic: string) {
    return this.aiService.generateIdeas(topic);
  }
}