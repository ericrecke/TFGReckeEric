import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Recommendation,
  RecommendationsResponse
} from '../../shared/models/analysis.models';

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  private readonly apiUrl = 'http://localhost:3000/api/recommendations';

  constructor(private http: HttpClient) {}

  getRecommendations(filters?: { symbol?: string; type?: string }): Observable<RecommendationsResponse> {
    let params = new HttpParams();

    if (filters?.symbol) {
      params = params.set('symbol', filters.symbol);
    }

    if (filters?.type) {
      params = params.set('type', filters.type);
    }

    return this.http.get<RecommendationsResponse>(this.apiUrl, { params });
  }

  getRecommendationById(id: string): Observable<{ message: string; data: Recommendation }> {
    return this.http.get<{ message: string; data: Recommendation }>(`${this.apiUrl}/${id}`);
  }
}
