import { Component, Input } from '@angular/core';

import { Block } from '../../../core/models';
import { LinkBtn } from '../../link-btn/link-btn';

@Component({
  selector: 'app-cta',
  imports: [LinkBtn],
  template: `
    <section class="block" [id]="block.anchor || null">
      <div class="wrap">
        <div class="cta">
          <h2>{{ c.title }}</h2>
          @if (c.text) { <p>{{ c.text }}</p> }
          @if (c.cta) {
            <app-link-btn [href]="c.cta.href" [label]="c.cta.label" cssClass="btn btn-ghost" />
          }
        </div>
      </div>
    </section>
  `,
})
export class Cta {
  @Input({ required: true }) block!: Block;
  get c() { return this.block.content; }
}
