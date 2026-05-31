import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Bouton/lien intelligent : `routerLink` pour les liens internes (avec gestion
 * du fragment `#ancre`), `<a href>` pour mailto/tel/externe.
 *
 * Exemples de href issus de l'API : "/agilite", "/projets", "/#contact",
 * "mailto:contact@foxugly.com".
 */
@Component({
  selector: 'app-link-btn',
  imports: [RouterLink],
  template: `
    @if (external) {
      <a [href]="href" [class]="cssClass" [attr.target]="isHttp ? '_blank' : null"
         [attr.rel]="isHttp ? 'noopener' : null">{{ label }}</a>
    } @else {
      <a [routerLink]="path" [fragment]="fragment" [class]="cssClass">{{ label }}</a>
    }
  `,
})
export class LinkBtn {
  @Input({ required: true }) href = '';
  @Input() label = '';
  @Input() cssClass = 'btn btn-primary';

  get external(): boolean {
    return /^(mailto:|tel:|https?:)/.test(this.href);
  }
  get isHttp(): boolean {
    return /^https?:/.test(this.href);
  }
  get path(): string {
    const [p] = this.href.split('#');
    if (p === '' || p === '/') return '/accueil';
    return p;
  }
  get fragment(): string | undefined {
    const i = this.href.indexOf('#');
    return i >= 0 ? this.href.slice(i + 1) : undefined;
  }
}
