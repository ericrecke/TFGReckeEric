import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  GenerateAnalysisResponse,
  RiskParametersRequest,
  RiskParametersResponse
} from '../../shared/models/analysis.models';

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  private readonly apiUrl = 'http://localhost:3000/api/analysis';

  constructor(private http: HttpClient) {}

  generateAnalysis(data: RiskParametersRequest): Observable<GenerateAnalysisResponse> {
    return this.http.post<GenerateAnalysisResponse>(`${this.apiUrl}/generate`, data);
  }

  saveRiskParameters(data: RiskParametersRequest): Observable<RiskParametersResponse> {
    return this.http.post<RiskParametersResponse>(`${this.apiUrl}/risk-parameters`, data);
  }
}
