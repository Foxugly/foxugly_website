import { ErrorHandler, Injectable } from '@angular/core';
import * as Sentry from '@sentry/browser';

import { SENTRY_DSN, SENTRY_ENV, SENTRY_RELEASE } from './sentry.config';

/** Initialise Sentry si un DSN est configuré (no-op sinon). Appelé dans main.ts. */
export function initSentry(): void {
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: SENTRY_ENV,
      release: SENTRY_RELEASE || undefined,
    });
  }
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
