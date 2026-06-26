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
  recommendationType?: 'COMPRAR' | 'ESPERAR' | 'VENDER' | 'OBSERVAR';
  result: 'COMPRAR' | 'ESPERAR' | 'VENDER';
  confidence?: number;
  confidencePercent: number;
  riskLevel: 'Bajo' | 'Medio' | 'Alto';
  reason: string;
  machineLearning?: {
    predictedResult: 'COMPRAR' | 'ESPERAR' | 'VENDER';
    confidencePercent: number;
    probabilities: {
      sell: number;
      hold: number;
      buy: number;
    };
    model: string;
    trainingSamples: number;
  } | null;
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

export interface RecommendationsResponse {
  message: string;
  count: number;
  data: Recommendation[];
}
