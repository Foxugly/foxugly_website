import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable } from '@angular/core';
import type * as SentryNs from '@sentry/browser';

import { SENTRY_DSN, SENTRY_ENV, SENTRY_RELEASE } from './sentry.config';

/** Masque les secrets d'URL (jeton du magic link…) en query string comme en fragment. */
export function scrubUrl(url: string): string {
  return url.replace(/([?&#](?:token|uid|code)=)[^&#]*/gi, '$1[Filtered]');
}

function scrubEvent<T extends SentryNs.Event>(event: T): T {
  if (event.request?.url) {
    event.request.url = scrubUrl(event.request.url);
  }
  return event;
}

/**
 * SDK chargé par import dynamique (~85 ko hors du bundle initial) ; `null` tant
 * que Sentry est désactivé (pas de DSN, dev local).
 */
let sentry: Promise<typeof SentryNs> | null = null;

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
  sentry = import('@sentry/browser').then((Sentry) => {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: SENTRY_ENV,
      release: SENTRY_RELEASE || undefined,
      // SDK 11 : `sendDefaultPii` a disparu au profit de `dataCollection`, dont
      // les défauts sont PLUS larges (IP/utilisateur, cookies, corps). On fixe
      // explicitement la base restrictive de la v10.
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: {
          request: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
          response: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
        },
        httpBodies: [],
        urlQueryParams: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
        genAI: { inputs: false, outputs: false },
        databaseQueryData: false,
        queues: false,
        graphQL: { document: false, variables: false },
      },
      // Transitoire et bénin : un client gardant un onglet périmé après un
      // nouveau déploiement échoue à charger un lazy-chunk renommé. Non
      // actionnable — ne pas le remonter.
      ignoreErrors: [
        /Failed to fetch dynamically imported module/i,
        /error loading dynamically imported module/i,
      ],
      // Aucun jeton dans Sentry : URL de l'événement et breadcrumbs (navigation, xhr).
      beforeSend: (event) => scrubEvent(event),
      beforeSendTransaction: (event) => scrubEvent(event),
      beforeBreadcrumb: (crumb) => {
        const data = crumb.data as Record<string, unknown> | undefined;
        if (data) {
          for (const key of ['url', 'from', 'to']) {
            if (typeof data[key] === 'string') {
              data[key] = scrubUrl(data[key] as string);
            }
          }
        }
        return crumb;
      },
    });
    return Sentry;
  });
}

/**
 * Normalise une erreur pour Sentry. `HttpErrorResponse` n'hérite pas d'`Error` :
 * sans ce cas, `String(err)` donnait un « Error: [object Object] » illisible.
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (error instanceof HttpErrorResponse) {
    const err = new Error(
      `HTTP ${error.status} ${error.statusText || ''} ${scrubUrl(error.url ?? '')}`
        .replace(/\s+/g, ' ')
        .trim(),
    );
    err.name = 'HttpErrorResponse';
    return err;
  }
  return new Error(String(error));
}

/** Remonte les erreurs Angular non gérées à Sentry (si activé), et les loggue. */
@Injectable()
export class SentryErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if (sentry) {
      // Les erreurs survenues avant la fin du chargement attendent le SDK.
      sentry.then((Sentry) => Sentry.captureException(toError(error))).catch(() => undefined);
    }
    console.error(error);
  }
}
