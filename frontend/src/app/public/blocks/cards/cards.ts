import { Component, Input } from '@angular/core';

import { Block } from '../../../core/models';

@Component({
  selector: 'app-cards',
  template: `
    <section class="block" [class.soft]="soft" [id]="block.anchor || null">
      <div class="wrap">
        <div class="block-head text-center">
          @if (c.eyebrow) { <span class="eyebrow">{{ c.eyebrow }}</span> }
          <h2 class="section-title">{{ c.title }}</h2>
          @if (c.lead) { <p class="section-lead center-block">{{ c.lead }}</p> }
        </div>
        <div class="grid" [class.grid-3]="c.items?.length !== 4" [class.grid-4]="c.items?.length === 4">
          @for (item of c.items; track $index) {
            <div class="card">
              <div class="card-ico" [class]="iconBg($index)">{{ item.icon }}</div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.text }}</p>
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

  private palette = ['bg-orange', 'bg-violet', 'bg-teal', 'bg-pink'];
  iconBg(i: number): string { return this.palette[i % this.palette.length]; }
}
