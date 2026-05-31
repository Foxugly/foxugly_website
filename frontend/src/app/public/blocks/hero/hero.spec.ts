import { Hero } from './hero';
import { Block } from '../../../core/models';

describe('Hero', () => {
  const heroWith = (content: any) => {
    const h = new Hero();
    h.block = { content } as Block;
    return h;
  };

  it('découpe le titre autour de la sous-chaîne highlight', () => {
    const h = heroWith({ title: 'On rend vos équipes agiles pour de vrai.', highlight: 'agiles pour de vrai' });
    expect(h.before).toBe('On rend vos équipes ');
    expect(h.after).toBe('.');
  });

  it('renvoie tout le titre si pas de highlight', () => {
    const h = heroWith({ title: 'Titre simple' });
    expect(h.before).toBe('Titre simple');
    expect(h.after).toBe('');
  });
});
