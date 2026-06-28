import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  MarketCandlesResponse,
  MarketDataResponse,
  MarketHistoryResponse,
  MarketSummaryResponse,
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

  getMarketSummary(): Observable<MarketSummaryResponse> {
    return this.http.get<MarketSummaryResponse>(
      `${this.apiUrl}/summary`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  getMarketLive(): Observable<MarketSummaryResponse> {
    return this.http.get<MarketSummaryResponse>(
      `${this.apiUrl}/live`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  getMarketLiveBySymbol(symbol: string): Observable<MarketDataResponse> {
    return this.http.get<MarketDataResponse>(
      `${this.apiUrl}/live/${symbol}`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  getMarketHistory(symbol: string, period = '1H'): Observable<MarketHistoryResponse> {
    return this.http.get<MarketHistoryResponse>(
      `${this.apiUrl}/${symbol}/history`,
      {
        headers: this.getAuthHeaders(),
        params: {
          period
        }
      }
    );
  }

  getMarketCandles(symbol: string, period = '1H', limit = 1000): Observable<MarketCandlesResponse> {
    return this.http.get<MarketCandlesResponse>(
      `${this.apiUrl}/${symbol}/candles`,
      {
        headers: this.getAuthHeaders(),
        params: {
          period,
          limit
        }
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
