import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE } from './api.config';
import {
  Block, News, PageDetail, PageNav, Paginated, Partner, Project,
  SiteSettings, Testimonial,
} from './models';

/** Nom de ressource de collection côté API. */
export type CollectionName = 'news' | 'projects' | 'partners' | 'testimonials';

/**
 * Opérations d'écriture de l'admin (session DRF + CSRF gérés globalement).
 * Requêtes non mises en cache : on veut toujours l'état frais.
 */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private http = inject(HttpClient);
  private opts = { withCredentials: true };

  /* ---- Pages ---- */
  pages(): Observable<PageNav[]> {
    return this.http
      .get<Paginated<PageNav>>(`${API_BASE}/pages/`, this.opts)
      .pipe(map(r => r.results));
  }
  page(slug: string): Observable<PageDetail> {
    return this.http.get<PageDetail>(`${API_BASE}/pages/${slug}/`, this.opts);
  }
  createPage(data: Partial<PageNav>): Observable<PageDetail> {
    return this.http.post<PageDetail>(`${API_BASE}/pages/`, data, this.opts);
  }
  updatePage(slug: string, data: Partial<PageNav>): Observable<PageDetail> {
    return this.http.patch<PageDetail>(`${API_BASE}/pages/${slug}/`, data, this.opts);
  }
  deletePage(slug: string): Observable<unknown> {
    return this.http.delete(`${API_BASE}/pages/${slug}/`, this.opts);
  }

  /* ---- Blocs ---- */
  blocks(slug: string): Observable<Block[]> {
    return this.http
      .get<Block[] | Paginated<Block>>(`${API_BASE}/blocks/`, { ...this.opts, params: { page: slug } })
      .pipe(map(r => (Array.isArray(r) ? r : r.results)));
  }
  createBlock(data: Partial<Block>): Observable<Block> {
    return this.http.post<Block>(`${API_BASE}/blocks/`, data, this.opts);
  }
  updateBlock(id: number, data: Partial<Block>): Observable<Block> {
    return this.http.patch<Block>(`${API_BASE}/blocks/${id}/`, data, this.opts);
  }
  deleteBlock(id: number): Observable<unknown> {
    return this.http.delete(`${API_BASE}/blocks/${id}/`, this.opts);
  }
  reorderBlocks(items: { id: number; order: number }[]): Observable<unknown> {
    return this.http.post(`${API_BASE}/blocks/reorder/`, items, this.opts);
  }

  /* ---- Collections (générique) ---- */
  list<T>(resource: CollectionName): Observable<T[]> {
    return this.http
      .get<Paginated<T>>(`${API_BASE}/${resource}/`, this.opts)
      .pipe(map(r => r.results));
  }
  create<T>(resource: CollectionName, data: Partial<T> | FormData): Observable<T> {
    return this.http.post<T>(`${API_BASE}/${resource}/`, data, this.opts);
  }
  update<T>(resource: CollectionName, id: number, data: Partial<T> | FormData): Observable<T> {
    return this.http.patch<T>(`${API_BASE}/${resource}/${id}/`, data, this.opts);
  }
  remove(resource: CollectionName, id: number): Observable<unknown> {
    return this.http.delete(`${API_BASE}/${resource}/${id}/`, this.opts);
  }
  /** Supprime un champ image via l'action dédiée (ex : clear_logo). */
  clearImage<T>(resource: CollectionName, id: number, field: string): Observable<T> {
    return this.http.post<T>(`${API_BASE}/${resource}/${id}/clear_${field}/`, {}, this.opts);
  }

  /* ---- Réglages ---- */
  settings(): Observable<SiteSettings> {
    return this.http.get<SiteSettings>(`${API_BASE}/settings/`, this.opts);
  }
  updateSettings(data: Partial<SiteSettings>): Observable<SiteSettings> {
    return this.http.put<SiteSettings>(`${API_BASE}/settings/`, data, this.opts);
  }
}
