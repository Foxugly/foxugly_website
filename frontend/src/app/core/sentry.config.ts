/**
 * Configuration Sentry du frontend.
 *
 * Le DSN d'un SPA est PUBLIC (conçu pour vivre dans le code client) : sans risque
 * à committer. Laisser vide pour désactiver Sentry. Renseigner le DSN du projet
 * « frontend » Sentry pour l'activer (build CI inclus).
 */
export const SENTRY_DSN = '';
export const SENTRY_ENV = 'production';
