import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import { Block } from '../../../core/models';

@Component({
  selector: 'app-page-hero',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <header class="page-hero" [id]="block.anchor || null">
      <div class="wrap">
        @if (c.badge) {
          <span class="hero-badge"><span class="dot"></span> {{ c.badge }}</span>
        }
        <h1>{{ c.title }}</h1>
        @if (c.text) {
          <div class="rich" [innerHTML]="c.text"></div>
        }
      </div>
    </header>
  `,
})
export class PageHero {
  @Input({ required: true }) block!: Block;
  get c() {
    return this.block.content;
  }
}
