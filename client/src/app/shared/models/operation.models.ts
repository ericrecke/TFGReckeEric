export type OperationType = 'compra' | 'venta';
export type OperationStatus = 'abierta' | 'cerrada' | 'en seguimiento';

export interface Operation {
  _id: string;
  userId: string;
  symbol: string;
  operationType: OperationType;
  entryPrice: number;
  exitPrice: number | null;
  amount: number;
  status: OperationStatus;
  result: number | null;
  currentPrice?: number | null;
  currentResult?: number | null;
  investedAmount?: number;
  referencePrice?: number | null;
  positionValue?: number | null;
  profitLoss?: number | null;
  profitLossPercent?: number | null;
  priceVariationPercent?: number | null;
  resultType?: 'realized' | 'unrealized';
  holdingTimeMs?: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface CreateOperationRequest {
  symbol: string;
  operationType: OperationType;
  entryPrice: number;
  amount: number;
}

export interface CloseOperationRequest {
  exitPrice: number;
}

export interface OperationsResponse {
  message: string;
  count: number;
  data: Operation[];
  summary: {
    openCount: number;
    closedCount: number;
    investedCapitalOpen: number;
    unrealizedResult: number;
    realizedResult: number;
    totalResult: number;
    updatedAt: string;
  };
}

export interface OperationResponse {
  message: string;
  data: Operation;
}
