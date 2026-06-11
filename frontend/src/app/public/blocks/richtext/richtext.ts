import { Component, Input } from '@angular/core';

import { Block } from '../../../core/models';

@Component({
  selector: 'app-richtext',
  template: `
    <section class="block" [class.soft]="soft" [id]="block.anchor || null">
      <div class="wrap richtext">
        <div class="block-head">
          @if (c.eyebrow) { <span class="eyebrow">{{ c.eyebrow }}</span> }
          <h2 class="section-title">{{ c.title }}</h2>
        </div>
        @if (c.body) {
          <div class="rich" [innerHTML]="c.body"></div>
        } @else if (c.paragraphs?.length) {
          <!-- Repli legacy : contenu seedé avant la migration en richtext. -->
          @for (p of c.paragraphs; track $index) { <p>{{ p }}</p> }
        }
        @if (c.certs?.length) {
          <div class="cert-list">
            @for (cert of c.certs; track $index) { <span class="tag orange">{{ cert }}</span> }
          </div>
        }
      </div>
    </section>
  `,
})
export class Richtext {
  @Input({ required: true }) block!: Block;
  @Input() soft = false;
  get c() { return this.block.content; }
}
