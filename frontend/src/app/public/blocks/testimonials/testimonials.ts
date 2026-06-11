import { Component, Input, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';

import { Block, Testimonial } from '../../../core/models';
import { ContentService } from '../../../core/content.service';

@Component({
  selector: 'app-testimonials',
  imports: [AsyncPipe],
  template: `
    <section class="block" [class.soft]="soft" [id]="block.anchor || null">
      <div class="wrap">
        <div class="block-head text-center">
          <span class="eyebrow">Témoignages</span>
          <h2 class="section-title">Ils en parlent mieux que moi</h2>
        </div>
        <div class="grid grid-2">
          @for (t of (items$ | async); track t.id) {
            <div class="quote-card">
              <div class="mark">“</div>
              <div class="rich" [innerHTML]="t.quote"></div>
              <div class="quote-author">
                <div class="avatar">{{ t.initials }}</div>
                <div><strong>{{ t.author }}</strong><small>{{ t.role }}</small></div>
              </div>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class Testimonials implements OnInit {
  @Input({ required: true }) block!: Block;
  @Input() soft = false;
  private content = inject(ContentService);
  protected items$!: Observable<Testimonial[]>;
  get c() { return this.block.content; }

  ngOnInit() { this.items$ = this.content.testimonials(this.c.limit || undefined); }
}
