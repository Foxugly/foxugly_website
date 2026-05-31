import { Component, Input, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';

import { Block, Partner } from '../../../core/models';
import { ContentService } from '../../../core/content.service';

@Component({
  selector: 'app-partner-list',
  imports: [AsyncPipe],
  template: `
    <section class="block" [class.soft]="soft" [id]="block.anchor || null">
      <div class="wrap">
        @if (c.title || c.eyebrow) {
          <div class="block-head text-center">
            @if (c.eyebrow) { <span class="eyebrow">{{ c.eyebrow }}</span> }
            @if (c.title) { <h2 class="section-title">{{ c.title }}</h2> }
            @if (c.lead) { <p class="section-lead center-block">{{ c.lead }}</p> }
          </div>
        }
        <div class="grid" [class.grid-4]="c.kind === 'client'" [class.grid-3]="c.kind !== 'client'">
          @for (p of (partners$ | async); track p.id) {
            <div class="partner-card">
              @if (p.logo) {
                <img class="partner-logo partner-logo--img" [src]="p.logo" [alt]="p.name" />
              } @else {
                <div class="partner-logo">{{ initials(p.name) }}</div>
              }
              <h4>{{ p.name }}</h4>
              @if (p.support_type) { <span class="tag orange">{{ p.support_type }}</span> }
              @if (p.sector_or_cause) { <span class="tag">{{ p.sector_or_cause }}</span> }
              @if (p.description) { <p>{{ p.description }}</p> }
              @if (p.link) { <a class="partner-link" [href]="p.link" target="_blank" rel="noopener">En savoir plus →</a> }
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class PartnerList implements OnInit {
  @Input({ required: true }) block!: Block;
  @Input() soft = false;
  private content = inject(ContentService);
  protected partners$!: Observable<Partner[]>;
  get c() { return this.block.content; }

  ngOnInit() { this.partners$ = this.content.partners(this.c.kind); }

  initials(name: string): string {
    return name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }
}
