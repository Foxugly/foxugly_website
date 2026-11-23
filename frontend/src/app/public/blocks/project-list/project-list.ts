import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';

import { Block, Project } from '../../../core/models';
import { ContentService } from '../../../core/content.service';

@Component({
  selector: 'app-project-list',
  template: `
    <section class="block" [class.soft]="soft" [id]="block.anchor || null">
      <div class="wrap">
        @if (c.title || c.eyebrow) {
          <div class="block-head text-center">
            @if (c.eyebrow) { <span class="eyebrow">{{ c.eyebrow }}</span> }
            @if (c.title) { <h2 class="section-title">{{ c.title }}</h2> }
            @if (c.lead) { <div class="section-lead center-block rich" [innerHTML]="c.lead"></div> }
          </div>
        }

        @if (c.filterable) {
          <div class="filters">
            <button class="filter-btn" [class.active]="sector() === null" (click)="sector.set(null)">Tous</button>
            @for (s of sectors(); track s) {
              <button class="filter-btn" [class.active]="sector() === s" (click)="sector.set(s)">{{ s }}</button>
            }
          </div>
        }

        <div class="grid grid-3">
          @for (p of visible(); track p.id) {
            <div class="card">
              @if (p.sector) { <span class="tag">{{ p.sector }}</span> }
              <h3 style="margin-top:.8rem;">{{ p.title }}</h3>
              <div class="rich" [innerHTML]="p.description"></div>
              @if (p.result) { <p style="margin-top:1rem;"><span class="tag orange">{{ p.result }}</span></p> }
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class ProjectList implements OnInit {
  @Input({ required: true }) block!: Block;
  @Input() soft = false;
  private content = inject(ContentService);
  get c() { return this.block.content; }

  private all = signal<Project[]>([]);
  protected sector = signal<string | null>(null);

  protected sectors = computed(() =>
    [...new Set(this.all().map(p => p.sector).filter(Boolean))]);

  protected visible = computed(() => {
    const s = this.sector();
    const list = s ? this.all().filter(p => p.sector === s) : this.all();
    const limit = this.c.limit;
    return limit && limit > 0 ? list.slice(0, limit) : list;
  });

  ngOnInit() {
    this.content.projects().subscribe(list => this.all.set(list));
  }
}
