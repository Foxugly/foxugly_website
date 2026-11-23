import { Component, Input } from '@angular/core';

import { Block } from '../../../core/models';

@Component({
  selector: 'app-timeline',
  template: `
    <section class="block" [class.soft]="soft" [id]="block.anchor || null">
      <div class="wrap">
        <div class="block-head text-center">
          @if (c.eyebrow) { <span class="eyebrow">{{ c.eyebrow }}</span> }
          <h2 class="section-title">{{ c.title }}</h2>
        </div>
        <div class="timeline">
          @for (item of c.items; track $index) {
            <div class="tl-item">
              <div class="tl-dot">{{ item.step }}</div>
              <div class="tl-body"><h4>{{ item.title }}</h4><div class="rich" [innerHTML]="item.text"></div></div>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class Timeline {
  @Input({ required: true }) block!: Block;
  @Input() soft = false;
  get c() { return this.block.content; }
}
