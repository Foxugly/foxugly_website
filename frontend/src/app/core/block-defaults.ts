/**
 * Constantes partagées des blocs : une seule source de vérité pour le rendu
 * public ET l'aperçu admin (block-preview), afin d'éviter toute divergence.
 */

/** Cartes flottantes du hero, utilisées si `content.cards` n'est pas défini. */
export const HERO_DEFAULT_CARDS = [
  { icon: '🚀', label: 'Time-to-market', value: '−40 % en moyenne' },
  { icon: '🤝', label: 'Équipes coachées', value: '+120 squads' },
  { icon: '📈', label: 'Satisfaction', value: '4,9 / 5' },
];

/** Palette cyclique des pastilles d'icônes (blocs cards, hero). */
export const CARD_COLOR_PALETTE = ['bg-orange', 'bg-violet', 'bg-teal', 'bg-pink'];

/** Mappe une catégorie d'actualité vers la classe de couleur du tag. */
export const NEWS_CATEGORY_TAG: Record<string, string> = {
  'Événement': 'orange',
  'Article': 'teal',
  'Atelier': 'indigo',
};
