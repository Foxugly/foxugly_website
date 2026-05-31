import { Routes } from '@angular/router';

import { adminGuard } from './auth.guard';
import { Login } from './login/login';
import { MagicLogin } from './magic-login/magic-login';
import { AdminShell } from './admin-shell/admin-shell';
import { Dashboard } from './dashboard/dashboard';
import { PagesList } from './pages/pages-list';
import { PageEditor } from './pages/page-editor';
import { VisualEditor } from './pages/visual-editor';
import { CollectionEditor } from './collections/collection-editor';
import { SettingsEditor } from './settings/settings-editor';

export const ADMIN_ROUTES: Routes = [
  { path: 'login', component: Login },
  { path: 'magic', component: MagicLogin },
  // Éditeur visuel : plein écran, hors de l'AdminShell (pas de sidebar).
  // Déclaré AVANT la route AdminShell pour être matché en priorité.
  { path: 'pages/:slug/visual', component: VisualEditor, canActivate: [adminGuard] },
  {
    path: '',
    component: AdminShell,
    canActivate: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: Dashboard },
      { path: 'pages', component: PagesList },
      { path: 'pages/:slug', component: PageEditor },
      { path: 'collections/:resource', component: CollectionEditor },
      { path: 'settings', component: SettingsEditor },
    ],
  },
];
