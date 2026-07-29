import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_ENV } from '../config/app-env.token';

export interface Idea {
  hook: string;
  description: string;
  viralReason: string;
}

@Injectable({
  providedIn: 'root'
})
export class IdeasService {
  private http = inject(HttpClient);
  private readonly env = inject(APP_ENV);
  private apiUrl = `${this.env.apiBaseUrl}/ideas`;

  generateIdeas(topic: string): Observable<Idea[]> {
    return this.http.post<Idea[]>(`${this.apiUrl}/generate`, { topic });
  }
}
