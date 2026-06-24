export interface MarketData {
  _id?: string;
  symbol: string;
  price: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  highPrice: number;
  lowPrice: number;
  source: string;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MarketSymbolsResponse {
  symbols: string[];
}

export interface TechnicalIndicator {
  _id?: string;
  symbol: string;
  marketData: string;
  sma: number | null;
  ema: number | null;
  rsi: number | null;
  period: number;
  source: string;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MarketDataResponse {
  message: string;
  data: MarketData;
  indicator?: TechnicalIndicator;
}

export interface MarketHistoryResponse {
  symbol: string;
  count: number;
  data: MarketData[];
}
