import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ContentService } from '../../core/content.service';

@Component({
  selector: 'app-footer',
  imports: [AsyncPipe, RouterLink],
  template: `
    @if (settings$ | async; as s) {
      <footer class="footer footer-slim">
        <div class="wrap footer-inner">
          <a routerLink="/accueil" class="brand">
            <img src="assets/logo-white.svg" alt="foxugly" />
            <span><span class="fox" style="color:#fff;">fox</span><span class="ugly">ugly</span></span>
          </a>
          <nav class="footer-links">
            @for (p of (pages$ | async); track p.slug) {
              <a [routerLink]="['/', p.slug]">{{ p.nav_label || p.title }}</a>
            }
            <a routerLink="/contact">Me contacter</a>
            <a routerLink="/admin">Admin</a>
          </nav>
        </div>
        <div class="wrap footer-bottom">
          <span>© {{ year }} {{ s.brand_name }}. Tous droits réservés.</span>
          <span>{{ s.tagline }}</span>
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
