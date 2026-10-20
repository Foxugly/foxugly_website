/**
 * Remplace le contenu de `target` par du HTML analysé dans un document inerte (DOMParser :
 * aucun script exécuté), dépouillé des éléments actifs, des attributs `on*` et des URL
 * `javascript:`. Remplace l'affectation directe de `innerHTML` (audit foxugly M11).
 */
const FORBIDDEN = 'script,iframe,object,embed,link,meta,base,form';

export function setSafeHtml(target: Element, html: string): void {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.body.querySelectorAll(FORBIDDEN).forEach(n => n.remove());
  doc.body.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim().toLowerCase();
      if (name.startsWith('on') || (['href', 'src', 'xlink:href', 'action', 'formaction'].includes(name) && val.startsWith('javascript:'))) {
        el.removeAttribute(attr.name);
      }
    }
  });
  target.replaceChildren(...Array.from(doc.body.childNodes).map(n => target.ownerDocument.importNode(n, true)));
}
