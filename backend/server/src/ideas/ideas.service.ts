import { Injectable } from '@nestjs/common';
import { GenerateIdeasDto } from './dto/generate-ideas.dto';

@Injectable()
export class IdeasService {
  async generateIdeas(dto: GenerateIdeasDto) {
    // Placeholder for future AI integration:
    // - Call external AI API or internal model host
    // - Map response into Idea entities
    const topic = dto.topic.trim() || 'content';
    const ideas = [
      {
        hook: `Stop doing THIS in ${topic}…`,
        description: `Short, punchy breakdown of the most common mistake people make in ${topic} and a simple fix.`,
        whyViral:
          'Relatable pain point + quick win. Viewers recognize themselves instantly and share it with friends who do the same thing.',
      },
      {
        hook: `3 pro-level ${topic} habits you can steal today`,
        description: `Carousel or short-form video showing three specific habits used by advanced players/creators in ${topic}.`,
        whyViral:
          '“Steal from the pros” framing makes people feel like insiders and drives saves for later reference.',
      },
      {
        hook: `I tried this ${topic} tip for 7 days — here’s what changed`,
        description: `Mini case study where you test one widely shared tip in ${topic} and honestly report results.`,
        whyViral:
          'Story-driven, authentic experiment with a clear before/after arc keeps watch time high and sparks comments.',
      },
      {
        hook: `${topic} myths that are secretly holding you back`,
        description: `Debunk 3–5 popular myths in ${topic} with simple visuals and examples.`,
        whyViral:
          'Contrarian angle (“what you’ve been told is wrong”) triggers curiosity, comments, and stitch/duet responses.',
      },
      {
        hook: `Beginner vs. intermediate vs. advanced in ${topic}`,
        description: `Side-by-side comparison of how beginners, intermediates, and advanced people approach the same situation in ${topic}.`,
        whyViral:
          'Viewers identify their own level, tag friends, and argue in the comments about which category they’re in.',
      },
    ];

    return {
      topic,
      ideas,
    };
  }
}
