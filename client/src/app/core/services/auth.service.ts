import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  AuthUser,
  RefreshTokenResponse
} from '../../shared/models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:3000/api/auth';
  private readonly tokenKey = 'crypto_decision_token';
  private readonly refreshTokenKey = 'crypto_decision_refresh_token';
  private readonly userKey = 'crypto_decision_user';

  constructor(private http: HttpClient) { }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, data);
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, data).pipe(
      tap((response) => this.storeSession(response))
    );
  }

  refreshToken(): Observable<RefreshTokenResponse> {
    return this.http.post<RefreshTokenResponse>(`${this.apiUrl}/refresh`, {
      refreshToken: this.getRefreshToken()
    }).pipe(
      tap((response) => this.storeSession(response))
    );
  }

  getProfile(): Observable<any> {
    const token = this.getToken();

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get(`${this.apiUrl}/profile`, { headers });
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  getCurrentUser(): AuthUser | null {
    const user = localStorage.getItem(this.userKey);

    if (!user) {
      return null;
    }

    try {
      return JSON.parse(user);
    } catch {
      this.logout();
      return null;
    }
  }

  isAuthenticated(): boolean {
    return this.hasValidAccessToken() || this.hasValidRefreshToken();
  }

  hasValidAccessToken(): boolean {
    return this.isTokenValid(this.getToken());
  }

  hasValidRefreshToken(): boolean {
    return this.isTokenValid(this.getRefreshToken());
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
  }

  private storeSession(response: LoginResponse): void {
    localStorage.setItem(this.tokenKey, response.token);
    localStorage.setItem(this.refreshTokenKey, response.refreshToken);
    localStorage.setItem(this.userKey, JSON.stringify(response.user));
  }

  private isTokenValid(token: string | null): boolean {
    if (!token) {
      return false;
    }

    try {
      const payload = token.split('.')[1];

      if (!payload) {
        return false;
      }

      const normalizedPayload = payload
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(payload.length / 4) * 4, '=');
      const decoded = JSON.parse(atob(normalizedPayload)) as { exp?: number };

      return typeof decoded.exp === 'number' && decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
