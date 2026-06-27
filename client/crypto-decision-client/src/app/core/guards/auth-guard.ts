import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const hasStoredUser = Boolean(authService.getCurrentUser());

  if (authService.hasValidAccessToken() && hasStoredUser) {
    return true;
  }

  if (!authService.hasValidRefreshToken()) {
    authService.logout();
    return router.createUrlTree(['/login']);
  }

  return authService.refreshToken().pipe(
    map(() => true),
    catchError(() => {
      authService.logout();
      return of(router.createUrlTree(['/login']));
    })
  );
};
