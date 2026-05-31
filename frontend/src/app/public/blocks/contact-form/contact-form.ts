import { Component, Input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Block } from '../../../core/models';
import { ContentService } from '../../../core/content.service';

@Component({
  selector: 'app-contact-form',
  imports: [FormsModule],
  template: `
    <section class="block" [class.soft]="soft" [id]="block.anchor || null">
      <div class="wrap">
        <div class="block-head text-center">
          @if (c.eyebrow) { <span class="eyebrow">{{ c.eyebrow }}</span> }
          <h2 class="section-title">{{ c.title || 'Me contacter' }}</h2>
          @if (c.lead) { <p class="section-lead center-block">{{ c.lead }}</p> }
        </div>

        @if (sent()) {
          <div class="form-card text-center">
            <div class="card-ico bg-orange center-block" style="margin-bottom:1rem;">✓</div>
            <h3 style="margin-bottom:.4rem;">Message envoyé</h3>
            <p style="color:var(--ink-soft);">{{ confirmation() }}</p>
          </div>
        } @else {
          <form class="form-card" (ngSubmit)="submit()">
            <div class="field">
              <label for="cf-name">Nom</label>
              <input id="cf-name" name="name" [(ngModel)]="model.name" required autocomplete="name" />
            </div>
            <div class="field">
              <label for="cf-email">Email</label>
              <input id="cf-email" name="email" type="email" [(ngModel)]="model.email" required autocomplete="email" />
            </div>
            <div class="field">
              <label for="cf-subject">Sujet (optionnel)</label>
              <input id="cf-subject" name="subject" [(ngModel)]="model.subject" />
            </div>
            <div class="field">
              <label for="cf-message">Message</label>
              <textarea id="cf-message" name="message" rows="5" [(ngModel)]="model.message" required></textarea>
            </div>

            @if (error()) { <p style="color:#dc2626; font-size:.9rem; margin-bottom:1rem;">{{ error() }}</p> }

            <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center;"
                    [disabled]="loading()">
              {{ loading() ? 'Envoi…' : 'Envoyer le message' }}
            </button>
          </form>
        }
      </div>
    </section>
  `,
})
export class ContactForm {
  @Input({ required: true }) block!: Block;
  @Input() soft = false;
  private content = inject(ContentService);
  get c() { return this.block.content ?? {}; }

  protected model = { name: '', email: '', subject: '', message: '' };
  protected loading = signal(false);
  protected sent = signal(false);
  protected error = signal('');
  protected confirmation = signal('');

  submit() {
    if (!this.model.name || !this.model.email || !this.model.message) {
      this.error.set('Merci de remplir le nom, l’email et le message.');
      return;
    }
    this.error.set('');
    this.loading.set(true);
    this.content.sendContact(this.model).subscribe({
      next: (r) => { this.confirmation.set(r.detail); this.sent.set(true); },
      error: () => {
        this.error.set('Envoi impossible pour le moment. Réessaie ou écris directement par email.');
        this.loading.set(false);
      },
    });
  }
}
