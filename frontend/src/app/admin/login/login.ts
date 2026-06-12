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
          <label for="u">Email</label>
          <input id="u" name="email" type="email" [(ngModel)]="email" autocomplete="email" required />
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

        <div class="magic-sep"><span>ou</span></div>

        @if (magicSent()) {
          <p class="muted-note" style="text-align:center;">
            Si un compte staff correspond, un lien de connexion vient d'être envoyé par email.
          </p>
        } @else {
          <div class="field">
            <label for="me">Lien de connexion par email</label>
            <input id="me" name="magicEmail" type="email" [(ngModel)]="magicEmail"
                   autocomplete="email" placeholder="vous@foxugly.com" />
          </div>
          <button type="button" class="btn btn-outline" style="width:100%; justify-content:center;"
                  [disabled]="magicLoading()" (click)="requestMagic()">
            {{ magicLoading() ? 'Envoi…' : 'Recevoir un lien magique' }}
          </button>
        }
      </form>
    </div>
  `,
  styles: [`
    .admin-login { min-height: 100vh; display: grid; place-items: center; padding: 2rem;
      background: linear-gradient(160deg, #1b1a30 0%, #2a2942 100%); }
    .admin-login .form-card { width: min(420px, 100%); }
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
        this.error.set(e?.error?.detail ?? 'Connexion impossible. Réessaie.');
        this.loading.set(false);
      },
    });
  }

  requestMagic() {
    if (!this.magicEmail) { this.error.set('Saisis ton email.'); return; }
    this.error.set('');
    this.magicLoading.set(true);
    this.auth.requestMagicLink(this.magicEmail).subscribe({
      next: () => { this.magicSent.set(true); this.magicLoading.set(false); },
      error: () => { this.magicSent.set(true); this.magicLoading.set(false); },  // même UX (anti-énumération)
    });
  }
}
