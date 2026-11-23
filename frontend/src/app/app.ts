import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { Navbar } from './layout/navbar/navbar';
import { Footer } from './layout/footer/footer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer],
  template: `
    @if (!isAdmin()) { <app-navbar /> }
    <main>
      <router-outlet />
    </main>
    @if (!isAdmin()) { <app-footer /> }
  `,
  styleUrl: './app.scss',
})
export class App {
  private router = inject(Router);
  protected isAdmin = signal(this.router.url.startsWith('/admin'));

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => this.isAdmin.set((e as NavigationEnd).urlAfterRedirects.startsWith('/admin')));
  }
}
