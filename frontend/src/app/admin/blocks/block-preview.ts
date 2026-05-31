import { Block } from '../../core/models';

/** Échappe le texte pour une insertion HTML sûre. */
function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Encadré « liste dynamique » pour les blocs alimentés par une collection. */
function dynamicNote(c: any, label: string): string {
  return `
    <div class="block-head text-center">
      ${c.eyebrow ? `<span class="eyebrow">${esc(c.eyebrow)}</span>` : ''}
      ${c.title ? `<h2 class="section-title">${esc(c.title)}</h2>` : ''}
      ${c.lead ? `<p class="section-lead center-block">${esc(c.lead)}</p>` : ''}
    </div>
    <div class="gjs-dyn-note">⤵ ${esc(label)} — contenu tiré de la collection (édité dans « Collections »)</div>`;
}

/**
 * Rend un aperçu HTML d'un bloc avec les classes de la charte, pour le canvas
 * GrapesJS. Volontairement statique (pas de logique Angular) : les listes
 * dynamiques affichent un repère, l'ordre/contenu restant pilotés par le modèle.
 */
export function renderBlockHtml(block: Block): string {
  const c = block.content ?? {};
  switch (block.block_type) {
    case 'hero': {
      const t = String(c.title ?? '');
      const hi = c.highlight ? String(c.highlight) : '';
      const i = hi ? t.indexOf(hi) : -1;
      const title = i >= 0
        ? `${esc(t.slice(0, i))}<span class="hl">${esc(hi)}</span>${esc(t.slice(i + hi.length))}`
        : esc(t);
      return `<header class="hero"><div class="wrap hero-grid"><div>
        ${c.badge ? `<span class="hero-badge"><span class="dot"></span> ${esc(c.badge)}</span>` : ''}
        <h1>${title}</h1>
        <p>${esc(c.text)}</p>
        <div class="hero-actions">
          ${c.primary_cta?.label ? `<a class="btn btn-primary">${esc(c.primary_cta.label)} →</a>` : ''}
          ${c.secondary_cta?.label ? `<a class="btn btn-ghost">${esc(c.secondary_cta.label)}</a>` : ''}
        </div></div>
        <div class="hero-visual">
          <div class="float-card fc1"><span class="ico">🚀</span><div>Time-to-market<small>−40 %</small></div></div>
          <div class="float-card fc2"><span class="ico">🤝</span><div>Équipes<small>+120 squads</small></div></div>
          <div class="float-card fc3"><span class="ico">📈</span><div>Satisfaction<small>4,9 / 5</small></div></div>
        </div></div></header>`;
    }

    case 'page_hero':
      return `<header class="page-hero"><div class="wrap">
        ${c.badge ? `<span class="hero-badge"><span class="dot"></span> ${esc(c.badge)}</span>` : ''}
        <h1>${esc(c.title)}</h1>
        ${c.text ? `<p>${esc(c.text)}</p>` : ''}
      </div></header>`;

    case 'stats':
      return `<section class="block"><div class="wrap stats">
        ${(c.items ?? []).map((s: any) =>
          `<div class="stat"><div class="num">${esc(s.num)}</div><div class="lbl">${esc(s.label)}</div></div>`).join('')}
      </div></section>`;

    case 'cards': {
      const palette = ['bg-orange', 'bg-violet', 'bg-teal', 'bg-pink'];
      const four = (c.items ?? []).length === 4;
      return `<section class="block"><div class="wrap">
        <div class="block-head text-center">
          ${c.eyebrow ? `<span class="eyebrow">${esc(c.eyebrow)}</span>` : ''}
          <h2 class="section-title">${esc(c.title)}</h2>
          ${c.lead ? `<p class="section-lead center-block">${esc(c.lead)}</p>` : ''}
        </div>
        <div class="grid ${four ? 'grid-4' : 'grid-3'}">
          ${(c.items ?? []).map((it: any, k: number) =>
            `<div class="card"><div class="card-ico ${palette[k % palette.length]}">${esc(it.icon)}</div>
             <h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></div>`).join('')}
        </div></div></section>`;
    }

    case 'richtext':
      return `<section class="block"><div class="wrap richtext">
        <div class="block-head">
          ${c.eyebrow ? `<span class="eyebrow">${esc(c.eyebrow)}</span>` : ''}
          <h2 class="section-title">${esc(c.title)}</h2>
        </div>
        ${(c.paragraphs ?? []).map((p: string) => `<p>${esc(p)}</p>`).join('')}
        ${(c.certs ?? []).length ? `<div class="cert-list">${
          (c.certs ?? []).map((t: string) => `<span class="tag orange">${esc(t)}</span>`).join('')}</div>` : ''}
      </div></section>`;

    case 'timeline':
      return `<section class="block"><div class="wrap">
        <div class="block-head text-center">
          ${c.eyebrow ? `<span class="eyebrow">${esc(c.eyebrow)}</span>` : ''}
          <h2 class="section-title">${esc(c.title)}</h2>
        </div>
        <div class="timeline">${(c.items ?? []).map((it: any) =>
          `<div class="tl-item"><div class="tl-dot">${esc(it.step)}</div>
           <div class="tl-body"><h4>${esc(it.title)}</h4><p>${esc(it.text)}</p></div></div>`).join('')}
        </div></div></section>`;

    case 'accordion':
      return `<section class="block"><div class="wrap">
        <div class="block-head text-center">
          ${c.eyebrow ? `<span class="eyebrow">${esc(c.eyebrow)}</span>` : ''}
          <h2 class="section-title">${esc(c.title)}</h2>
        </div>
        <div class="accordion">${(c.items ?? []).map((it: any, k: number) =>
          `<div class="acc-item ${k === 0 ? 'open' : ''}">
             <div class="acc-head">${esc(it.title)} <span class="chev">⌄</span></div>
             <div class="acc-body"><div class="acc-body-inner">${esc(it.text)}</div></div></div>`).join('')}
        </div></div></section>`;

    case 'logo_wall':
      return `<section class="block"><div class="wrap">
        ${(c.title || c.eyebrow) ? `<div class="block-head text-center">
          ${c.eyebrow ? `<span class="eyebrow">${esc(c.eyebrow)}</span>` : ''}
          ${c.title ? `<h2 class="section-title">${esc(c.title)}</h2>` : ''}</div>` : ''}
        <div class="logo-wall">${(c.items ?? []).map((it: any) =>
          `<div class="logo-chip">${esc(it.label)}</div>`).join('')}</div>
      </div></section>`;

    case 'cta':
      return `<section class="block"><div class="wrap"><div class="cta">
        <h2>${esc(c.title)}</h2>
        ${c.text ? `<p>${esc(c.text)}</p>` : ''}
        ${c.cta?.label ? `<a class="btn btn-ghost">${esc(c.cta.label)}</a>` : ''}
      </div></div></section>`;

    case 'testimonials':
      return `<section class="block"><div class="wrap">${dynamicNote(c, 'Témoignages')}</div></section>`;
    case 'news_list':
      return `<section class="block"><div class="wrap">${dynamicNote(c, 'Actualités')}</div></section>`;
    case 'project_list':
      return `<section class="block"><div class="wrap">${dynamicNote(c, 'Projets')}</div></section>`;
    case 'partner_list':
      return `<section class="block"><div class="wrap">${dynamicNote(c, c.kind === 'association' ? 'Associations' : 'Clients')}</div></section>`;

    default:
      return `<section class="block"><div class="wrap"><p>${esc(block.block_type)}</p></div></section>`;
  }
}
