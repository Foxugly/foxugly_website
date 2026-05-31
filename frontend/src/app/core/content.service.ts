import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';

import { API_BASE } from './api.config';
import {
  News, PageDetail, PageNav, Paginated, Partner, Project,
  SiteSettings, Testimonial,
} from './models';

/**
 * Point d'accès unique à l'API de contenu.
 * Lecture publique ; `withCredentials` pour préparer l'admin (session DRF).
 */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private http = inject(HttpClient);
  private opts = { withCredentials: true };

  /** Pages affichées dans la navigation (cachées une fois chargées). */
  private nav$?: Observable<PageNav[]>;
  /** Réglages globaux (cachés une fois chargés). */
  private settings$?: Observable<SiteSettings>;

  navPages(): Observable<PageNav[]> {
    if (!this.nav$) {
      this.nav$ = this.http
        .get<Paginated<PageNav>>(`${API_BASE}/pages/`, this.opts)
        .pipe(map(r => r.results.filter(p => p.show_in_nav)), shareReplay(1));
    }
    return this.nav$;
  }

  page(slug: string): Observable<PageDetail> {
    return this.http.get<PageDetail>(`${API_BASE}/pages/${slug}/`, this.opts);
  }

  settings(): Observable<SiteSettings> {
    if (!this.settings$) {
      this.settings$ = this.http
        .get<SiteSettings>(`${API_BASE}/settings/`, this.opts)
        .pipe(shareReplay(1));
    }
    return this.settings$;
  }

  news(limit?: number): Observable<News[]> {
    return this.list<News>('news').pipe(map(r => limit ? r.slice(0, limit) : r));
  }

  projects(sector?: string, limit?: number): Observable<Project[]> {
    let params = new HttpParams();
    if (sector) params = params.set('sector', sector);
    return this.list<Project>('projects', params)
      .pipe(map(r => limit ? r.slice(0, limit) : r));
  }

  partners(kind?: 'client' | 'association'): Observable<Partner[]> {
    let params = new HttpParams();
    if (kind) params = params.set('kind', kind);
    return this.list<Partner>('partners', params);
  }

  testimonials(limit?: number): Observable<Testimonial[]> {
    return this.list<Testimonial>('testimonials')
      .pipe(map(r => limit ? r.slice(0, limit) : r));
  }

  private list<T>(resource: string, params?: HttpParams): Observable<T[]> {
    return this.http
      .get<Paginated<T>>(`${API_BASE}/${resource}/`, { ...this.opts, params })
      .pipe(map(r => r.results ?? (r as unknown as T[])));
  }
}
