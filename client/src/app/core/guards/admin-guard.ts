import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const currentUser = authService.getCurrentUser();

  if (authService.hasValidAccessToken()) {
    return currentUser?.role === 'admin'
      ? true
      : router.createUrlTree(['/dashboard']);
  }

  if (!authService.hasValidRefreshToken()) {
    authService.logout();
    return router.createUrlTree(['/login']);
  }

  return authService.refreshToken().pipe(
    map((response) => response.user.role === 'admin'
      ? true
      : router.createUrlTree(['/dashboard'])),
    catchError(() => {
      authService.logout();
      return of(router.createUrlTree(['/login']));
    })
  );
};
