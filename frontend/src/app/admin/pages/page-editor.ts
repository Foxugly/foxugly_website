import { Component, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import {
  CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray,
} from '@angular/cdk/drag-drop';
import { forkJoin } from 'rxjs';

import { AdminApiService } from '../../core/admin-api.service';
import { Block, BlockType, PageDetail } from '../../core/models';
import { BlockForm, BlockEdit } from '../blocks/block-form';
import { BLOCK_TYPE_LABELS } from '../blocks/block-schema';

@Component({
  selector: 'app-admin-page-editor',
  imports: [RouterLink, CdkDropList, CdkDrag, CdkDragHandle, BlockForm],
  template: `
    <div class="admin-head">
      <div>
        <a routerLink="/admin/pages" class="muted-note">← Pages</a>
        <h1>{{ page()?.title || slug }}</h1>
        <p class="sub">Glisse les blocs pour les réordonner. Clique sur un bloc pour éditer son contenu.</p>
      </div>
      <div class="toolbar">
        <a [routerLink]="['/admin/pages', slug, 'visual']" class="btn btn-primary btn-sm">✦ Édition visuelle</a>
        <a [routerLink]="['/', slug]" target="_blank" class="btn btn-outline btn-sm">Voir ↗</a>
        <select #picker class="btn btn-outline btn-sm" style="padding-right:.6rem;">
          @for (t of types; track t) { <option [value]="t">{{ labels[t] }}</option> }
        </select>
        <button class="btn btn-primary btn-sm" (click)="addBlock(picker.value)">+ Ajouter le bloc</button>
      </div>
    </div>

    @if (blocks().length === 0) {
      <div class="panel empty-state">Aucun bloc. Ajoute-en un avec le sélecteur ci-dessus.</div>
    } @else {
      <div class="block-list" cdkDropList (cdkDropListDropped)="drop($event)">
        @for (b of blocks(); track b.id) {
          <div class="block-row" [class.hidden-block]="!b.is_visible" cdkDrag>
            <span class="block-handle" cdkDragHandle title="Déplacer">⠿</span>
            <div class="block-meta">
              <div class="type">{{ labels[b.block_type] }}
                @if (b.anchor) { <code style="font-weight:400; font-size:.8rem;">#{{ b.anchor }}</code> }
              </div>
              <div class="excerpt">{{ preview(b) }}</div>
            </div>
            <div class="row-actions">
              <button class="badge" [class.on]="b.is_visible" [class.off]="!b.is_visible"
                      (click)="toggleVisible(b)" style="border:0; cursor:pointer;">
                {{ b.is_visible ? 'Visible' : 'Masqué' }}
              </button>
              <button class="btn btn-outline btn-sm" (click)="edit(b)">Éditer</button>
              <button class="btn btn-danger btn-sm" (click)="remove(b)">✕</button>
            </div>
          </div>
        }
      </div>
    }

    @if (editing(); as b) {
      <div class="overlay" (click)="editing.set(null)">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>{{ labels[b.block_type] }}</h3>
          <app-block-form [block]="b" (save)="onSave(b, $event)" (cancel)="editing.set(null)" />
        </div>
      </div>
    }
  `,
})
export class PageEditor {
  private api = inject(AdminApiService);
  private route = inject(ActivatedRoute);

  protected slug = '';
  protected page = signal<PageDetail | null>(null);
  protected blocks = signal<Block[]>([]);
  protected editing = signal<Block | null>(null);

  protected labels = BLOCK_TYPE_LABELS;
  protected types = Object.keys(BLOCK_TYPE_LABELS) as BlockType[];

  constructor() {
    this.slug = this.route.snapshot.paramMap.get('slug')!;
    this.load();
  }

  private load() {
    forkJoin({ page: this.api.page(this.slug), blocks: this.api.blocks(this.slug) })
      .subscribe(({ page, blocks }) => {
        this.page.set(page);
        this.blocks.set(blocks);
      });
  }

  preview(b: Block): string {
    const c = b.content ?? {};
    return c.title || c.text || c.eyebrow ||
      (c.items?.length ? `${c.items.length} élément(s)` : '') || '—';
  }

  drop(event: CdkDragDrop<Block[]>) {
    const arr = [...this.blocks()];
    moveItemInArray(arr, event.previousIndex, event.currentIndex);
    arr.forEach((b, i) => (b.order = i + 1));
    this.blocks.set(arr);
    this.api.reorderBlocks(arr.map(b => ({ id: b.id, order: b.order }))).subscribe();
  }

  toggleVisible(b: Block) {
    this.api.updateBlock(b.id, { is_visible: !b.is_visible })
      .subscribe(() => { b.is_visible = !b.is_visible; this.blocks.set([...this.blocks()]); });
  }

  edit(b: Block) { this.editing.set(b); }

  onSave(b: Block, edit: BlockEdit) {
    this.api.updateBlock(b.id, edit).subscribe(updated => {
      this.blocks.set(this.blocks().map(x => (x.id === b.id ? { ...x, ...updated } : x)));
      this.editing.set(null);
    });
  }

  addBlock(type: string) {
    const order = this.blocks().length + 1;
    this.api.createBlock({
      page: this.page()?.id,
      block_type: type as BlockType,
      order,
      is_visible: true,
    }).subscribe(created => {
      this.blocks.set([...this.blocks(), created]);
      this.editing.set(created);   // ouvre directement le formulaire
    });
  }

  remove(b: Block) {
    if (!confirm('Supprimer ce bloc ?')) return;
    this.api.deleteBlock(b.id).subscribe(() => this.blocks.set(this.blocks().filter(x => x.id !== b.id)));
  }
}
