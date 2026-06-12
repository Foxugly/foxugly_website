import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let svc: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('login met à jour le signal user et isAdmin', () => {
    svc.login('a@x.com', 'b').subscribe();
    const req = http.expectOne('/api/auth/login/');
    expect(req.request.body.email).toBe('a@x.com');
    req.flush({ is_authenticated: true, email: 'a@x.com', is_staff: true });
    expect(svc.isAdmin()).toBe(true);
    expect(svc.user()?.email).toBe('a@x.com');
  });

  it('requestMagicLink poste l’email', () => {
    svc.requestMagicLink('me@x.com').subscribe();
    const req = http.expectOne('/api/auth/magic-link/');
    expect(req.request.body.email).toBe('me@x.com');
    req.flush({ detail: 'ok' });
  });

  it('magicLogin connecte via token', () => {
    svc.magicLogin('tok').subscribe();
    const req = http.expectOne('/api/auth/magic-login/');
    expect(req.request.body.token).toBe('tok');
    req.flush({ is_authenticated: true, email: 'a@x.com', is_staff: true });
    expect(svc.isAdmin()).toBe(true);
  });
});
