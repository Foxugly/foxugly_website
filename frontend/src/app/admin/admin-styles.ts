import { SENTRY_RELEASE } from '../core/sentry.config';

/**
 * Feuilles de style tierces réservées à l'admin, émises par `angular.json`
 * (`styles`, `inject: false`) : elles ne pèsent pas sur le site public.
 * Insérées AVANT la feuille globale `styles-*.css` → la charte garde la priorité,
 * comme quand elles étaient listées en tête de `styles`. `?v=` = SHA du build
 * (les fichiers ne sont pas hachés) pour ne pas garder une version périmée en cache.
 */
const ADMIN_STYLES = ['admin-icons', 'admin-grapes', 'admin-quill'] as const;

let loaded = false;

export function loadAdminStyles(doc: Document = document): void {
  if (loaded) return;
  loaded = true;
  const anchor = doc.head.querySelector('link[rel="stylesheet"][href^="styles"]');
  for (const name of ADMIN_STYLES) {
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${name}.css${SENTRY_RELEASE ? `?v=${SENTRY_RELEASE}` : ''}`;
    doc.head.insertBefore(link, anchor);
  }
}
