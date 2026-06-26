import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

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
export class OperationsComponent implements OnInit {
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
  saving = false;
  closing = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private marketService: MarketService,
    private operationService: OperationService,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.user = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadSymbols();
    this.loadOperations();
  }

  loadSymbols(): void {
    this.marketService.getSymbols().subscribe({
      next: (response) => {
        this.symbols = response.symbols ?? [];
        this.formSymbol = this.symbols[0] ?? '';
        this.changeDetectorRef.detectChanges();
      },
      error: () => {
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  loadOperations(): void {
    this.loading = true;
    this.errorMessage = '';

    this.operationService.getOperations({
      symbol: this.selectedSymbol,
      status: this.selectedStatus
    }).pipe(
      finalize(() => {
        this.loading = false;
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: (response) => {
        this.operations = response.data;
        this.selectedOperation = this.operations[0] ?? null;
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
        this.entryPrice = 0;
        this.amount = 0;
        this.selectedStatus = 'abierta';
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
    return this.operations.filter((item) => item.status !== 'cerrada').length;
  }

  getClosedCount(): number {
    return this.operations.filter((item) => item.status === 'cerrada').length;
  }

  getTotalResult(): number {
    return this.operations.reduce((total, item) => total + this.getOperationResult(item), 0);
  }

  getOperationResult(operation: Operation): number {
    return operation.result ?? operation.currentResult ?? 0;
  }

  getStatusLabel(status: OperationStatus): string {
    return status === 'cerrada' ? 'Cerrada' : status === 'en seguimiento' ? 'En seguimiento' : 'Abierta';
  }

  isPositive(value: number): boolean {
    return value >= 0;
  }
}
