import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="admin">
      <aside class="admin-sidebar">
        <a routerLink="/accueil" class="brand" style="margin-bottom:1.6rem;">
          <img src="assets/logo-white.svg" alt="foxugly" />
          <span><span class="fox" style="color:#fff;">fox</span><span class="ugly">ugly</span></span>
        </a>

        <nav class="admin-nav">
          <span class="admin-nav-label">Contenu</span>
          <a routerLink="/admin/dashboard" routerLinkActive="active">Tableau de bord</a>
          <a routerLink="/admin/pages" routerLinkActive="active">Pages &amp; blocs</a>

          <span class="admin-nav-label">Collections</span>
          <a routerLink="/admin/collections/news" routerLinkActive="active">Actualités</a>
          <a routerLink="/admin/collections/projects" routerLinkActive="active">Projets</a>
          <a routerLink="/admin/collections/partners" routerLinkActive="active">Partenaires</a>
          <a routerLink="/admin/collections/testimonials" routerLinkActive="active">Témoignages</a>

          <span class="admin-nav-label">Site</span>
          <a routerLink="/admin/settings" routerLinkActive="active">Réglages</a>
        </nav>

        <div class="admin-user">
          <span>{{ auth.user()?.username }}</span>
          <button type="button" class="btn-link" (click)="logout()">Se déconnecter</button>
        </div>
      </aside>

      <main class="admin-main">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminShell {
  protected auth = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/admin/login'));
  }
}
