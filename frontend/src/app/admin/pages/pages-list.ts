import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AdminApiService } from '../../core/admin-api.service';
import { PageNav } from '../../core/models';

@Component({
  selector: 'app-admin-pages-list',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="admin-head">
      <div>
        <h1>Pages &amp; blocs</h1>
        <p class="sub">Chaque page est une liste de blocs ordonnés. Clique pour éditer ses blocs.</p>
      </div>
      <button class="btn btn-primary btn-sm" (click)="openNew()">+ Nouvelle page</button>
    </div>

    <table class="admin-table">
      <thead>
        <tr><th>Titre</th><th>Slug</th><th>Menu</th><th>Publiée</th><th></th></tr>
      </thead>
      <tbody>
        @for (p of pages(); track p.id) {
          <tr>
            <td><strong>{{ p.nav_label || p.title }}</strong></td>
            <td><code>{{ p.slug }}</code></td>
            <td>
              <span class="badge" [class.on]="p.show_in_nav" [class.off]="!p.show_in_nav">
                {{ p.show_in_nav ? 'Visible' : 'Masquée' }}
              </span>
            </td>
            <td>
              <button class="badge" [class.on]="p.is_published" [class.off]="!p.is_published"
                      (click)="togglePublished(p)" style="border:0; cursor:pointer;">
                {{ p.is_published ? 'Publiée' : 'Brouillon' }}
              </button>
            </td>
            <td class="row-actions">
              <a [routerLink]="['/admin/pages', p.slug]" class="btn btn-outline btn-sm">Éditer les blocs</a>
              <button class="btn btn-danger btn-sm" (click)="remove(p)">Suppr.</button>
            </td>
          </tr>
        }
      </tbody>
    </table>

    @if (showNew()) {
      <div class="overlay" (click)="showNew.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Nouvelle page</h3>
          <div class="form-grid cols-2">
            <div class="field"><label>Titre</label><input [(ngModel)]="draft.title" /></div>
            <div class="field"><label>Slug (URL)</label><input [(ngModel)]="draft.slug" placeholder="ma-page" /></div>
          </div>
          <div class="field"><label>Libellé menu</label><input [(ngModel)]="draft.nav_label" /></div>
          <div class="switch-row">
            <input type="checkbox" id="np" [(ngModel)]="draft.is_published" />
            <label for="np">Publier immédiatement</label>
          </div>
          @if (error()) { <p style="color:#dc2626; margin-top:1rem;">{{ error() }}</p> }
          <div class="modal-actions">
            <button class="btn btn-outline btn-sm" (click)="showNew.set(false)">Annuler</button>
            <button class="btn btn-primary btn-sm" (click)="create()">Créer</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PagesList {
  private api = inject(AdminApiService);
  protected pages = signal<PageNav[]>([]);
  protected showNew = signal(false);
  protected error = signal('');
  protected draft: Partial<PageNav> = {};

  constructor() { this.load(); }

  private load() { this.api.pages().subscribe(p => this.pages.set(p)); }

  togglePublished(p: PageNav) {
    this.api.updatePage(p.slug, { is_published: !p.is_published })
      .subscribe(() => this.load());
  }

  openNew() {
    this.draft = { title: '', slug: '', nav_label: '', is_published: true, show_in_nav: true };
    this.error.set('');
    this.showNew.set(true);
  }

  create() {
    this.error.set('');
    this.api.createPage(this.draft).subscribe({
      next: () => { this.showNew.set(false); this.load(); },
      error: (e) => this.error.set(this.firstError(e) ?? 'Création impossible.'),
    });
  }

  remove(p: PageNav) {
    if (!confirm(`Supprimer la page « ${p.title} » et tous ses blocs ?`)) return;
    this.api.deletePage(p.slug).subscribe(() => this.load());
  }

  private firstError(e: any): string | null {
    const data = e?.error;
    if (data && typeof data === 'object') {
      const k = Object.keys(data)[0];
      if (k) return `${k}: ${Array.isArray(data[k]) ? data[k][0] : data[k]}`;
    }
    return null;
  }
}
