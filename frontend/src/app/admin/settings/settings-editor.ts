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
          <div class="field"><label>Nom de marque</label>
            <input [ngModel]="s.brand_name" (ngModelChange)="s.brand_name = $event" /></div>
          <div class="field"><label>Accroche</label>
            <input [ngModel]="s.tagline" (ngModelChange)="s.tagline = $event" /></div>
        </div>
        <div class="form-grid cols-2">
          <div class="field"><label>Email de contact</label>
            <input type="email" [ngModel]="s.contact_email" (ngModelChange)="s.contact_email = $event" /></div>
          <div class="field"><label>LinkedIn</label>
            <input [ngModel]="s.linkedin_url" (ngModelChange)="s.linkedin_url = $event" /></div>
        </div>
        <div class="field"><label>Texte du pied de page</label>
          <textarea rows="3" [ngModel]="s.footer_text" (ngModelChange)="s.footer_text = $event"></textarea></div>

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
