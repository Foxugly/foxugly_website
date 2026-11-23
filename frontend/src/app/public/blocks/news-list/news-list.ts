import { Component, Input, OnInit, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { Observable } from 'rxjs';

import { Block, News } from '../../../core/models';
import { ContentService } from '../../../core/content.service';
import { NEWS_CATEGORY_TAG } from '../../../core/block-defaults';

@Component({
  selector: 'app-news-list',
  imports: [AsyncPipe, DatePipe],
  template: `
    <section class="block" [class.soft]="soft" [id]="block.anchor || null">
      <div class="wrap">
        <div class="block-head">
          @if (c.eyebrow) { <span class="eyebrow">{{ c.eyebrow }}</span> }
          <h2 class="section-title">{{ c.title }}</h2>
          @if (c.lead) { <div class="section-lead rich" [innerHTML]="c.lead"></div> }
        </div>
        <div class="grid grid-3">
          @for (n of (news$ | async); track n.id) {
            <article class="card">
              @if (n.category) { <span class="tag" [class]="tagClass(n.category)">{{ n.category }}</span> }
              <h3 style="margin-top:.8rem;">{{ n.title }}</h3>
              <div class="rich" [innerHTML]="n.excerpt"></div>
              <p style="margin-top:1rem; color:var(--muted); font-size:.85rem;">
                @if (n.date) { {{ n.date | date:'d MMMM y' }} }
                @if (n.date && n.read_time) { · } {{ n.read_time }}
              </p>
            </article>
          }
        </div>
      </div>
    </section>
  `,
})
export class NewsList implements OnInit {
  @Input({ required: true }) block!: Block;
  @Input() soft = false;
  private content = inject(ContentService);
  protected news$!: Observable<News[]>;
  get c() { return this.block.content; }

  ngOnInit() { this.news$ = this.content.news(this.c.limit || undefined); }

  tagClass(category: string): string {
    return NEWS_CATEGORY_TAG[category] ?? '';
  }
}
