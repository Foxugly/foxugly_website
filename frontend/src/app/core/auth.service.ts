import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { API_BASE } from './api.config';

export interface AuthUser {
  is_authenticated: boolean;
  username: string | null;
  is_staff: boolean;
}

/** Gère la session admin (login/logout) via les endpoints DRF /api/auth/. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private opts = { withCredentials: true };

  private _user = signal<AuthUser | null>(null);
  readonly user = this._user.asReadonly();
  readonly isAdmin = computed(() => !!this._user()?.is_staff);
  /** undefined tant que l'état n'a pas été chargé. */
  readonly loaded = computed(() => this._user() !== null);

  /** À appeler au démarrage : pose le cookie CSRF et lit l'état de session. */
  me(): Observable<AuthUser> {
    return this.http
      .get<AuthUser>(`${API_BASE}/auth/me/`, this.opts)
      .pipe(tap(u => this._user.set(u)));
  }

  login(username: string, password: string): Observable<AuthUser> {
    return this.http
      .post<AuthUser>(`${API_BASE}/auth/login/`, { username, password }, this.opts)
      .pipe(tap(u => this._user.set(u)));
  }

  logout(): Observable<unknown> {
    return this.http
      .post(`${API_BASE}/auth/logout/`, {}, this.opts)
      .pipe(tap(() => this._user.set({ is_authenticated: false, username: null, is_staff: false })));
  }
}
