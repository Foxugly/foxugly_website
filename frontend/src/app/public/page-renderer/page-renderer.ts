import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';

import { Block, PageDetail } from '../../core/models';
import { ContentService } from '../../core/content.service';
import { BlockRenderer } from '../block-renderer/block-renderer';

/** Bloc décoré de son fond alterné clair/gris. */
interface RenderedBlock {
  block: Block;
  soft: boolean;
}
type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ok'; page: PageDetail; blocks: RenderedBlock[] };

/** Blocs qui n'entrent pas dans l'alternance de fond (fond propre). */
const FULL_BLEED = new Set(['hero', 'page_hero', 'cta']);

@Component({
  selector: 'app-page-renderer',
  imports: [AsyncPipe, BlockRenderer],
  template: `
    @if (state$ | async; as s) {
      @switch (s.status) {
        @case ('loading') {
          <div class="loading-state"><div class="wrap">Chargement…</div></div>
        }
        @case ('error') {
          <div class="error-state"><div class="wrap">
            <h2>Page introuvable</h2>
            <p>Cette page n'existe pas ou n'est pas encore publiée.</p>
          </div></div>
        }
        @case ('ok') {
          @for (rb of s.blocks; track rb.block.id) {
            <app-block-renderer [block]="rb.block" [soft]="rb.soft" />
          }
        }
      }
    }
  `,
})
export class PageRenderer {
  private route = inject(ActivatedRoute);
  private content = inject(ContentService);
  private title = inject(Title);

  protected state$: Observable<State> = this.route.paramMap.pipe(
    map(pm => pm.get('slug') ?? 'accueil'),
    switchMap(slug =>
      this.content.page(slug).pipe(
        tap(page => this.title.setTitle(`${page.seo_title || page.title} — foxugly`)),
        map((page): State => ({ status: 'ok', page, blocks: this.decorate(page.blocks) })),
        catchError(() => of<State>({ status: 'error' })),
      ),
    ),
  );

  /** Alterne fond clair/gris parmi les blocs « de section ». */
  private decorate(blocks: Block[]): RenderedBlock[] {
    let n = 0;
    return blocks.map(block => {
      if (FULL_BLEED.has(block.block_type)) return { block, soft: false };
      const soft = n % 2 === 1;
      n++;
      return { block, soft };
    });
  }
}
