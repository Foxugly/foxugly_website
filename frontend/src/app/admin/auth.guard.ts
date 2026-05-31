import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '../core/auth.service';

/** Protège les routes admin : exige une session staff, sinon redirige vers login. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const deny = () => router.parseUrl('/admin/login');

  if (auth.loaded()) {
    return auth.isAdmin() ? true : deny();
  }
  return auth.me().pipe(
    map(u => (u.is_staff ? true : deny())),
    catchError(() => of(deny())),
  );
};
