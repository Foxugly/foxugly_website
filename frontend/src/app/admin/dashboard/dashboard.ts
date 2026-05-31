import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AdminApiService } from '../../core/admin-api.service';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink],
  template: `
    <div class="admin-head">
      <div>
        <h1>Tableau de bord</h1>
        <p class="sub">Vue d'ensemble du contenu du site.</p>
      </div>
      <a routerLink="/accueil" class="btn btn-outline btn-sm" target="_blank">Voir le site ↗</a>
    </div>

    <div class="tiles">
      <a routerLink="/admin/pages" class="tile">
        <div class="tile-num">{{ counts().pages }}</div>
        <div class="tile-lbl">Pages</div>
      </a>
      <a routerLink="/admin/collections/news" class="tile">
        <div class="tile-num">{{ counts().news }}</div>
        <div class="tile-lbl">Actualités</div>
      </a>
      <a routerLink="/admin/collections/projects" class="tile">
        <div class="tile-num">{{ counts().projects }}</div>
        <div class="tile-lbl">Projets</div>
      </a>
      <a routerLink="/admin/collections/partners" class="tile">
        <div class="tile-num">{{ counts().partners }}</div>
        <div class="tile-lbl">Partenaires</div>
      </a>
      <a routerLink="/admin/collections/testimonials" class="tile">
        <div class="tile-num">{{ counts().testimonials }}</div>
        <div class="tile-lbl">Témoignages</div>
      </a>
    </div>
  `,
})
export class Dashboard {
  private api = inject(AdminApiService);
  protected counts = signal({ pages: 0, news: 0, projects: 0, partners: 0, testimonials: 0 });

  constructor() {
    forkJoin({
      pages: this.api.pages(),
      news: this.api.list('news'),
      projects: this.api.list('projects'),
      partners: this.api.list('partners'),
      testimonials: this.api.list('testimonials'),
    }).subscribe(r => this.counts.set({
      pages: r.pages.length, news: r.news.length, projects: r.projects.length,
      partners: r.partners.length, testimonials: r.testimonials.length,
    }));
  }
}
