import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ContentService } from '../../core/content.service';

@Component({
  selector: 'app-footer',
  imports: [AsyncPipe, RouterLink],
  template: `
    @if (settings$ | async; as s) {
      <footer class="footer">
        <div class="wrap">
          <div class="footer-grid">
            <div>
              <a routerLink="/accueil" class="brand" style="margin-bottom:1rem;">
                <img src="assets/logo-white.svg" alt="foxugly" />
                <span><span class="fox" style="color:#fff;">fox</span><span class="ugly">ugly</span></span>
              </a>
              <p style="color:#9d95b0; font-size:.92rem; max-width:280px;">{{ s.footer_text }}</p>
            </div>

            <div>
              <h5>Cabinet</h5>
              @for (p of (pages$ | async); track p.slug) {
                <a [routerLink]="['/', p.slug]">{{ p.nav_label || p.title }}</a>
              }
            </div>

            <div>
              <h5>Ressources</h5>
              <a routerLink="/accueil" fragment="news">Actualités</a>
              <a routerLink="/agilite">Agilité</a>
              <a routerLink="/projets">Projets</a>
            </div>

            <div>
              <h5>Contact</h5>
              <a [href]="'mailto:' + s.contact_email">{{ s.contact_email }}</a>
              @if (s.linkedin_url) { <a [href]="s.linkedin_url" target="_blank" rel="noopener">LinkedIn</a> }
              <a routerLink="/admin">Espace admin</a>
            </div>
          </div>

          <div class="footer-bottom">
            <span>© {{ year }} {{ s.brand_name }}. Tous droits réservés.</span>
            <span>{{ s.tagline }}</span>
          </div>
        </div>
      </footer>
    }
  `,
})
export class Footer {
  private content = inject(ContentService);
  protected settings$ = this.content.settings();
  protected pages$ = this.content.navPages();
  protected year = 2026;
}
