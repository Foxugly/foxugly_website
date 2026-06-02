import { Component, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ContentService } from '../../core/content.service';

@Component({
  selector: 'app-navbar',
  imports: [AsyncPipe, RouterLink, RouterLinkActive],
  template: `
    <nav class="nav">
      <div class="wrap nav-inner">
        <a routerLink="/accueil" class="brand" (click)="close()">
          <img src="assets/logo.svg" alt="foxugly" />
          <span><span class="fox">fox</span><span class="ugly">ugly</span></span>
        </a>

        <div class="nav-links" [class.open]="open()">
          @for (p of (pages$ | async); track p.slug) {
            <a [routerLink]="['/', p.slug]" routerLinkActive="active" (click)="close()">{{ p.nav_label || p.title }}</a>
          }
          <a routerLink="/contact" class="btn btn-primary nav-cta" (click)="close()">Me contacter</a>
          <a routerLink="/admin" routerLinkActive="active" class="nav-admin" (click)="close()">Admin</a>
        </div>

        <button class="nav-burger" type="button" aria-label="Menu" (click)="toggle()">☰</button>
      </div>
    </nav>
  `,
})
export class Navbar {
  private content = inject(ContentService);
  protected pages$ = this.content.navPages();
  protected open = signal(false);

  toggle() { this.open.update(v => !v); }
  close() { this.open.set(false); }
}
