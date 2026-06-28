import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { MarketService } from '../../core/services/market.service';
import { OperationService } from '../../core/services/operation.service';
import { AuthUser } from '../../shared/models/auth.models';
import { Operation, OperationStatus } from '../../shared/models/operation.models';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, FormsModule, RouterModule],
  templateUrl: './history.html',
  styleUrl: './history.scss'
})
export class HistoryComponent implements OnInit {
  user: AuthUser | null = null;
  symbols: string[] = [];
  operations: Operation[] = [];
  selectedOperation: Operation | null = null;
  selectedSymbol = '';
  selectedStatus: OperationStatus | '' = 'cerrada';
  dateFrom = '';
  dateTo = '';
  loading = false;
  errorMessage = '';

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
    this.loadHistory();
  }

  loadSymbols(): void {
    this.marketService.getSymbols().subscribe({
      next: (response) => {
        this.symbols = response.symbols ?? [];
        this.changeDetectorRef.detectChanges();
      },
      error: () => {
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  loadHistory(): void {
    this.loading = true;
    this.errorMessage = '';

    this.operationService.getOperations({
      symbol: this.selectedSymbol,
      status: this.selectedStatus,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo
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
        this.errorMessage = error.error?.message || 'No se pudo cargar el historial.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  clearFilters(): void {
    this.selectedSymbol = '';
    this.selectedStatus = 'cerrada';
    this.dateFrom = '';
    this.dateTo = '';
    this.loadHistory();
  }

  selectOperation(operation: Operation): void {
    this.selectedOperation = operation;
    this.changeDetectorRef.detectChanges();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getClosedCount(): number {
    return this.operations.filter((item) => item.status === 'cerrada').length;
  }

  getWinningCount(): number {
    return this.operations.filter((item) => this.getOperationResult(item) > 0).length;
  }

  getWinRate(): number {
    if (!this.operations.length) {
      return 0;
    }

    return Math.round((this.getWinningCount() / this.operations.length) * 100);
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
