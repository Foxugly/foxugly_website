import { Component, Input, signal } from '@angular/core';

import { Block } from '../../../core/models';

@Component({
  selector: 'app-accordion',
  template: `
    <section class="block" [class.soft]="soft" [id]="block.anchor || null">
      <div class="wrap">
        <div class="block-head text-center">
          @if (c.eyebrow) { <span class="eyebrow">{{ c.eyebrow }}</span> }
          <h2 class="section-title">{{ c.title }}</h2>
        </div>
        <div class="accordion">
          @for (item of c.items; track $index) {
            <div class="acc-item" [class.open]="openIndex() === $index">
              <button class="acc-head" type="button" (click)="toggle($index)">
                {{ item.title }} <span class="chev">⌄</span>
              </button>
              <div class="acc-body"><div class="acc-body-inner rich" [innerHTML]="item.text"></div></div>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class Accordion {
  @Input({ required: true }) block!: Block;
  @Input() soft = false;
  get c() { return this.block.content; }

  protected openIndex = signal<number>(0);
  toggle(i: number) { this.openIndex.update(cur => (cur === i ? -1 : i)); }
}
