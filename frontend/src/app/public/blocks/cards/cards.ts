import { Component, Input } from '@angular/core';

import { Block } from '../../../core/models';
import { CARD_COLOR_PALETTE } from '../../../core/block-defaults';

@Component({
  selector: 'app-cards',
  template: `
    <section class="block" [class.soft]="soft" [id]="block.anchor || null">
      <div class="wrap">
        <div class="block-head text-center">
          @if (c.eyebrow) { <span class="eyebrow">{{ c.eyebrow }}</span> }
          <h2 class="section-title">{{ c.title }}</h2>
          @if (c.lead) { <div class="section-lead center-block rich" [innerHTML]="c.lead"></div> }
        </div>
        <div class="grid" [class.grid-3]="c.items?.length !== 4" [class.grid-4]="c.items?.length === 4">
          @for (item of c.items; track $index) {
            <div class="card">
              <div class="card-ico" [class]="iconBg($index)">{{ item.icon }}</div>
              <h3>{{ item.title }}</h3>
              <div class="rich" [innerHTML]="item.text"></div>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class Cards {
  @Input({ required: true }) block!: Block;
  @Input() soft = false;
  get c() { return this.block.content; }

  iconBg(i: number): string { return CARD_COLOR_PALETTE[i % CARD_COLOR_PALETTE.length]; }
}
