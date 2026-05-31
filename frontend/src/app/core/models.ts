/** Modèles TypeScript miroir de l'API DRF (voir FRONTEND_BRIEF.md §5-6). */

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Cta {
  label: string;
  href: string;
}

/** Page « légère » pour la navigation. */
export interface PageNav {
  id: number;
  slug: string;
  title: string;
  nav_label: string;
  order: number;
  show_in_nav: boolean;
  is_published: boolean;
}

/** Page complète avec ses blocs. */
export interface PageDetail extends PageNav {
  seo_title: string;
  seo_description: string;
  blocks: Block[];
}

/** Enveloppe commune d'un bloc. `content` varie selon `block_type`. */
export interface Block {
  id: number;
  page?: number;
  block_type: BlockType;
  block_type_display: string;
  order: number;
  is_visible: boolean;
  anchor: string;
  content: any;
}

export type BlockType =
  | 'hero' | 'page_hero' | 'richtext' | 'stats' | 'cards' | 'timeline'
  | 'accordion' | 'testimonials' | 'logo_wall' | 'news_list'
  | 'project_list' | 'partner_list' | 'cta' | 'contact_form';

export interface ContactPayload {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

/* ---- Collections ---- */

export interface News {
  id: number;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  body: string;
  date: string | null;
  read_time: string;
  order: number;
  is_published?: boolean;
}

export interface Project {
  id: number;
  title: string;
  sector: string;
  description: string;
  result: string;
  order: number;
  is_published?: boolean;
}

export interface Partner {
  id: number;
  name: string;
  kind: 'client' | 'association';
  kind_display: string;
  sector_or_cause: string;
  description: string;
  support_type: string;
  link: string;
  logo: string | null;
  order: number;
  is_published?: boolean;
}

export interface Testimonial {
  id: number;
  quote: string;
  author: string;
  role: string;
  initials: string;
  order: number;
  is_published?: boolean;
}

export interface SiteSettings {
  brand_name: string;
  tagline: string;
  contact_email: string;
  linkedin_url: string;
  footer_text: string;
}
