import { inject, provideEnvironmentInitializer } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Routes } from '@angular/router';
import Aura from '@openng/optimus-ui-themes/aura';
import { Optimus } from '@openng/optimus-ui/config';

import { loadAdminStyles } from './admin-styles';

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

/**
 * Optimus UI (fork MIT de PrimeNG 21) n'est utilisé que dans l'admin : thème et animations sont fournis ici,
 * dans le chunk admin chargé à la demande, plutôt que dans app.config.ts.
 * `provideOptimus()` passe par un app initializer, qui ne s'exécute pas dans un
 * injecteur de route : on configure donc directement le service (root) Optimus.
 * cssLayer : les styles Optimus UI restent dans une couche basse → ne surchargent
 * pas la charte.
 */
const ADMIN_PROVIDERS = [
  provideAnimationsAsync(),
  provideEnvironmentInitializer(() => {
    inject(Optimus).setConfig({
      theme: { preset: Aura, options: { darkModeSelector: false, cssLayer: { name: 'optimus' } } },
    });
    loadAdminStyles();
  }),
];

const ROUTES: Routes = [
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

export const ADMIN_ROUTES: Routes = [{ path: '', providers: ADMIN_PROVIDERS, children: ROUTES }];
