import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-admin-login',
  imports: [FormsModule],
  template: `
    <div class="admin-login">
      <form class="form-card" (ngSubmit)="submit()">
        <div class="brand" style="justify-content:center; margin-bottom:1.4rem;">
          <img src="assets/logo.svg" alt="foxugly" />
          <span><span class="fox">fox</span><span class="ugly">ugly</span></span>
        </div>
        <h2 style="text-align:center; margin-bottom:.3rem;">Espace admin</h2>
        <p style="text-align:center; color:var(--muted); margin-bottom:1.6rem; font-size:.92rem;">
          Connecte-toi pour gérer le contenu du site.
        </p>

        <div class="field">
          <label for="u">Identifiant</label>
          <input id="u" name="username" [(ngModel)]="username" autocomplete="username" required />
        </div>
        <div class="field">
          <label for="p">Mot de passe</label>
          <input id="p" name="password" type="password" [(ngModel)]="password"
                 autocomplete="current-password" required />
        </div>

        @if (error()) { <p style="color:#dc2626; font-size:.9rem; margin-bottom:1rem;">{{ error() }}</p> }

        <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center;"
                [disabled]="loading()">
          {{ loading() ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>
    </div>
  `,
  styles: [`
    .admin-login {
      min-height: 100vh; display: grid; place-items: center; padding: 2rem;
      background: linear-gradient(160deg, #1b1a30 0%, #2a2942 100%);
    }
    .admin-login .form-card { width: min(420px, 100%); }
  `],
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected username = '';
  protected password = '';
  protected loading = signal(false);
  protected error = signal('');

  submit() {
    this.error.set('');
    this.loading.set(true);
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigateByUrl('/admin/dashboard'),
      error: (e) => {
        this.error.set(e?.error?.detail ?? 'Connexion impossible. Réessaie.');
        this.loading.set(false);
      },
    });
  }
}
