import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, interval, Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { MarketService } from '../../core/services/market.service';
import { OperationService } from '../../core/services/operation.service';
import { AuthUser } from '../../shared/models/auth.models';
import { Operation, OperationStatus, OperationType } from '../../shared/models/operation.models';

@Component({
  selector: 'app-operations',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, RouterModule],
  templateUrl: './operations.html',
  styleUrl: './operations.scss'
})
export class OperationsComponent implements OnInit, OnDestroy {
  user: AuthUser | null = null;
  symbols: string[] = [];
  operations: Operation[] = [];
  selectedOperation: Operation | null = null;

  selectedSymbol = '';
  selectedStatus = '';
  formSymbol = '';
  operationType: OperationType = 'compra';
  entryPrice = 0;
  amount = 0;
  exitPrice = 0;

  loading = false;
  loadingEntryPrice = false;
  saving = false;
  closing = false;
  errorMessage = '';
  successMessage = '';
  summary = {
    openCount: 0,
    closedCount: 0,
    investedCapitalOpen: 0,
    unrealizedResult: 0,
    realizedResult: 0,
    totalResult: 0,
    updatedAt: ''
  };
  private readonly destroy$ = new Subject<void>();
  private refreshInProgress = false;
  private hasPrefilledSymbol = false;
  private hasPrefilledEntryPrice = false;
  private entryPriceRequestSymbol = '';

  constructor(
    private authService: AuthService,
    private marketService: MarketService,
    private operationService: OperationService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.user = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.applyPrefillFromRoute();
    this.loadSymbols();
    this.loadOperations();
    interval(5000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadOperations(true));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSymbols(): void {
    this.marketService.getSymbols().subscribe({
      next: (response) => {
        this.symbols = response.symbols ?? [];
        if (!this.hasPrefilledSymbol || !this.symbols.includes(this.formSymbol)) {
          this.formSymbol = this.symbols[0] ?? '';
          this.hasPrefilledEntryPrice = false;
        }

        if (!this.hasPrefilledEntryPrice) {
          this.loadCurrentEntryPrice(this.formSymbol);
        }
        this.changeDetectorRef.detectChanges();
      },
      error: () => {
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  loadOperations(silent = false): void {
    if (this.refreshInProgress) {
      if (!silent) {
        setTimeout(() => this.loadOperations(), 300);
      }
      return;
    }

    this.refreshInProgress = true;
    this.loading = !silent;
    if (!silent) {
      this.errorMessage = '';
    }

    this.operationService.getOperations({
      symbol: this.selectedSymbol,
      status: this.selectedStatus
    }).pipe(
      finalize(() => {
        this.refreshInProgress = false;
        this.loading = false;
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: (response) => {
        const selectedId = this.selectedOperation?._id;
        this.operations = response.data;
        this.summary = response.summary;
        this.selectedOperation =
          this.operations.find((operation) => operation._id === selectedId) ??
          this.operations[0] ??
          null;
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'No se pudieron cargar las operaciones.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  createOperation(): void {
    if (!this.formSymbol || this.entryPrice <= 0 || this.amount <= 0) {
      this.errorMessage = 'Complete activo, precio de entrada y cantidad con valores mayores a cero.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.operationService.createOperation({
      symbol: this.formSymbol,
      operationType: this.operationType,
      entryPrice: Number(this.entryPrice),
      amount: Number(this.amount)
    }).pipe(
      finalize(() => {
        this.saving = false;
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.successMessage = 'Operacion registrada correctamente.';
        this.amount = 0;
        this.selectedStatus = 'abierta';
        this.loadCurrentEntryPrice(this.formSymbol);
        this.loadOperations();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'No se pudo registrar la operacion.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  closeSelectedOperation(): void {
    if (!this.selectedOperation || this.exitPrice <= 0) {
      this.errorMessage = 'Ingrese un precio de salida mayor a cero.';
      return;
    }

    this.closing = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.operationService.closeOperation(this.selectedOperation._id, {
      exitPrice: Number(this.exitPrice)
    }).pipe(
      finalize(() => {
        this.closing = false;
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.successMessage = 'Operacion cerrada correctamente.';
        this.exitPrice = 0;
        this.loadOperations();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'No se pudo cerrar la operacion.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  clearFilters(): void {
    this.selectedSymbol = '';
    this.selectedStatus = '';
    this.loadOperations();
  }

  onFormSymbolChange(symbol: string): void {
    this.formSymbol = symbol;
    this.loadCurrentEntryPrice(symbol);
  }

  selectOperation(operation: Operation): void {
    this.selectedOperation = operation;
    this.exitPrice = operation.currentPrice ?? operation.exitPrice ?? 0;
    this.changeDetectorRef.detectChanges();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getOpenCount(): number {
    return this.summary.openCount;
  }

  getClosedCount(): number {
    return this.summary.closedCount;
  }

  getTotalResult(): number {
    return this.summary.totalResult;
  }

  getOperationResult(operation: Operation): number {
    return operation.profitLoss ?? operation.result ?? operation.currentResult ?? 0;
  }

  getOperationResultPercent(operation: Operation): number {
    return operation.profitLossPercent ?? 0;
  }

  getResultLabel(operation: Operation): string {
    if (operation.status === 'cerrada') {
      return this.getOperationResult(operation) >= 0
        ? 'Ganancia realizada'
        : 'Perdida realizada';
    }

    return this.getOperationResult(operation) >= 0
      ? 'Ganancia no realizada'
      : 'Perdida no realizada';
  }

  getHoldingTime(operation: Operation): string {
    const milliseconds = operation.holdingTimeMs ?? 0;
    const totalMinutes = Math.floor(milliseconds / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return `${days}d ${hours}h`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  }

  getStatusLabel(status: OperationStatus): string {
    return status === 'cerrada' ? 'Cerrada' : status === 'en seguimiento' ? 'En seguimiento' : 'Abierta';
  }

  isPositive(value: number): boolean {
    return value >= 0;
  }

  private applyPrefillFromRoute(): void {
    const params = this.activatedRoute.snapshot.queryParamMap;
    const symbol = params.get('symbol')?.toUpperCase();
    const operationType = params.get('operationType') as OperationType | null;
    const entryPrice = Number(params.get('entryPrice') ?? 0);
    const amount = Number(params.get('amount') ?? 0);

    if (symbol) {
      this.formSymbol = symbol;
      this.selectedSymbol = symbol;
      this.hasPrefilledSymbol = true;
    }

    if (operationType === 'compra' || operationType === 'venta') {
      this.operationType = operationType;
    }

    if (entryPrice > 0) {
      this.entryPrice = Number(entryPrice.toFixed(8));
      this.hasPrefilledEntryPrice = true;
    }

    if (amount > 0) {
      this.amount = Number(amount.toFixed(8));
    }
  }

  private loadCurrentEntryPrice(symbol: string): void {
    if (!symbol) {
      this.entryPrice = 0;
      return;
    }

    this.entryPriceRequestSymbol = symbol;
    this.loadingEntryPrice = true;
    this.entryPrice = 0;

    this.marketService.getMarketLiveBySymbol(symbol).pipe(
      finalize(() => {
        if (this.entryPriceRequestSymbol === symbol) {
          this.loadingEntryPrice = false;
          this.changeDetectorRef.detectChanges();
        }
      })
    ).subscribe({
      next: (response) => {
        if (this.formSymbol !== symbol) {
          return;
        }

        this.entryPrice = Number(response.data.price.toFixed(8));
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        if (this.formSymbol !== symbol) {
          return;
        }

        this.errorMessage =
          error.error?.message || 'No se pudo obtener el precio actual del activo.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }
}
