import {
  AfterViewInit, Component, ElementRef, OnDestroy, inject, isDevMode, signal, viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import grapesjs, { Editor } from 'grapesjs';
import { forkJoin } from 'rxjs';

import { AdminApiService } from '../../core/admin-api.service';
import { Block, BlockType, PageDetail } from '../../core/models';
import { BlockForm, BlockEdit } from '../blocks/block-form';
import { BLOCK_TYPE_LABELS, emptyContent } from '../blocks/block-schema';
import { renderBlockHtml } from '../blocks/block-preview';

/**
 * Éditeur visuel GrapesJS « par-dessus le modèle de blocs ».
 *
 * Chaque bloc devient un composant GrapesJS sélectionnable / déplaçable /
 * supprimable dans le canvas. La sélection ouvre le formulaire typé (réutilisé)
 * dans un tiroir latéral. GrapesJS pilote la disposition ; le modèle de blocs
 * de l'API reste la source de vérité (persistance via reorder/create/update/delete).
 */
@Component({
  selector: 'app-admin-visual-editor',
  imports: [RouterLink, BlockForm],
  template: `
    <div class="visual-wrap">
      <div class="visual-bar">
        <a routerLink="/admin/pages" class="brand visual-brand" title="Retour à l'admin">
          <img src="assets/logo.svg" alt="foxugly" />
          <span><span class="fox">fox</span><span class="ugly">ugly</span></span>
        </a>
        <h1>Édition visuelle — {{ page()?.title || slug }}</h1>

        <button class="btn btn-outline btn-sm" [disabled]="!canUndo()" (click)="undo()" title="Annuler (Ctrl+Z)">↶ Annuler</button>
        <button class="btn btn-outline btn-sm" [disabled]="!canRedo()" (click)="redo()" title="Rétablir (Ctrl+Maj+Z)">↷ Rétablir</button>
        <button class="btn btn-primary btn-sm" (click)="saveLayout()">{{ saved() ? 'Disposition enregistrée ✓' : 'Enregistrer la disposition' }}</button>
        <a [routerLink]="['/admin/pages', slug]" class="btn btn-outline btn-sm">Éditeur classique</a>
        <a [routerLink]="['/', slug]" target="_blank" class="btn btn-outline btn-sm">Voir ↗</a>
        <a routerLink="/admin/pages" class="btn btn-outline btn-sm" title="Quitter l'éditeur visuel">✕ Quitter</a>
      </div>

      <div class="visual-body">
        <aside class="visual-blocks">
          <span class="visual-blocks-title">Glisser ou cliquer un bloc pour l'ajouter</span>
          <div #blockPanel></div>
        </aside>

        <div #host class="gjs-host"></div>

        @if (selected(); as b) {
          <aside class="visual-drawer">
            <div class="drawer-head">
              <h3>{{ labels[b.block_type] }}</h3>
              <button class="btn btn-danger btn-sm" (click)="deleteSelected()">Supprimer</button>
            </div>
            <app-block-form [block]="b" (save)="onSave(b, $event)" (cancel)="selected.set(null)" />
          </aside>
        }
      </div>
    </div>
  `,
})
export class VisualEditor implements AfterViewInit, OnDestroy {
  private api = inject(AdminApiService);
  private route = inject(ActivatedRoute);
  private host = viewChild.required<ElementRef<HTMLElement>>('host');
  private blockPanel = viewChild.required<ElementRef<HTMLElement>>('blockPanel');

  protected slug = this.route.snapshot.paramMap.get('slug')!;
  protected page = signal<PageDetail | null>(null);
  protected selected = signal<Block | null>(null);
  protected saved = signal(false);
  protected canUndo = signal(false);
  protected canRedo = signal(false);

  protected labels = BLOCK_TYPE_LABELS;
  protected types = Object.keys(BLOCK_TYPE_LABELS) as BlockType[];

  private editor?: Editor;
  /** blockId → composant GrapesJS. */
  private comps = new Map<number, any>();

  ngAfterViewInit() {
    this.editor = grapesjs.init({
      container: this.host().nativeElement,
      height: '100%',
      width: 'auto',
      fromElement: false,
      storageManager: false,
      // Drag par événements pointer (et non HTML5 natif) : plus fiable pour
      // glisser un bloc du panneau jusque dans l'iframe du canvas.
      nativeDnD: false,
      panels: { defaults: [] },
      blockManager: { appendTo: this.blockPanel().nativeElement, appendOnClick: true, blocks: [] },
      deviceManager: { devices: [] },
      canvas: { styles: [], scripts: [] },
    });

    this.registerBlockType();
    this.registerManagerBlocks();
    this.injectSiteCss();
    this.wireEvents();
    this.overrideHistoryCommands();
    this.loadBlocks();

    // Aide au debug/E2E en dev uniquement (absent du build de prod).
    if (isDevMode()) (window as any).__gjsEditor = this.editor;
  }

  private um() { return this.editor!.UndoManager; }
  private refreshUndo() {
    this.canUndo.set(this.um().hasUndo());
    this.canRedo.set(this.um().hasRedo());
  }
  /** Vide la pile d'undo (clear() n'est pas typé mais existe au runtime). */
  private resetHistory() {
    (this.um() as any).clear();
    this.refreshUndo();
  }

  /**
   * Override des commandes natives core:undo/core:redo : clavier (Ctrl+Z /
   * Ctrl+Maj+Z) ET boutons passent par ce chemin, qui re-persiste l'ordre.
   */
  private overrideHistoryCommands() {
    const ed = this.editor!;
    ed.Commands.add('core:undo', () => { ed.UndoManager.undo(); this.afterHistory(); });
    ed.Commands.add('core:redo', () => { ed.UndoManager.redo(); this.afterHistory(); });
  }

  /** Après un undo/redo : ferme le tiroir et re-synchronise l'ordre en base. */
  private afterHistory() {
    this.selected.set(null);
    this.refreshUndo();
    this.saveLayout(true);
  }

  undo() { this.editor!.runCommand('core:undo'); }
  redo() { this.editor!.runCommand('core:redo'); }

  deleteSelected() {
    const b = this.selected();
    if (!b) return;
    if (!confirm('Supprimer ce bloc ?')) return;
    const cmp = this.comps.get(b.id);
    this.api.deleteBlock(b.id).subscribe(() => {
      if (cmp) this.um().skip(() => cmp.remove());  // hors pile d'undo
      this.comps.delete(b.id);
      this.selected.set(null);
      this.refreshUndo();
    });
  }

  /** Type GrapesJS « fox-block » : unité sélectionnable, contenu inerte. */
  private registerBlockType() {
    this.editor!.DomComponents.addType('fox-block', {
      model: {
        defaults: {
          name: 'Bloc', draggable: true, droppable: false, editable: false,
          copyable: false, selectable: true, hoverable: true, stylable: false,
          previewHtml: '',
          // Toolbar réduite au déplacement (la suppression passe par le tiroir).
          toolbar: [{ attributes: { class: 'fox-tlb-move', title: 'Glisser pour réordonner' }, command: 'tlb-move' }],
        } as any,
      },
      view: {
        onRender() {
          (this as any).el.innerHTML = (this as any).model.get('previewHtml') || '';
        },
      },
    });
  }

  /** Peuple le block manager avec les 13 types (glissables dans le canvas). */
  private registerManagerBlocks() {
    const icons: Record<string, string> = {
      hero: '🦸', page_hero: '🏷️', richtext: '📝', stats: '📊', cards: '🃏',
      timeline: '🪜', accordion: '🗂️', testimonials: '💬', logo_wall: '🏛️',
      news_list: '📰', project_list: '📁', partner_list: '🤝', cta: '📣',
    };
    const bm = this.editor!.BlockManager;
    for (const t of this.types) {
      bm.add(t, {
        label: `<div class="fox-bm"><span class="fox-bm-ico">${icons[t] ?? '▦'}</span><span>${this.labels[t]}</span></div>`,
        category: 'Blocs de contenu',
        content: `<div data-fox-new="${t}"></div>`,
      });
    }
  }

  /** Recopie le CSS du site dans l'iframe du canvas pour un rendu fidèle. */
  private injectSiteCss() {
    this.editor!.on('load', () => {
      let css = '';
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) css += rule.cssText + '\n';
        } catch { /* feuille cross-origin (ex : Google Fonts) : ignorée */ }
      }
      const doc = this.editor!.Canvas.getDocument();
      if (!doc) return;
      const style = doc.createElement('style');
      style.textContent = css + '\nbody{background:#fff;} [data-block-id]{outline:1px dashed transparent;}';
      doc.head.appendChild(style);
    });
  }

  private wireEvents() {
    const ed = this.editor!;
    ed.on('component:selected', (cmp: any) => {
      const id = cmp?.get('blockId');
      const block = this.findBlock(id);
      if (block) this.selected.set(block);
    });
    ed.on('component:deselected', () => this.selected.set(null));
    // Persiste l'ordre + rafraîchit l'état d'undo dès qu'un déplacement se termine.
    ed.on('sorter:drag:end', () => { this.saveLayout(true); this.refreshUndo(); });
    // Ajout d'un bloc depuis le manager (par clic OU par drag) : GrapesJS insère
    // un placeholder <div data-fox-new="…"> ; on le transforme en vrai bloc.
    ed.on('component:add', (component: any) => this.onPlaceholderAdded(component));
  }

  /** Un placeholder de bloc a été inséré : crée le bloc en base à sa position. */
  private onPlaceholderAdded(component: any) {
    if (!component?.getAttributes) return;
    if (component.get('temporary')) return;  // modèle temporaire du sorter : ignorer
    const type = component.getAttributes()['data-fox-new'];
    if (!type) return;                       // pas un placeholder de nouveau bloc
    const wrapper = this.editor!.getWrapper()!;
    let at = wrapper.components().indexOf(component);
    if (at < 0) at = wrapper.components().length;
    component.remove();                       // retire le placeholder
    this.api.createBlock({
      page: this.page()?.id, block_type: type as BlockType, order: at + 1,
      is_visible: true, content: emptyContent(type as BlockType),
    }).subscribe(created => {
      const cmp = this.appendComponent(wrapper, created, at);
      this.editor!.select(cmp);
      this.selected.set(created);
      this.resetHistory();                    // l'ajout (structurel) réinitialise l'historique
      this.saveLayout(true);                  // renumérote tout selon le canvas
    });
  }

  private loadBlocks() {
    forkJoin({ page: this.api.page(this.slug), blocks: this.api.blocks(this.slug) })
      .subscribe(({ page, blocks }) => {
        this.page.set(page);
        const wrapper = this.editor!.getWrapper()!;
        for (const b of [...blocks].sort((x, y) => x.order - y.order)) {
          this.appendComponent(wrapper, b);
        }
        this.resetHistory();        // l'état initial n'est pas annulable
      });
  }

  private appendComponent(wrapper: any, b: Block, at?: number) {
    const def = {
      type: 'fox-block',
      blockId: b.id,
      blockType: b.block_type,
      blockData: b,
      previewHtml: renderBlockHtml(b),
      attributes: { 'data-block-id': b.id, 'data-block-type': b.block_type },
    } as any;
    const added = wrapper.append(def, at != null ? { at } : undefined)[0];
    this.comps.set(b.id, added);
    return added;
  }

  private findBlock(id: number): Block | null {
    const cmp = this.comps.get(id);
    return cmp ? (cmp.get('blockData') as Block) : null;
  }

  /* ---- Actions ---- */

  onSave(b: Block, edit: BlockEdit) {
    this.api.updateBlock(b.id, edit).subscribe(updated => {
      const cmp = this.comps.get(b.id);
      if (cmp) {
        // Édition de contenu : eager-persistée, donc hors pile d'undo.
        this.um().skip(() => {
          cmp.set('blockData', updated);
          cmp.set('previewHtml', renderBlockHtml(updated));
          const el = cmp.getEl();
          if (el) el.innerHTML = renderBlockHtml(updated);
        });
      }
      this.selected.set(null);
    });
  }

  saveLayout(silent = false) {
    const wrapper = this.editor!.getWrapper()!;
    const items = (wrapper.components() as any)
      .map((c: any, i: number) => ({ id: c.get('blockId') as number, order: i + 1 }))
      .filter((x: { id: number }) => !!x.id) as { id: number; order: number }[];
    if (!items.length) return;
    this.api.reorderBlocks(items).subscribe(() => {
      if (!silent) {
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 2000);
      }
    });
  }

  ngOnDestroy() { this.editor?.destroy(); }
}
