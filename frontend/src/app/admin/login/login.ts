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
        <div class="brand brand-center">
          <img src="assets/logo.svg" alt="" aria-hidden="true" />
          <span><span class="fox">fox</span><span class="ugly">ugly</span></span>
        </div>
        <h1 class="login-title">Connexion</h1>

        <div class="field">
          <label for="u">Adresse e-mail</label>
          <input id="u" name="email" type="email" [(ngModel)]="email" autocomplete="email" required />
        </div>
        <div class="field">
          <label for="p">Mot de passe</label>
          <div class="password-row">
            <input id="p" name="password" [type]="showPassword() ? 'text' : 'password'"
                   [(ngModel)]="password" autocomplete="current-password" required />
            <button type="button" class="password-toggle" (click)="showPassword.set(!showPassword())"
                    [attr.aria-pressed]="showPassword()">
              {{ showPassword() ? 'Masquer' : 'Afficher' }}
              <span class="sr-only"> le mot de passe</span>
            </button>
          </div>
        </div>

        @if (error()) { <p class="login-error" role="alert">{{ error() }}</p> }

        <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
          {{ loading() ? 'Connexion…' : 'Se connecter' }}
        </button>

        <div class="magic-sep"><span>ou</span></div>

        @if (magicSent()) {
          <p class="muted-note login-sent" role="status">
            Si un compte staff correspond, un lien de connexion vient d'être envoyé par e-mail.
          </p>
        } @else {
          <div class="field">
            <label for="me">Adresse e-mail pour le lien de connexion</label>
            <input id="me" name="magicEmail" type="email" [(ngModel)]="magicEmail"
                   autocomplete="email" />
          </div>
          <button type="button" class="btn btn-outline btn-block"
                  [disabled]="magicLoading()" (click)="requestMagic()">
            {{ magicLoading() ? 'Envoi…' : 'Recevoir un lien de connexion' }}
          </button>
        }
      </form>
    </div>
  `,
  styles: [`
    .admin-login { min-height: 100vh; display: grid; place-items: center; padding: 2rem;
      background: linear-gradient(160deg, #1b1a30 0%, #2a2942 100%); }
    .admin-login .form-card { width: min(420px, 100%); }
    .brand-center { justify-content: center; margin-bottom: 1.4rem; }
    .login-title { text-align: center; margin-bottom: 1.6rem; }
    .login-error { color: #dc2626; font-size: .9rem; margin-bottom: 1rem; }
    .login-sent { text-align: center; }
    .btn-block { width: 100%; justify-content: center; }
    .password-row { display: flex; gap: .5rem; align-items: stretch; }
    .password-row input { flex: 1; min-width: 0; }
    .password-toggle { border: 1px solid var(--line); background: #fff; color: var(--ink);
      border-radius: var(--radius-sm); padding: 0 .9rem; font: inherit; font-size: .85rem; cursor: pointer; }
    .password-toggle:hover { border-color: var(--ink); }
    .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden;
      clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    .magic-sep { display: flex; align-items: center; gap: .8rem; color: var(--muted);
      font-size: .8rem; margin: 1.3rem 0; }
    .magic-sep::before, .magic-sep::after { content: ""; flex: 1; height: 1px; background: var(--line); }
  `],
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected email = '';
  protected password = '';
  protected loading = signal(false);
  protected showPassword = signal(false);
  protected error = signal('');

  protected magicEmail = '';
  protected magicLoading = signal(false);
  protected magicSent = signal(false);

  submit() {
    this.error.set('');
    this.loading.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigateByUrl('/admin/dashboard'),
      error: (e) => {
        // Texte selon le code HTTP, jamais le `detail` brut du backend.
        const status = e?.status;
        this.error.set(
          status === 429
            ? 'Trop de tentatives. Réessayez dans quelques minutes.'
            : status === 400 || status === 401 || status === 403
              ? 'Adresse e-mail ou mot de passe incorrect.'
              : 'Connexion impossible. Réessayez plus tard.',
        );
        this.loading.set(false);
      },
    });
  }

  requestMagic() {
    if (!this.magicEmail) { this.error.set('Saisissez votre adresse e-mail.'); return; }
    this.error.set('');
    this.magicLoading.set(true);
    this.auth.requestMagicLink(this.magicEmail).subscribe({
      next: () => { this.magicSent.set(true); this.magicLoading.set(false); },
      error: () => { this.magicSent.set(true); this.magicLoading.set(false); },  // même UX (anti-énumération)
    });
  }
}
