import { BlockType } from '../../core/models';

/** Description déclarative d'un champ de formulaire de bloc. */
export interface Field {
  key: string;
  label: string;
  kind: 'text' | 'textarea' | 'number' | 'bool' | 'select' | 'object' | 'list-obj' | 'list-str';
  options?: { value: string; label: string }[];
  fields?: Field[];   // pour 'object' et la forme d'un item de 'list-obj'
  addLabel?: string;  // libellé du bouton d'ajout pour les listes
}

const cta = (key: string, label: string): Field => ({
  key, label, kind: 'object',
  fields: [
    { key: 'label', label: 'Libellé', kind: 'text' },
    { key: 'href', label: 'Lien (ex : /agilite, /#contact, mailto:…)', kind: 'text' },
  ],
});

/** Schéma de `content` pour chaque type de bloc (voir FRONTEND_BRIEF §6). */
export const BLOCK_SCHEMAS: Record<BlockType, Field[]> = {
  hero: [
    { key: 'badge', label: 'Badge', kind: 'text' },
    { key: 'title', label: 'Titre', kind: 'textarea' },
    { key: 'highlight', label: 'Sous-chaîne du titre à colorer en vert', kind: 'text' },
    { key: 'text', label: 'Texte', kind: 'textarea' },
    cta('primary_cta', 'Bouton principal'),
    cta('secondary_cta', 'Bouton secondaire'),
  ],
  page_hero: [
    { key: 'badge', label: 'Badge', kind: 'text' },
    { key: 'title', label: 'Titre', kind: 'text' },
    { key: 'text', label: 'Texte', kind: 'textarea' },
  ],
  stats: [
    {
      key: 'items', label: 'Chiffres clés', kind: 'list-obj', addLabel: 'Ajouter un chiffre',
      fields: [
        { key: 'num', label: 'Valeur', kind: 'text' },
        { key: 'label', label: 'Libellé', kind: 'text' },
      ],
    },
  ],
  cards: [
    { key: 'eyebrow', label: 'Sur-titre', kind: 'text' },
    { key: 'title', label: 'Titre', kind: 'text' },
    { key: 'lead', label: 'Accroche', kind: 'textarea' },
    {
      key: 'items', label: 'Cartes', kind: 'list-obj', addLabel: 'Ajouter une carte',
      fields: [
        { key: 'icon', label: 'Icône (emoji)', kind: 'text' },
        { key: 'title', label: 'Titre', kind: 'text' },
        { key: 'text', label: 'Texte', kind: 'textarea' },
      ],
    },
  ],
  richtext: [
    { key: 'eyebrow', label: 'Sur-titre', kind: 'text' },
    { key: 'title', label: 'Titre', kind: 'text' },
    { key: 'paragraphs', label: 'Paragraphes', kind: 'list-str', addLabel: 'Ajouter un paragraphe' },
    { key: 'certs', label: 'Certifications / tags', kind: 'list-str', addLabel: 'Ajouter un tag' },
  ],
  timeline: [
    { key: 'eyebrow', label: 'Sur-titre', kind: 'text' },
    { key: 'title', label: 'Titre', kind: 'text' },
    {
      key: 'items', label: 'Étapes', kind: 'list-obj', addLabel: 'Ajouter une étape',
      fields: [
        { key: 'step', label: 'N°', kind: 'text' },
        { key: 'title', label: 'Titre', kind: 'text' },
        { key: 'text', label: 'Texte', kind: 'textarea' },
      ],
    },
  ],
  accordion: [
    { key: 'eyebrow', label: 'Sur-titre', kind: 'text' },
    { key: 'title', label: 'Titre', kind: 'text' },
    {
      key: 'items', label: 'Entrées', kind: 'list-obj', addLabel: 'Ajouter une entrée',
      fields: [
        { key: 'title', label: 'Question / titre', kind: 'text' },
        { key: 'text', label: 'Réponse / texte', kind: 'textarea' },
      ],
    },
  ],
  testimonials: [
    { key: 'limit', label: 'Nombre à afficher (0 = tous)', kind: 'number' },
  ],
  logo_wall: [
    { key: 'eyebrow', label: 'Sur-titre', kind: 'text' },
    { key: 'title', label: 'Titre', kind: 'text' },
    {
      key: 'items', label: 'Logos', kind: 'list-obj', addLabel: 'Ajouter un logo',
      fields: [{ key: 'label', label: 'Texte du logo', kind: 'text' }],
    },
  ],
  news_list: [
    { key: 'eyebrow', label: 'Sur-titre', kind: 'text' },
    { key: 'title', label: 'Titre', kind: 'text' },
    { key: 'lead', label: 'Accroche', kind: 'textarea' },
    { key: 'limit', label: 'Nombre à afficher (0 = tous)', kind: 'number' },
  ],
  project_list: [
    { key: 'eyebrow', label: 'Sur-titre', kind: 'text' },
    { key: 'title', label: 'Titre', kind: 'text' },
    { key: 'lead', label: 'Accroche', kind: 'textarea' },
    { key: 'limit', label: 'Nombre à afficher (0 = tous)', kind: 'number' },
    { key: 'filterable', label: 'Afficher les filtres par secteur', kind: 'bool' },
  ],
  partner_list: [
    { key: 'eyebrow', label: 'Sur-titre', kind: 'text' },
    { key: 'title', label: 'Titre', kind: 'text' },
    { key: 'lead', label: 'Accroche', kind: 'textarea' },
    {
      key: 'kind', label: 'Type', kind: 'select',
      options: [
        { value: 'client', label: 'Clients / références' },
        { value: 'association', label: 'Associations soutenues' },
      ],
    },
  ],
  cta: [
    { key: 'title', label: 'Titre', kind: 'text' },
    { key: 'text', label: 'Texte', kind: 'textarea' },
    cta('cta', 'Bouton'),
  ],
  contact_form: [
    { key: 'eyebrow', label: 'Sur-titre', kind: 'text' },
    { key: 'title', label: 'Titre', kind: 'text' },
    { key: 'lead', label: 'Accroche', kind: 'textarea' },
  ],
};

/** Libellés lisibles des types de blocs (pour le sélecteur « + bloc »). */
export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  hero: 'Hero (accueil)',
  page_hero: 'En-tête de page',
  richtext: 'Texte enrichi',
  stats: 'Chiffres clés',
  cards: 'Cartes',
  timeline: 'Frise chronologique',
  accordion: 'Accordéon',
  testimonials: 'Témoignages',
  logo_wall: 'Mur de logos',
  news_list: 'Liste d’actualités',
  project_list: 'Liste de projets',
  partner_list: 'Liste clients / associations',
  cta: 'Appel à l’action',
  contact_form: 'Formulaire de contact',
};

/** Construit un `content` vide conforme au schéma (pour un nouveau bloc). */
export function emptyContent(type: BlockType): any {
  const build = (fields: Field[]): any => {
    const obj: any = {};
    for (const f of fields) {
      switch (f.kind) {
        case 'number': obj[f.key] = 0; break;
        case 'bool': obj[f.key] = false; break;
        case 'object': obj[f.key] = build(f.fields ?? []); break;
        case 'list-obj':
        case 'list-str': obj[f.key] = []; break;
        case 'select': obj[f.key] = f.options?.[0]?.value ?? ''; break;
        default: obj[f.key] = '';
      }
    }
    return obj;
  };
  return build(BLOCK_SCHEMAS[type]);
}
