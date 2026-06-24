import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  MarketDataResponse,
  MarketHistoryResponse,
  MarketSymbolsResponse
} from '../../shared/models/market.models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class MarketService {
  private readonly apiUrl = 'http://localhost:3000/api/market';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getSymbols(): Observable<MarketSymbolsResponse> {
    return this.http.get<MarketSymbolsResponse>(
      `${this.apiUrl}/symbols`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  getMarketData(symbol: string): Observable<MarketDataResponse> {
    return this.http.get<MarketDataResponse>(
      `${this.apiUrl}/${symbol}`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  getMarketHistory(symbol: string): Observable<MarketHistoryResponse> {
    return this.http.get<MarketHistoryResponse>(
      `${this.apiUrl}/${symbol}/history`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }
}