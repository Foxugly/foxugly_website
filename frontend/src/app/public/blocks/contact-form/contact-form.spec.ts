import { TestBed } from '@angular/core/testing';

import { ContactForm } from './contact-form';
import { ContentService } from '../../../core/content.service';
import { Block } from '../../../core/models';
import { of } from 'rxjs';

describe('ContactForm', () => {
  const make = (sendImpl?: any) => {
    TestBed.configureTestingModule({
      providers: [{ provide: ContentService, useValue: { sendContact: sendImpl ?? (() => of({ detail: 'ok' })) } }],
    });
    const cf = TestBed.runInInjectionContext(() => new ContactForm());
    cf.block = { content: {} } as Block;
    return cf;
  };

  it('signale les champs requis manquants et n’envoie pas', () => {
    const send = vi.fn();
    const cf = make(send);
    (cf as any).submit();
    expect((cf as any).errors().name).toBeTruthy();
    expect((cf as any).errors().email).toBeTruthy();
    expect((cf as any).errors().message).toBeTruthy();
    expect(send).not.toHaveBeenCalled();
  });

  it('rejette un email mal formé', () => {
    const cf = make();
    (cf as any).model = { name: 'A', email: 'pasunemail', subject: '', message: 'Bonjour' };
    (cf as any).submit();
    expect((cf as any).errors().email).toContain('invalide');
  });

  it('envoie quand tout est valide et affiche la confirmation', () => {
    const send = vi.fn(() => of({ detail: 'Merci' }));
    const cf = make(send);
    (cf as any).model = { name: 'A', email: 'a@b.com', subject: '', message: 'Bonjour' };
    (cf as any).submit();
    expect(send).toHaveBeenCalledOnce();
    expect((cf as any).sent()).toBe(true);
    expect((cf as any).confirmation()).toBe('Merci');
  });

  it('clear() efface l’erreur d’un champ corrigé', () => {
    const cf = make();
    (cf as any).submit();
    expect((cf as any).errors().name).toBeTruthy();
    (cf as any).clear('name');
    expect((cf as any).errors().name).toBeUndefined();
  });
});
