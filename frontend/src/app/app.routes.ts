import { Routes } from '@angular/router';

import { PageRenderer } from './public/page-renderer/page-renderer';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'accueil' },
  { path: 'admin', loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES) },
  { path: ':slug', component: PageRenderer },
];
