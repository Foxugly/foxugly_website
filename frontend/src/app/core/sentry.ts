import { ErrorHandler, Injectable } from '@angular/core';
import * as Sentry from '@sentry/browser';

import { SENTRY_DSN, SENTRY_ENV, SENTRY_RELEASE } from './sentry.config';

/** Initialise Sentry si un DSN est configuré (no-op sinon). Appelé dans main.ts. */
export function initSentry(): void {
  if (!SENTRY_DSN) {
    return;
  }
  // Ne pas initialiser Sentry en dev local (`ng serve` sur localhost) : les
  // artefacts du serveur de dev (rechargement de chunk HMR, backend de dev
  // indisponible) ne sont pas du signal de prod et seraient remontés tagués
  // `production` (SENTRY_ENV est figé à 'production' dans sentry.config).
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
    return;
  }
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENV,
    release: SENTRY_RELEASE || undefined,
    // Transitoire et bénin : un client gardant un onglet périmé après un
    // nouveau déploiement échoue à charger un lazy-chunk renommé. Non
    // actionnable — ne pas le remonter.
    ignoreErrors: [
      /Failed to fetch dynamically imported module/i,
      /error loading dynamically imported module/i,
    ],
  });
}

/** Remonte les erreurs Angular non gérées à Sentry (si activé), et les loggue. */
@Injectable()
export class SentryErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if (SENTRY_DSN) {
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
    }
    console.error(error);
  }
}
