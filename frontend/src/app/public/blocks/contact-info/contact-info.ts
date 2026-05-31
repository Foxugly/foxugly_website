import { Component, Input, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';

import { Block } from '../../../core/models';
import { ContentService } from '../../../core/content.service';

@Component({
  selector: 'app-contact-info',
  imports: [AsyncPipe],
  template: `
    <section class="block" [class.soft]="soft" [id]="block.anchor || null">
      <div class="wrap">
        @if (c.title || c.eyebrow) {
          <div class="block-head text-center">
            @if (c.eyebrow) { <span class="eyebrow">{{ c.eyebrow }}</span> }
            @if (c.title) { <h2 class="section-title">{{ c.title }}</h2> }
          </div>
        }
        @if (settings$ | async; as s) {
          <div class="contact-info-grid center-block">
            @if (s.address) {
              <div class="info-item"><span class="info-ico">📍</span>
                <div><strong>Adresse</strong><p>{{ s.address }}</p></div></div>
            }
            @if (s.contact_email) {
              <div class="info-item"><span class="info-ico">✉️</span>
                <div><strong>Email</strong><p><a [href]="'mailto:' + s.contact_email">{{ s.contact_email }}</a></p></div></div>
            }
            @if (s.phone) {
              <div class="info-item"><span class="info-ico">📞</span>
                <div><strong>Téléphone</strong><p><a [href]="'tel:' + s.phone">{{ s.phone }}</a></p></div></div>
            }
            @if (s.vat_number) {
              <div class="info-item"><span class="info-ico">🧾</span>
                <div><strong>N° de TVA</strong><p>{{ s.vat_number }}</p></div></div>
            }
            @if (s.bank_account) {
              <div class="info-item"><span class="info-ico">🏦</span>
                <div><strong>Compte (IBAN)</strong><p>{{ s.bank_account }}</p></div></div>
            }
            @if (s.linkedin_url) {
              <div class="info-item"><span class="info-ico">in</span>
                <div><strong>LinkedIn</strong><p><a [href]="s.linkedin_url" target="_blank" rel="noopener">Profil</a></p></div></div>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class ContactInfo {
  @Input({ required: true }) block!: Block;
  @Input() soft = false;
  private content = inject(ContentService);
  protected settings$ = this.content.settings();
  get c() { return this.block.content ?? {}; }
}
