import { Component, Input } from '@angular/core';

import { Block } from '../../../core/models';
import { LinkBtn } from '../../link-btn/link-btn';

/** Cartes flottantes par défaut (si le bloc n'en définit pas). */
const DEFAULT_CARDS = [
  { icon: '🚀', label: 'Time-to-market', value: '−40 % en moyenne' },
  { icon: '🤝', label: 'Équipes coachées', value: '+120 squads' },
  { icon: '📈', label: 'Satisfaction', value: '4,9 / 5' },
];

@Component({
  selector: 'app-hero',
  imports: [LinkBtn],
  template: `
    <header class="hero" [id]="block.anchor || null">
      <div class="wrap hero-grid">
        <div>
          @if (c.badge) { <span class="hero-badge"><span class="dot"></span> {{ c.badge }}</span> }
          <h1>{{ before }}<span class="hl">{{ c.highlight }}</span>{{ after }}</h1>
          <p>{{ c.text }}</p>
          <div class="hero-actions">
            @if (c.primary_cta) {
              <app-link-btn [href]="c.primary_cta.href" [label]="c.primary_cta.label + ' →'" cssClass="btn btn-primary" />
            }
            @if (c.secondary_cta) {
              <app-link-btn [href]="c.secondary_cta.href" [label]="c.secondary_cta.label" cssClass="btn btn-ghost" />
            }
          </div>
        </div>

        <div class="hero-visual" aria-hidden="true">
          @for (card of cards; track $index) {
            <div class="float-card" [class]="'fc' + ($index + 1)">
              <span class="ico">{{ card.icon }}</span>
              <div>{{ card.label }}<small>{{ card.value }}</small></div>
            </div>
          }
        </div>
      </div>
    </header>
  `,
})
export class Hero {
  @Input({ required: true }) block!: Block;
  get c() { return this.block.content; }

  /** Cartes flottantes du visuel — éditables via `content.cards`. */
  get cards() {
    const c = this.c?.cards;
    return Array.isArray(c) && c.length ? c.slice(0, 3) : DEFAULT_CARDS;
  }

  /** Découpe le titre autour de la sous-chaîne `highlight` (colorée en vert). */
  get before(): string {
    const t = this.c.title ?? '';
    const i = this.c.highlight ? t.indexOf(this.c.highlight) : -1;
    return i >= 0 ? t.slice(0, i) : t;
  }
  get after(): string {
    const t = this.c.title ?? '';
    const i = this.c.highlight ? t.indexOf(this.c.highlight) : -1;
    return i >= 0 ? t.slice(i + this.c.highlight.length) : '';
  }
}
