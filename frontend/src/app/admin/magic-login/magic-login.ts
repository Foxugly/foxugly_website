import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-admin-magic-login',
  imports: [RouterLink],
  template: `
    <div class="admin-login">
      <div class="form-card" style="text-align:center;">
        <div class="brand" style="justify-content:center; margin-bottom:1.4rem;">
          <img src="assets/logo.svg" alt="foxugly" />
          <span><span class="fox">fox</span><span class="ugly">ugly</span></span>
        </div>
        @if (error()) {
          <h2 style="margin-bottom:.5rem;">Lien invalide</h2>
          <p style="color:var(--ink-soft); margin-bottom:1.4rem;">{{ error() }}</p>
          <a routerLink="/admin/login" class="btn btn-primary">Retour à la connexion</a>
        } @else {
          <p style="color:var(--ink-soft);">Connexion en cours…</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .admin-login { min-height: 100vh; display: grid; place-items: center; padding: 2rem;
      background: linear-gradient(160deg, #1b1a30 0%, #2a2942 100%); }
    .admin-login .form-card { width: min(420px, 100%); }
  `],
})
export class MagicLogin {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  protected error = signal('');

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.error.set('Aucun token fourni.');
      return;
    }
    this.auth.magicLogin(token).subscribe({
      next: () => this.router.navigateByUrl('/admin/dashboard'),
      error: (e) => this.error.set(e?.error?.detail ?? 'Ce lien est invalide ou expiré.'),
    });
  }
}
