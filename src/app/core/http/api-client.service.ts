import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_ENV } from '../config/app-env.token';

type Query = Record<string, string | number | boolean | undefined | null>;

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  get<T>(path: string, query?: Query) {
    return this.http.get<T>(this.url(path), { params: this.toParams(query) });
  }

  post<T>(path: string, body: unknown, query?: Query) {
    return this.http.post<T>(this.url(path), body, { params: this.toParams(query) });
  }

  put<T>(path: string, body: unknown, query?: Query) {
    return this.http.put<T>(this.url(path), body, { params: this.toParams(query) });
  }

  delete<T>(path: string, query?: Query) {
    return this.http.delete<T>(this.url(path), { params: this.toParams(query) });
  }

  private url(path: string) {
    const base = this.env.apiBaseUrl ?? '';
    if (!base) return path;
    if (base.endsWith('/') && path.startsWith('/')) return base.slice(0, -1) + path;
    if (!base.endsWith('/') && !path.startsWith('/')) return base + '/' + path;
    return base + path;
  }

  private toParams(query?: Query) {
    let params = new HttpParams();
    if (!query) return params;
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      params = params.set(k, String(v));
    }
    return params;
  }
}

