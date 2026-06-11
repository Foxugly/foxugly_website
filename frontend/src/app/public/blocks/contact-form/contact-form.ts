import { Component, Input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Block } from '../../../core/models';
import { ContentService } from '../../../core/content.service';

/** Validation email légère (le backend revalide via EmailField). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = { name?: string; email?: string; message?: string };

@Component({
  selector: 'app-contact-form',
  imports: [FormsModule],
  template: `
    <section class="block" [class.soft]="soft" [id]="block.anchor || null">
      <div class="wrap">
        <div class="block-head text-center">
          @if (c.eyebrow) { <span class="eyebrow">{{ c.eyebrow }}</span> }
          <h2 class="section-title">{{ c.title || 'Me contacter' }}</h2>
          @if (c.lead) { <div class="section-lead center-block rich" [innerHTML]="c.lead"></div> }
        </div>

        @if (sent()) {
          <div class="form-card text-center">
            <div class="card-ico bg-orange center-block" style="margin-bottom:1rem;">✓</div>
            <h3 style="margin-bottom:.4rem;">Message envoyé</h3>
            <p style="color:var(--ink-soft);">{{ confirmation() }}</p>
          </div>
        } @else {
          <form class="form-card" novalidate (ngSubmit)="submit()">
            <div class="field">
              <label for="cf-name">Nom</label>
              <input id="cf-name" name="name" [(ngModel)]="model.name" (ngModelChange)="clear('name')"
                     autocomplete="name" [attr.aria-invalid]="!!errors().name"
                     [attr.aria-describedby]="errors().name ? 'cf-name-err' : null" />
              @if (errors().name) { <span id="cf-name-err" class="field-error">{{ errors().name }}</span> }
            </div>
            <div class="field">
              <label for="cf-email">Email</label>
              <input id="cf-email" name="email" type="email" [(ngModel)]="model.email" (ngModelChange)="clear('email')"
                     autocomplete="email" [attr.aria-invalid]="!!errors().email"
                     [attr.aria-describedby]="errors().email ? 'cf-email-err' : null" />
              @if (errors().email) { <span id="cf-email-err" class="field-error">{{ errors().email }}</span> }
            </div>
            <div class="field">
              <label for="cf-subject">Sujet (optionnel)</label>
              <input id="cf-subject" name="subject" [(ngModel)]="model.subject" />
            </div>

            <!-- Honeypot anti-spam : masqué et hors tabulation ; un humain ne le
                 remplit jamais. S'il est rempli, le backend ignore le message. -->
            <div aria-hidden="true" style="position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden;">
              <label for="cf-website">Ne pas remplir</label>
              <input id="cf-website" name="website" type="text" tabindex="-1"
                     autocomplete="off" [(ngModel)]="model.website" />
            </div>
            <div class="field">
              <label for="cf-message">Message</label>
              <textarea id="cf-message" name="message" rows="5" [(ngModel)]="model.message" (ngModelChange)="clear('message')"
                        [attr.aria-invalid]="!!errors().message"
                        [attr.aria-describedby]="errors().message ? 'cf-message-err' : null"></textarea>
              @if (errors().message) { <span id="cf-message-err" class="field-error">{{ errors().message }}</span> }
            </div>

            @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }

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

  protected model = { name: '', email: '', subject: '', message: '', website: '' };
  protected loading = signal(false);
  protected sent = signal(false);
  protected error = signal('');
  protected confirmation = signal('');
  protected errors = signal<FieldErrors>({});

  /** Efface l'erreur d'un champ dès que l'utilisateur le corrige. */
  clear(field: keyof FieldErrors) {
    if (this.errors()[field]) this.errors.update(e => ({ ...e, [field]: undefined }));
  }

  private validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!this.model.name.trim()) e.name = 'Le nom est requis.';
    if (!this.model.email.trim()) e.email = 'L’email est requis.';
    else if (!EMAIL_RE.test(this.model.email.trim())) e.email = 'Format d’email invalide.';
    if (!this.model.message.trim()) e.message = 'Le message est requis.';
    return e;
  }

  submit() {
    const errs = this.validate();
    this.errors.set(errs);
    if (Object.values(errs).some(Boolean)) return;

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
