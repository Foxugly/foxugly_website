/**
 * Configuration Sentry du frontend.
 *
 * Le DSN d'un SPA est PUBLIC (conçu pour vivre dans le code client) : sans risque
 * à committer. Laisser vide pour désactiver Sentry. Renseigner le DSN du projet
 * « frontend » Sentry pour l'activer (build CI inclus).
 */
export const SENTRY_DSN = 'https://348c4c8b06069290d3ac0e3319583901@o4511389786701824.ingest.de.sentry.io/4511484939468880';
export const SENTRY_ENV = 'production';

// Version déployée, pour corréler une erreur Sentry au commit. Remplacé au build
// CI (sed) par le SHA du commit ; vide en dev → pas de release taguée. Ne pas
// reformater cette ligne : la CI la cible littéralement.
export const SENTRY_RELEASE = '';
