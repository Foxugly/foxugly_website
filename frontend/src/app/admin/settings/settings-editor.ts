import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminApiService } from '../../core/admin-api.service';
import { SiteSettings } from '../../core/models';

@Component({
  selector: 'app-admin-settings',
  imports: [FormsModule],
  template: `
    <div class="admin-head">
      <div><h1>Réglages du site</h1><p class="sub">Nom de marque, accroche, contact, pied de page.</p></div>
    </div>

    @if (settings(); as s) {
      <div class="panel" style="max-width:640px;">
        <div class="form-grid cols-2">
          <div class="field"><label for="set_brand_name">Nom de marque</label>
            <input id="set_brand_name" [ngModel]="s.brand_name" (ngModelChange)="s.brand_name = $event" /></div>
          <div class="field"><label for="set_tagline">Accroche</label>
            <input id="set_tagline" [ngModel]="s.tagline" (ngModelChange)="s.tagline = $event" /></div>
        </div>
        <div class="form-grid cols-2">
          <div class="field"><label for="set_contact_email">Email de contact</label>
            <input id="set_contact_email" type="email" [ngModel]="s.contact_email" (ngModelChange)="s.contact_email = $event" /></div>
          <div class="field"><label for="set_phone">Téléphone</label>
            <input id="set_phone" [ngModel]="s.phone" (ngModelChange)="s.phone = $event" /></div>
        </div>
        <div class="field"><label for="set_address">Adresse</label>
          <textarea id="set_address" rows="2" [ngModel]="s.address" (ngModelChange)="s.address = $event"></textarea></div>
        <div class="form-grid cols-2">
          <div class="field"><label for="set_vat_number">Numéro de TVA</label>
            <input id="set_vat_number" [ngModel]="s.vat_number" (ngModelChange)="s.vat_number = $event" /></div>
          <div class="field"><label for="set_bank_account">Numéro de compte (IBAN)</label>
            <input id="set_bank_account" [ngModel]="s.bank_account" (ngModelChange)="s.bank_account = $event" /></div>
        </div>
        <div class="form-grid cols-2">
          <div class="field"><label for="set_linkedin_url">LinkedIn</label>
            <input id="set_linkedin_url" [ngModel]="s.linkedin_url" (ngModelChange)="s.linkedin_url = $event" /></div>
          <div class="field"></div>
        </div>
        <div class="field"><label for="set_footer_text">Texte du pied de page</label>
          <textarea id="set_footer_text" rows="3" [ngModel]="s.footer_text" (ngModelChange)="s.footer_text = $event"></textarea></div>

        <div class="toolbar" style="margin-top:.6rem;">
          <button class="btn btn-primary btn-sm" (click)="save(s)" [disabled]="saving()">
            {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
          @if (saved()) { <span class="badge on">Enregistré ✓</span> }
        </div>
      </div>
    }
  `,
})
export class SettingsEditor {
  private api = inject(AdminApiService);
  protected settings = signal<SiteSettings | null>(null);
  protected saving = signal(false);
  protected saved = signal(false);

  constructor() { this.api.settings().subscribe(s => this.settings.set(s)); }

  save(s: SiteSettings) {
    this.saving.set(true);
    this.saved.set(false);
    this.api.updateSettings(s).subscribe({
      next: () => { this.saving.set(false); this.saved.set(true); },
      error: () => this.saving.set(false),
    });
  }
}
