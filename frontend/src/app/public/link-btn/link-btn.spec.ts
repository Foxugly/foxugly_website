import { LinkBtn } from './link-btn';

describe('LinkBtn', () => {
  const make = (href: string) => { const b = new LinkBtn(); b.href = href; return b; };

  it('détecte les liens externes (mailto/http) vs internes', () => {
    expect(make('mailto:a@b.c').external).toBe(true);
    expect(make('https://x.com').external).toBe(true);
    expect(make('https://x.com').isHttp).toBe(true);
    expect(make('/agilite').external).toBe(false);
  });

  it('résout path et fragment des liens internes', () => {
    const b = make('/#contact');
    expect(b.path).toBe('/accueil');
    expect(b.fragment).toBe('contact');

    expect(make('/projets').path).toBe('/projets');
    expect(make('/projets').fragment).toBeUndefined();
  });
});
