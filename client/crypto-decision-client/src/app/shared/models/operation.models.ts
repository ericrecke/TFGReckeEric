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
}

export interface OperationResponse {
  message: string;
  data: Operation;
}
