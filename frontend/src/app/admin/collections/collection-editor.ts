import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { FileUpload, FileSelectEvent } from 'primeng/fileupload';

import { AdminApiService, CollectionName } from '../../core/admin-api.service';
import { RichEditorComponent } from '../../shared/rich-editor/rich-editor.component';

interface ColField { key: string; label: string; kind: 'text' | 'textarea' | 'richtext' | 'number' | 'bool' | 'select' | 'date' | 'image'; options?: { value: string; label: string }[]; }
interface ColConfig { title: string; primary: string; fields: ColField[]; }

const CONFIGS: Record<CollectionName, ColConfig> = {
  news: {
    title: 'Actualités', primary: 'title',
    fields: [
      { key: 'title', label: 'Titre', kind: 'text' },
      { key: 'slug', label: 'Slug', kind: 'text' },
      { key: 'category', label: 'Catégorie', kind: 'text' },
      { key: 'excerpt', label: 'Résumé', kind: 'richtext' },
      { key: 'body', label: 'Contenu', kind: 'richtext' },
      { key: 'date', label: 'Date', kind: 'date' },
      { key: 'read_time', label: 'Temps de lecture', kind: 'text' },
      { key: 'order', label: 'Ordre', kind: 'number' },
      { key: 'is_published', label: 'Publiée', kind: 'bool' },
    ],
  },
  projects: {
    title: 'Projets', primary: 'title',
    fields: [
      { key: 'title', label: 'Titre', kind: 'text' },
      { key: 'sector', label: 'Secteur', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'richtext' },
      { key: 'result', label: 'Résultat clé', kind: 'text' },
      { key: 'order', label: 'Ordre', kind: 'number' },
      { key: 'is_published', label: 'Publié', kind: 'bool' },
    ],
  },
  partners: {
    title: 'Partenaires', primary: 'name',
    fields: [
      { key: 'name', label: 'Nom', kind: 'text' },
      { key: 'logo', label: 'Logo', kind: 'image' },
      {
        key: 'kind', label: 'Type', kind: 'select',
        options: [{ value: 'client', label: 'Client' }, { value: 'association', label: 'Association' }],
      },
      { key: 'sector_or_cause', label: 'Secteur / cause', kind: 'text' },
      { key: 'support_type', label: 'Forme de soutien (assos)', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'richtext' },
      { key: 'link', label: 'Lien', kind: 'text' },
      { key: 'order', label: 'Ordre', kind: 'number' },
      { key: 'is_published', label: 'Publié', kind: 'bool' },
    ],
  },
  testimonials: {
    title: 'Témoignages', primary: 'author',
    fields: [
      { key: 'quote', label: 'Citation', kind: 'richtext' },
      { key: 'author', label: 'Auteur', kind: 'text' },
      { key: 'role', label: 'Rôle / société', kind: 'text' },
      { key: 'initials', label: 'Initiales', kind: 'text' },
      { key: 'order', label: 'Ordre', kind: 'number' },
      { key: 'is_published', label: 'Publié', kind: 'bool' },
    ],
  },
};

@Component({
  selector: 'app-admin-collection-editor',
  imports: [FormsModule, FileUpload, RichEditorComponent],
  template: `
    <div class="admin-head">
      <div><h1>{{ config().title }}</h1><p class="sub">{{ rows().length }} élément(s).</p></div>
      <button class="btn btn-primary btn-sm" (click)="openNew()">+ Nouvel élément</button>
    </div>

    <table class="admin-table">
      <thead><tr><th>{{ primaryLabel() }}</th><th>Ordre</th><th>État</th><th></th></tr></thead>
      <tbody>
        @for (r of rows(); track r.id) {
          <tr>
            <td><strong>{{ r[config().primary] }}</strong></td>
            <td>{{ r.order }}</td>
            <td>
              <span class="badge" [class.on]="r.is_published" [class.off]="!r.is_published">
                {{ r.is_published ? 'Publié' : 'Brouillon' }}
              </span>
            </td>
            <td class="row-actions">
              <button class="btn btn-outline btn-sm" (click)="openEdit(r)">Éditer</button>
              <button class="btn btn-danger btn-sm" (click)="remove(r)">Suppr.</button>
            </td>
          </tr>
        }
        @if (rows().length === 0) {
          <tr><td colspan="4" class="empty-state">Aucun élément.</td></tr>
        }
      </tbody>
    </table>

    @if (draft(); as d) {
      <div class="overlay" (click)="draft.set(null)">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>{{ d.id ? 'Modifier' : 'Nouvel élément' }}</h3>
          <div class="form-grid">
            @for (f of config().fields; track f.key) {
              @switch (f.kind) {
                @case ('textarea') {
                  <div class="field"><label>{{ f.label }}</label>
                    <textarea rows="3" [ngModel]="d[f.key]" (ngModelChange)="d[f.key] = $event" [ngModelOptions]="{standalone:true}"></textarea>
                  </div>
                }
                @case ('richtext') {
                  <div class="field"><label>{{ f.label }}</label>
                    <app-rich-editor [ngModel]="d[f.key]" (ngModelChange)="d[f.key] = $event" [ngModelOptions]="{standalone:true}" />
                  </div>
                }
                @case ('number') {
                  <div class="field"><label>{{ f.label }}</label>
                    <input type="number" [ngModel]="d[f.key]" (ngModelChange)="d[f.key] = +$event" [ngModelOptions]="{standalone:true}" />
                  </div>
                }
                @case ('bool') {
                  <div class="switch-row">
                    <input type="checkbox" [id]="'c_'+f.key" [ngModel]="d[f.key]" (ngModelChange)="d[f.key] = $event" [ngModelOptions]="{standalone:true}" />
                    <label [for]="'c_'+f.key">{{ f.label }}</label>
                  </div>
                }
                @case ('select') {
                  <div class="field"><label>{{ f.label }}</label>
                    <select [ngModel]="d[f.key]" (ngModelChange)="d[f.key] = $event" [ngModelOptions]="{standalone:true}">
                      @for (o of f.options; track o.value) { <option [value]="o.value">{{ o.label }}</option> }
                    </select>
                  </div>
                }
                @case ('date') {
                  <div class="field"><label>{{ f.label }}</label>
                    <input type="date" [ngModel]="d[f.key]" (ngModelChange)="d[f.key] = $event" [ngModelOptions]="{standalone:true}" />
                  </div>
                }
                @case ('image') {
                  <div class="field"><label>{{ f.label }}</label>
                    <div class="image-field">
                      @if (filePreview()) {
                        <img class="logo-thumb" [src]="filePreview()" alt="aperçu" />
                      } @else if (d[f.key]) {
                        <img class="logo-thumb" [src]="d[f.key]" alt="logo actuel" />
                      } @else {
                        <span class="logo-thumb empty">—</span>
                      }
                      <div>
                        <p-fileUpload mode="basic" chooseLabel="Choisir un logo" chooseIcon="pi pi-upload"
                          accept="image/*" [auto]="false" [customUpload]="true"
                          [chooseButtonProps]="{ severity: 'secondary', outlined: true }"
                          (onSelect)="onPrimeSelect($event)" (onClear)="resetFile()" />
                        @if (draftFile()) {
                          <p class="muted-note">
                            {{ draftFile()!.name }} — enregistré à la validation.
                            <button type="button" class="btn-link" (click)="resetFile()">annuler la sélection</button>
                          </p>
                        } @else if (d[f.key] && d.id) {
                          <p><button type="button" class="btn btn-danger btn-sm" (click)="removeImage(f.key)">Retirer le logo</button></p>
                        }
                      </div>
                    </div>
                  </div>
                }
                @default {
                  <div class="field"><label>{{ f.label }}</label>
                    <input [ngModel]="d[f.key]" (ngModelChange)="d[f.key] = $event" [ngModelOptions]="{standalone:true}" />
                  </div>
                }
              }
            }
          </div>
          @if (error()) { <p style="color:#dc2626; margin-top:1rem;">{{ error() }}</p> }
          <div class="modal-actions">
            <button class="btn btn-outline btn-sm" (click)="draft.set(null)">Annuler</button>
            <button class="btn btn-primary btn-sm" (click)="persist()">Enregistrer</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CollectionEditor {
  private api = inject(AdminApiService);
  private route = inject(ActivatedRoute);

  /** Ressource courante, réactive aux changements de route. */
  protected resource = toSignal(
    this.route.paramMap.pipe(map(pm => pm.get('resource') as CollectionName)),
    { initialValue: 'news' as CollectionName },
  );
  protected config = () => CONFIGS[this.resource()] ?? CONFIGS.news;
  protected primaryLabel = () =>
    this.config().fields.find(f => f.key === this.config().primary)?.label ?? 'Nom';

  protected rows = signal<any[]>([]);
  protected draft = signal<any | null>(null);
  protected error = signal('');
  /** Fichier image sélectionné (upload différé à la validation). */
  protected draftFile = signal<File | null>(null);
  /** URL objet d'aperçu local du fichier choisi. */
  protected filePreview = signal<string | null>(null);

  constructor() {
    // Recharge à chaque changement de ressource.
    this.route.paramMap.subscribe(() => this.load());
  }

  private load() {
    this.api.list<any>(this.resource()).subscribe(r => this.rows.set(r));
  }

  protected resetFile() {
    const prev = this.filePreview();
    if (prev) URL.revokeObjectURL(prev);
    this.draftFile.set(null);
    this.filePreview.set(null);
  }

  onPrimeSelect(event: FileSelectEvent) {
    const file = event.currentFiles?.[0] ?? null;
    this.resetFile();
    if (file) {
      this.draftFile.set(file);
      this.filePreview.set(URL.createObjectURL(file));
    }
  }

  openNew() {
    const d: any = {};
    for (const f of this.config().fields) {
      d[f.key] = f.kind === 'bool' ? true : f.kind === 'number' ? 0 : f.kind === 'select' ? f.options![0].value : '';
    }
    this.error.set('');
    this.resetFile();
    this.draft.set(d);
  }
  openEdit(r: any) { this.error.set(''); this.resetFile(); this.draft.set({ ...r }); }

  persist() {
    const d = this.draft();
    if (!d) return;
    this.error.set('');
    const body = this.buildBody(d);
    const req = d.id
      ? this.api.update(this.resource(), d.id, body)
      : this.api.create(this.resource(), body);
    req.subscribe({
      next: () => { this.resetFile(); this.draft.set(null); this.load(); },
      error: (e) => this.error.set(this.firstError(e) ?? 'Enregistrement impossible.'),
    });
  }

  /**
   * Construit le corps de requête : multipart (FormData) si un fichier est
   * sélectionné, sinon JSON sans les champs image (URL non ré-uploadable).
   */
  private buildBody(d: any): any {
    const fields = this.config().fields;
    const imageField = fields.find(f => f.kind === 'image');
    const file = this.draftFile();

    if (imageField && file) {
      const fd = new FormData();
      for (const f of fields) {
        if (f.kind === 'image') continue;
        const v = f.kind === 'bool' ? (d[f.key] ? 'true' : 'false') : (d[f.key] ?? '');
        fd.append(f.key, v);
      }
      fd.append(imageField.key, file);
      return fd;
    }

    const json: any = { ...d };
    for (const f of fields) if (f.kind === 'image') delete json[f.key];
    return json;
  }

  remove(r: any) {
    if (!confirm('Supprimer cet élément ?')) return;
    this.api.remove(this.resource(), r.id).subscribe(() => this.load());
  }

  /** Retire un logo déjà enregistré (action dédiée backend). */
  removeImage(field: string) {
    const d = this.draft();
    if (!d?.id) return;
    if (!confirm('Retirer le logo ?')) return;
    this.api.clearImage<any>(this.resource(), d.id, field).subscribe(updated => {
      this.draft.set({ ...d, [field]: updated[field] ?? null });
      this.resetFile();
      this.load();
    });
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
