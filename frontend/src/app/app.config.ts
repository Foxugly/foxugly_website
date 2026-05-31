import { ApplicationConfig, ErrorHandler, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withXsrfConfiguration } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

import { routes } from './app.routes';
import { SentryErrorHandler } from './core/sentry';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(
      withFetch(),
      withXsrfConfiguration({ cookieName: 'csrftoken', headerName: 'X-CSRFToken' }),
    ),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    { provide: ErrorHandler, useClass: SentryErrorHandler },
    provideAnimationsAsync(),
    // PrimeNG (utilisé pour l'upload de fichiers dans l'admin). cssLayer : les
    // styles PrimeNG restent dans une couche basse → ne surchargent pas la charte.
    providePrimeNG({
      theme: { preset: Aura, options: { darkModeSelector: false, cssLayer: { name: 'primeng' } } },
    }),
  ],
};
