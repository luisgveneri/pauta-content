import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private openai?: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async generateIdeas(topic: string) {
    if (!this.openai) {
      throw new Error('OPENAI_API_KEY no está definido. Configura el env var OPENAI_API_KEY.');
    }

    const prompt = `You are a social media expert. Generate 5 viral content ideas for short-form videos about: ${topic}.
    Return a JSON array where each object has: "hook", "description", and "viralReason".
    Do not include any markdown formatting, just the raw JSON.`;

    const completion = await this.openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a helpful assistant that outputs JSON.' },
        { role: 'user', content: prompt }
      ],
      model: 'gpt-3.5-turbo', // Puedes cambiar a gpt-4 si tienes acceso
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    // Parseamos la respuesta, asumiendo que el modelo devuelve un objeto con una clave o directamente el array
    // Ajustamos para devolver siempre un array
    try {
      const parsed = JSON.parse(content || '{}');
      // A veces la IA devuelve { "ideas": [...] } o directamente [...]
      return parsed.ideas || parsed || [];
    } catch (error) {
      console.error('Error parsing AI response', error);
      return [];
    }
  }
}
