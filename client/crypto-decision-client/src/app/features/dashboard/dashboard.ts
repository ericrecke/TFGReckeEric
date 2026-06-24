import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, forkJoin, interval, Subject, takeUntil } from 'rxjs';
import type { Chart as ChartType } from 'chart.js';

import { AuthService } from '../../core/services/auth.service';
import { MarketService } from '../../core/services/market.service';
import { MarketData, TechnicalIndicator } from '../../shared/models/market.models';
import { AuthUser } from '../../shared/models/auth.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('priceChart') private priceChartRef?: ElementRef<HTMLCanvasElement>;

  symbols: string[] = [];
  marketData: MarketData[] = [];
  indicators: TechnicalIndicator[] = [];
  selectedChartSymbol = '';
  user: AuthUser | null = null;

  loading = false;
  errorMessage = '';
  chartLoading = false;
  lastUpdatedAt: Date | null = null;

  private priceChart?: ChartType;
  private viewInitialized = false;
  private readonly refreshIntervalMs = 30000;
  private readonly destroy$ = new Subject<void>();
  private marketRefreshInProgress = false;

  constructor(
    private authService: AuthService,
    private marketService: MarketService,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.user = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadSymbolsAndMarketData();
    this.startAutoRefresh();
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.priceChart?.destroy();
  }

  loadSymbolsAndMarketData(): void {
    this.loading = true;
    this.errorMessage = '';

    this.marketService.getSymbols().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.symbols = response.symbols ?? [];
        this.selectedChartSymbol = this.symbols[0] ?? '';
        this.loadMarketData();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error.error?.message || 'No se pudieron obtener los activos disponibles.';
      }
    });
  }

  loadMarketData(): void {
    if (this.marketRefreshInProgress) {
      return;
    }

    this.marketRefreshInProgress = true;
    this.loading = true;
    this.errorMessage = '';

    if (!this.symbols.length) {
      this.marketData = [];
      this.loading = false;
      this.marketRefreshInProgress = false;
      return;
    }

    const requests = this.symbols.map((symbol) =>
      this.marketService.getMarketData(symbol)
    );

    forkJoin(requests).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.marketRefreshInProgress = false;
        this.loading = false;
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: (responses) => {
        this.marketData = responses
          .map((response) => response.data)
          .filter((data): data is MarketData => !!data);
        this.indicators = responses
          .map((response) => response.indicator)
          .filter((indicator): indicator is TechnicalIndicator => !!indicator);
        this.lastUpdatedAt = new Date();
        this.loadPriceChart(this.selectedChartSymbol);
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        this.errorMessage =
          error.error?.message || 'No se pudieron obtener los datos de mercado.';
      }
    });
  }

  refreshMarketData(): void {
    this.loadMarketData();
  }

  loadPriceChart(symbol: string): void {
    if (!symbol) {
      return;
    }

    this.selectedChartSymbol = symbol;
    const requestedSymbol = symbol;
    this.chartLoading = true;

    this.marketService.getMarketHistory(symbol).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.chartLoading = false;
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: (response) => {
        if (this.selectedChartSymbol !== requestedSymbol) {
          return;
        }

        const history = [...response.data].reverse();
        this.renderPriceChart(history);
      },
      error: (error) => {
        this.errorMessage =
          error.error?.message || 'No se pudo obtener el historial para el grafico.';
      }
    });
  }

  private startAutoRefresh(): void {
    interval(this.refreshIntervalMs).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadMarketData();
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isPositiveChange(value: number): boolean {
    return value >= 0;
  }

  getObservedAssetsCount(): number {
    return this.marketData.length;
  }

  getBullishAssetsCount(): number {
    return this.marketData.filter((item) => item.priceChangePercent >= 0).length;
  }

  getBearishAssetsCount(): number {
    return this.marketData.filter((item) => item.priceChangePercent < 0).length;
  }

  getAverageChangePercent(): number | null {
    if (!this.marketData.length) {
      return null;
    }

    const total = this.marketData.reduce((sum, item) => sum + item.priceChangePercent, 0);
    return total / this.marketData.length;
  }

  getTotalVolume(): number {
    return this.marketData.reduce((sum, item) => sum + item.volume, 0);
  }

  getTopPerformer(): MarketData | undefined {
    return [...this.marketData].sort((left, right) => right.priceChangePercent - left.priceChangePercent)[0];
  }

  getWorstPerformer(): MarketData | undefined {
    return [...this.marketData].sort((left, right) => left.priceChangePercent - right.priceChangePercent)[0];
  }

  selectSymbol(symbol: string): void {
    if (this.selectedChartSymbol === symbol) {
      return;
    }

    this.loadPriceChart(symbol);
  }

  getSelectedMarketData(): MarketData | undefined {
    return this.marketData.find((item) => item.symbol === this.selectedChartSymbol);
  }

  getSelectedIndicator(): TechnicalIndicator | undefined {
    return this.getIndicator(this.selectedChartSymbol);
  }

  hasSelectedTechnicalMetrics(): boolean {
    const indicator = this.getSelectedIndicator();

    return Boolean(
      indicator &&
      indicator.sma !== null &&
      indicator.ema !== null &&
      indicator.rsi !== null
    );
  }

  getSelectedRangePercent(): number | null {
    const selectedMarketData = this.getSelectedMarketData();

    if (!selectedMarketData || selectedMarketData.price === 0) {
      return null;
    }

    return ((selectedMarketData.highPrice - selectedMarketData.lowPrice) / selectedMarketData.price) * 100;
  }

  getSelectedPricePositionPercent(): number | null {
    const selectedMarketData = this.getSelectedMarketData();

    if (!selectedMarketData || selectedMarketData.highPrice === selectedMarketData.lowPrice) {
      return null;
    }

    return ((selectedMarketData.price - selectedMarketData.lowPrice) /
      (selectedMarketData.highPrice - selectedMarketData.lowPrice)) * 100;
  }

  getIndicator(symbol: string): TechnicalIndicator | undefined {
    return this.indicators.find((indicator) => indicator.symbol === symbol);
  }

  getTrendLabel(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return 'Calculando';
    }

    if (value >= 2) {
      return 'Alcista';
    }

    if (value <= -2) {
      return 'Bajista';
    }

    return 'Neutral';
  }

  getRiskLabel(rsi: number | null | undefined): string {
    if (rsi === null || rsi === undefined) {
      return 'Calculando';
    }

    if (rsi >= 70) {
      return 'Sobrecompra';
    }

    if (rsi <= 30) {
      return 'Sobreventa';
    }

    return 'Moderado';
  }

  private async renderPriceChart(history: MarketData[]): Promise<void> {
    if (!this.viewInitialized || !this.priceChartRef) {
      return;
    }

    const { default: Chart } = await import('chart.js/auto');
    const labels = history.map((item) => new Date(item.timestamp).toLocaleTimeString());
    const prices = history.map((item) => item.price);

    this.priceChart?.destroy();
    this.priceChart = new Chart(this.priceChartRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `${this.selectedChartSymbol} precio`,
            data: prices,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.12)',
            fill: true,
            tension: 0.25,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#8b98ad',
              maxTicksLimit: 6
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.08)'
            }
          },
          y: {
            beginAtZero: false,
            ticks: {
              color: '#8b98ad'
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.1)'
            }
          }
        }
      }
    });
  }
}
