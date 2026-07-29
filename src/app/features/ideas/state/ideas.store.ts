import { Injectable, computed, inject, signal } from '@angular/core';
import { IdeasService } from '../data-access/ideas.service';
import { Idea } from '../domain/idea.model';

type IdeasState = {
  topic: string;
  loading: boolean;
  ideas: Idea[];
};

@Injectable({ providedIn: 'root' })
export class IdeasStore {
  private readonly ideasService = inject(IdeasService);

  private readonly _state = signal<IdeasState>({
    topic: 'padel',
    loading: true,
    ideas: [],
  });

  readonly topic = computed(() => this._state().topic);
  readonly loading = computed(() => this._state().loading);
  readonly ideas = computed(() => this._state().ideas);

  constructor() {
    this._state.update((s) => ({ ...s, loading: false }));
  }

  setTopic(topic: string) {
    this._state.update((s) => ({ ...s, topic }));
  }

  async generateForCurrentTopic() {
    this._state.update((s) => ({ ...s, loading: true }));
    const { topic, ideas } = await this.ideasService.generateIdeas(this._state().topic);
    this._state.set({
      topic,
      loading: false,
      ideas,
    });
  }
}

