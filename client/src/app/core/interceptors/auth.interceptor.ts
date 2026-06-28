import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const isAuthEndpoint = (url: string): boolean => {
  return url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/refresh');
};

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  const authRequest = token && !isAuthEndpoint(request.url)
    ? request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
    : request;

  return next(authRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 403 && error.error?.message === 'User account is inactive') {
        authService.logout();
        router.navigate(['/login']);
        return throwError(() => error);
      }

      if (error.status !== 401 || isAuthEndpoint(request.url) || !authService.getRefreshToken()) {
        if (error.status === 401 && !isAuthEndpoint(request.url)) {
          authService.logout();
          router.navigate(['/login']);
        }

        return throwError(() => error);
      }

      return authService.refreshToken().pipe(
        switchMap((response) => {
          const retryRequest = request.clone({
            setHeaders: {
              Authorization: `Bearer ${response.token}`
            }
          });

          return next(retryRequest);
        }),
        catchError((refreshError) => {
          authService.logout();
          router.navigate(['/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
