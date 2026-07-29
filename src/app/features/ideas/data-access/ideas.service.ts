import { Injectable } from '@angular/core';
import { Idea } from '../domain/idea.model';

export type AiIdeasResponse = {
  topic: string;
  ideas: Idea[];
};

@Injectable({ providedIn: 'root' })
export class IdeasService {
  async generateIdeas(topic: string): Promise<AiIdeasResponse> {
    await new Promise((r) => setTimeout(r, 650));
    const base = topic.trim() || 'content';

    const ideas: Idea[] = [
      {
        id: `i_${Date.now()}_1`,
        topic: base,
        hook: `Stop doing THIS in ${base}…`,
        description: `Short, punchy breakdown of the most common mistake people make in ${base} and a simple fix.`,
        whyViral:
          'Relatable pain point + quick win. Viewers recognize themselves instantly and share it with friends who do the same thing.',
      },
      {
        id: `i_${Date.now()}_2`,
        topic: base,
        hook: `3 pro-level ${base} habits you can steal today`,
        description: `Carousel or short-form video showing three specific habits used by advanced players/creators in ${base}.`,
        whyViral:
          '“Steal from the pros” framing makes people feel like insiders and drives saves for later reference.',
      },
      {
        id: `i_${Date.now()}_3`,
        topic: base,
        hook: `I tried this ${base} tip for 7 days — here’s what changed`,
        description: `Mini case study where you test one widely shared tip in ${base} and honestly report results.`,
        whyViral:
          'Story-driven, authentic experiment with a clear before/after arc keeps watch time high and sparks comments.',
      },
      {
        id: `i_${Date.now()}_4`,
        topic: base,
        hook: `${base} myths that are secretly holding you back`,
        description: `Debunk 3–5 popular myths in ${base} with simple visuals and examples.`,
        whyViral:
          'Contrarian angle (“what you’ve been told is wrong”) triggers curiosity, comments, and stitch/duet responses.',
      },
      {
        id: `i_${Date.now()}_5`,
        topic: base,
        hook: `Beginner vs. intermediate vs. advanced in ${base}`,
        description: `Side-by-side comparison of how beginners, intermediates, and advanced people approach the same situation in ${base}.`,
        whyViral:
          'Viewers identify their own level, tag friends, and argue in the comments about which category they’re in.',
      },
    ];

    return { topic: base, ideas };
  }
}

