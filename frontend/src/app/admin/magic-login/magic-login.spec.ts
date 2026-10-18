import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';

import { MagicLogin } from './magic-login';

function setup(fragment: string | null, query: Record<string, string> = {}) {
  TestBed.configureTestingModule({
    imports: [MagicLogin],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { fragment, queryParamMap: new Map(Object.entries(query)) } },
      },
    ],
  });
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  const replace = vi.spyOn(window.history, 'replaceState');
  const fixture = TestBed.createComponent(MagicLogin);
  return { fixture, http: TestBed.inject(HttpTestingController), router, replace };
}

describe('MagicLogin', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lit le jeton dans le fragment, l’efface de l’URL puis le POSTe', () => {
    const { http, router, replace } = setup('token=abc.def:ghi');
    expect(replace).toHaveBeenCalled();
    expect(String(replace.mock.calls[0][2])).not.toContain('abc');
    const req = http.expectOne('/api/auth/magic-login/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.token).toBe('abc.def:ghi');
    req.flush({ is_authenticated: true, email: 'a@x.com', is_staff: true });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin/dashboard');
    http.verify();
  });

  it('sans fragment : erreur, aucune requête', () => {
    const { fixture, http } = setup(null);
    fixture.detectChanges();
    http.expectNone('/api/auth/magic-login/');
    expect(fixture.nativeElement.textContent).toContain('Aucun token');
  });
});
