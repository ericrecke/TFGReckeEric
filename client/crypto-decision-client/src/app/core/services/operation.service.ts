import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  CloseOperationRequest,
  CreateOperationRequest,
  OperationResponse,
  OperationsResponse
} from '../../shared/models/operation.models';

@Injectable({
  providedIn: 'root'
})
export class OperationService {
  private readonly apiUrl = 'http://localhost:3000/api/operations';

  constructor(private http: HttpClient) {}

  getOperations(filters?: { status?: string; symbol?: string; dateFrom?: string; dateTo?: string }): Observable<OperationsResponse> {
    let params = new HttpParams();

    if (filters?.status) {
      params = params.set('status', filters.status);
    }

    if (filters?.symbol) {
      params = params.set('symbol', filters.symbol);
    }

    if (filters?.dateFrom) {
      params = params.set('dateFrom', filters.dateFrom);
    }

    if (filters?.dateTo) {
      params = params.set('dateTo', filters.dateTo);
    }

    return this.http.get<OperationsResponse>(this.apiUrl, { params });
  }

  createOperation(data: CreateOperationRequest): Observable<OperationResponse> {
    return this.http.post<OperationResponse>(this.apiUrl, data);
  }

  closeOperation(id: string, data: CloseOperationRequest): Observable<OperationResponse> {
    return this.http.patch<OperationResponse>(`${this.apiUrl}/${id}/close`, data);
  }
}
