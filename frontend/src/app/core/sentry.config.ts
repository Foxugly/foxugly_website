/**
 * Configuration Sentry du frontend.
 *
 * Le DSN d'un SPA est PUBLIC (conçu pour vivre dans le code client) : sans risque
 * à committer. Laisser vide pour désactiver Sentry. Renseigner le DSN du projet
 * « frontend » Sentry pour l'activer (build CI inclus).
 */
export const SENTRY_DSN = 'https://348c4c8b06069290d3ac0e3319583901@o4511389786701824.ingest.de.sentry.io/4511484939468880';
export const SENTRY_ENV = 'production';
