import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ContentService } from './content.service';

describe('ContentService', () => {
  let svc: ContentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ContentService, provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(ContentService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('navPages ne garde que les pages show_in_nav', () => {
    let result: any[] = [];
    svc.navPages().subscribe(r => (result = r));
    http.expectOne('/api/pages/').flush({
      count: 2, next: null, previous: null,
      results: [{ slug: 'a', show_in_nav: true }, { slug: 'b', show_in_nav: false }],
    });
    expect(result.length).toBe(1);
    expect(result[0].slug).toBe('a');
  });

  it('sendContact POST vers /api/contact/ avec le payload', () => {
    svc.sendContact({ name: 'X', email: 'x@y.z', message: 'salut' }).subscribe();
    const req = http.expectOne('/api/contact/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.name).toBe('X');
    req.flush({ detail: 'ok' });
  });
});
