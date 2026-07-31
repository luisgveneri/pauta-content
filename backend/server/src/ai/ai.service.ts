import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type InstagramPostSummary = {
  id: string;
  caption: string;
  mediaType: string;
  postedAt: string;
  engagementRate: number;
  views: number;
  reach: number;
  totalInteractions: number;
};

export type InstagramSegmentSummary = { segment: string; n: number; lift: number };

export type InstagramAccountAnalysisResult = {
  summary: string;
  patterns: { pattern: string; evidence: string; confidence: ConfidenceLevel }[];
  recommendations: { action: string; rationale: string; expectedImpact: string }[];
  bestPostingWindows: string[];
};

export type InstagramPostAnalysisResult = {
  verdict: string;
  hypotheses: { hypothesis: string; evidence: string; confidence: ConfidenceLevel }[];
  replicationSteps: string[];
};

type ProviderConfig = {
  name: string;
  envKey: string;
  baseURL: string;
  model: string;
  extraParams?: Record<string, unknown>;
};

// OpenAI-compatible chat-completions providers, cheapest/free-tier first. Same
// providers and fallback order as the n8n script generation workflow — Groq and
// Cerebras have generous free tiers, Gemini's OpenAI-compat layer is free within
// quota, and paid OpenAI is kept last as a fallback for whenever it has credit.
const PROVIDERS: ProviderConfig[] = [
  { name: 'groq', envKey: 'GROQ_API_KEY', baseURL: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  {
    name: 'cerebras',
    envKey: 'CEREBRAS_API_KEY',
    baseURL: 'https://api.cerebras.ai/v1',
    model: 'gpt-oss-120b',
    extraParams: { reasoning_effort: 'low' },
  },
  {
    name: 'gemini',
    envKey: 'GEMINI_API_KEY',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
    extraParams: { reasoning_effort: 'none' },
  },
  { name: 'openai', envKey: 'OPENAI_API_KEY', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
];

function getProviderOrder(): ProviderConfig[] {
  const raw = process.env.LLM_PROVIDER_ORDER;
  const names = raw
    ? raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : PROVIDERS.map((p) => p.name);
  return names.map((name) => PROVIDERS.find((p) => p.name === name)).filter((p): p is ProviderConfig => !!p);
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly clients = new Map<string, OpenAI>();

  private getClient(provider: ProviderConfig): OpenAI | null {
    const apiKey = process.env[provider.envKey];
    if (!apiKey || apiKey.trim().length === 0) return null;
    let client = this.clients.get(provider.name);
    if (!client) {
      client = new OpenAI({ apiKey, baseURL: provider.baseURL });
      this.clients.set(provider.name, client);
    }
    return client;
  }

  /** Tries each configured provider in order (Groq → Cerebras → Gemini → OpenAI by
   * default), falling through on missing key, error or empty response. */
  private async createChatCompletion(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    maxTokens: number,
    temperature = 0.7,
  ): Promise<{ content: string; model: string }> {
    const providers = getProviderOrder();
    const attempts: string[] = [];

    for (const provider of providers) {
      const client = this.getClient(provider);
      if (!client) {
        attempts.push(`[${provider.name}] sin API key configurada`);
        continue;
      }
      try {
        const completion = await client.chat.completions.create({
          model: provider.model,
          messages,
          max_tokens: maxTokens,
          temperature,
          ...(provider.extraParams ?? {}),
        } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming);
        const content = completion.choices[0]?.message?.content;
        if (content && content.trim().length > 0) return { content, model: `${provider.name}:${provider.model}` };
        attempts.push(`[${provider.name}] respuesta vacía`);
      } catch (error) {
        const message = (error as Error)?.message ?? String(error);
        attempts.push(`[${provider.name}] ${message}`);
        this.logger.warn(`Proveedor de IA "${provider.name}" falló: ${message}`);
      }
    }

    throw new BadGatewayException(`Todos los proveedores de IA fallaron: ${attempts.join(' | ')}`);
  }

  private parseJson<T>(content: string, fallback: T): T {
    try {
      const cleaned = content.trim().replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '');
      return { ...fallback, ...JSON.parse(cleaned) };
    } catch (error) {
      console.error('Error parsing AI response', error, content);
      return fallback;
    }
  }

  async generateIdeas(topic: string) {
    const prompt = `You are a social media expert. Generate 5 viral content ideas for short-form videos about: ${topic}.
Return a JSON object of the shape {"ideas": [{"hook": string, "description": string, "viralReason": string}]}.
Do not include any markdown formatting, just the raw JSON.`;

    const { content } = await this.createChatCompletion(
      [
        { role: 'system', content: 'You are a helpful assistant that outputs raw JSON, no markdown fences.' },
        { role: 'user', content: prompt },
      ],
      1500,
      0.8,
    );

    const parsed = this.parseJson<{ ideas: unknown[] }>(content, { ideas: [] });
    return parsed.ideas ?? [];
  }

  async analyzeInstagramAccount(input: {
    topPosts: InstagramPostSummary[];
    bottomPosts: InstagramPostSummary[];
    segments: Record<string, InstagramSegmentSummary[]>;
  }): Promise<{ payload: InstagramAccountAnalysisResult; model: string }> {
    const fallback: InstagramAccountAnalysisResult = {
      summary: '',
      patterns: [],
      recommendations: [],
      bestPostingWindows: [],
    };

    const prompt = `You are a social media performance analyst for a padel (racquet sport) content account on Instagram.
You are given the account's best- and worst-performing posts (by engagement rate = interactions / reach) and
performance segments broken down by media type, posting hour, day of week, caption length and hashtag count
(each segment has "lift" = its median engagement rate divided by the account-wide baseline, so lift > 1 means it
outperforms the baseline).

Compare the top and bottom posts to find concrete, evidence-based patterns — not generic social media advice.
Cite specific posts (by caption excerpt) or segments as evidence.

DATA:
${JSON.stringify(input)}

Return a JSON object with exactly these keys:
- "summary": one paragraph overview of what's working and what isn't.
- "patterns": array of { "pattern": string, "evidence": string, "confidence": "high"|"medium"|"low" }.
- "recommendations": array of { "action": string, "rationale": string, "expectedImpact": string }.
- "bestPostingWindows": array of strings describing the best day/hour combinations found in the data.
Do not include any markdown formatting, just the raw JSON.`;

    const { content, model } = await this.createChatCompletion(
      [
        { role: 'system', content: 'You are a data-driven social media analyst that outputs raw JSON, no markdown fences.' },
        { role: 'user', content: prompt },
      ],
      3000,
      0.7,
    );

    return { payload: this.parseJson(content, fallback), model };
  }

  async analyzeInstagramPost(input: {
    post: InstagramPostSummary;
    classification: 'over' | 'normal' | 'under';
    topPosts: InstagramPostSummary[];
    bottomPosts: InstagramPostSummary[];
  }): Promise<{ payload: InstagramPostAnalysisResult; model: string }> {
    const fallback: InstagramPostAnalysisResult = { verdict: '', hypotheses: [], replicationSteps: [] };

    const replicationInstruction =
      input.classification === 'over'
        ? `This post OUTPERFORMED the account baseline. Focus "replicationSteps" on concretely how to REPRODUCE this
success in future posts: what specific hook/format/topic/caption/timing choices to reuse, and how to systematize
them (e.g. a content template or checklist), grounded in what this post and the other top performers have in common.`
        : input.classification === 'under'
          ? `This post UNDERPERFORMED the account baseline. Focus "replicationSteps" on concretely how to CLOSE THE GAP
next time: specific changes to hook/format/topic/caption/timing, grounded in what the top performers did differently.`
          : `This post performed near the account baseline. Focus "replicationSteps" on specific changes that could push
it into over-performing territory next time, grounded in what the top performers did differently.`;

    const prompt = `You are a social media performance analyst for a padel (racquet sport) content account on Instagram.
Analyze this single post in the context of the account's other top and bottom performers.

POST TO ANALYZE (classification: ${input.classification}-performer):
${JSON.stringify(input.post)}

ACCOUNT'S TOP PERFORMERS (for comparison):
${JSON.stringify(input.topPosts)}

ACCOUNT'S BOTTOM PERFORMERS (for comparison):
${JSON.stringify(input.bottomPosts)}

${replicationInstruction}

Return a JSON object with exactly these keys:
- "verdict": one sentence stating how this post performed relative to the account baseline and why.
- "hypotheses": array of { "hypothesis": string, "evidence": string, "confidence": "high"|"medium"|"low" }
  explaining WHY this post performed the way it did, grounded in the caption/format/timing data given.
- "replicationSteps": array of concrete, specific strings per the instruction above — not generic social media advice.
Do not include any markdown formatting, just the raw JSON.`;

    const { content, model } = await this.createChatCompletion(
      [
        { role: 'system', content: 'You are a data-driven social media analyst that outputs raw JSON, no markdown fences.' },
        { role: 'user', content: prompt },
      ],
      2000,
      0.7,
    );

    return { payload: this.parseJson(content, fallback), model };
  }
}
