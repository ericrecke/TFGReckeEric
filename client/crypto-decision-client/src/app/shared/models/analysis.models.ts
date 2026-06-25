import { MarketData, TechnicalIndicator } from './market.models';

export interface RiskParametersRequest {
  symbol: string;
  timeframe: string;
  strategy: string;
  capital: number;
  maxRiskPercent: number;
  stopLossPercent: number;
  takeProfitPercent: number;
}

export interface Recommendation {
  _id?: string;
  symbol?: string;
  result: 'COMPRAR' | 'ESPERAR' | 'VENDER';
  confidencePercent: number;
  riskLevel: 'Bajo' | 'Medio' | 'Alto';
  reason: string;
  disclaimer?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnalysisResult {
  _id: string;
  symbol: string;
  timeframe: string;
  strategy: string;
  riskParameters: RiskParametersRequest;
  recommendation: Recommendation;
  createdAt: string;
  updatedAt: string;
}

export interface RiskParametersResponse {
  message: string;
  data: RiskParametersRequest;
}

export interface GenerateAnalysisResponse {
  message: string;
  data: AnalysisResult;
  marketData: MarketData;
  indicator?: TechnicalIndicator;
  recommendation: Recommendation;
}
