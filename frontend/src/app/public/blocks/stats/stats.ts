import { Component, Input } from '@angular/core';

import { Block } from '../../../core/models';

@Component({
  selector: 'app-stats',
  template: `
    <section class="block" [id]="block.anchor || null">
      <div class="wrap stats">
        @for (s of c.items; track $index) {
          <div class="stat"><div class="num">{{ s.num }}</div><div class="lbl">{{ s.label }}</div></div>
        }
      </div>
    </section>
  `,
})
export class Stats {
  @Input({ required: true }) block!: Block;
  get c() { return this.block.content; }
}
