import { Component, Input } from '@angular/core';

import { Block } from '../../../core/models';

@Component({
  selector: 'app-logo-wall',
  template: `
    <section class="block" [class.soft]="soft" [id]="block.anchor || null">
      <div class="wrap">
        @if (c.title || c.eyebrow) {
          <div class="block-head text-center">
            @if (c.eyebrow) { <span class="eyebrow">{{ c.eyebrow }}</span> }
            @if (c.title) { <h2 class="section-title">{{ c.title }}</h2> }
          </div>
        }
        <div class="logo-wall">
          @for (item of c.items; track $index) { <div class="logo-chip">{{ item.label }}</div> }
        </div>
      </div>
    </section>
  `,
})
export class LogoWall {
  @Input({ required: true }) block!: Block;
  @Input() soft = false;
  get c() { return this.block.content; }
}
