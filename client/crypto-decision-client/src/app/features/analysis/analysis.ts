import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, Subject, takeUntil } from 'rxjs';
import type { Chart as ChartType } from 'chart.js';

import { AuthService } from '../../core/services/auth.service';
import { MarketService } from '../../core/services/market.service';
import { AnalysisService } from '../../core/services/analysis.service';
import { AuthUser } from '../../shared/models/auth.models';
import { MarketData, TechnicalIndicator } from '../../shared/models/market.models';
import { Recommendation, RiskParametersRequest } from '../../shared/models/analysis.models';

type Strategy = 'trend' | 'breakout' | 'mean-reversion';

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, RouterModule],
  templateUrl: './analysis.html',
  styleUrl: './analysis.scss'
})
export class AnalysisComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('analysisChart') private analysisChartRef?: ElementRef<HTMLCanvasElement>;

  symbols: string[] = [];
  selectedSymbol = '';
  selectedTimeframe = '1H';
  selectedStrategy: Strategy = 'trend';
  selectedMarketData: MarketData | null = null;
  selectedIndicator: TechnicalIndicator | null = null;
  user: AuthUser | null = null;

  capital = 1000;
  maxRiskPercent = 2;
  stopLossPercent = 3;
  takeProfitPercent = 6;

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';
  recommendation: Recommendation | null = null;

  private chart?: ChartType;
  private viewInitialized = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private marketService: MarketService,
    private analysisService: AnalysisService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.user = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadSymbols();
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.chart?.destroy();
  }

  loadSymbols(): void {
    this.loading = true;
    this.errorMessage = '';

    this.marketService.getSymbols().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.symbols = response.symbols ?? [];
        const requestedSymbol = this.activatedRoute.snapshot.queryParamMap.get('symbol')?.toUpperCase();
        this.selectedSymbol = requestedSymbol && this.symbols.includes(requestedSymbol)
          ? requestedSymbol
          : this.symbols[0] ?? '';
        this.loadRiskParameters(this.selectedSymbol);
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.error?.message || 'No se pudieron cargar los activos disponibles.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  generateAnalysis(): void {
    if (!this.selectedSymbol) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.analysisService.generateAnalysis(this.getRiskParametersRequest()).pipe(
      finalize(() => {
        this.loading = false;
        this.changeDetectorRef.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.selectedMarketData = response.marketData;
        this.selectedIndicator = response.indicator ?? null;
        this.recommendation = response.recommendation;
        this.loadHistoryChart(this.selectedSymbol);
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'No se pudo generar el analisis.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  saveParameters(): void {
    this.saving = true;
    this.successMessage = '';

    this.analysisService.saveRiskParameters(this.getRiskParametersRequest()).pipe(
      finalize(() => {
        this.saving = false;
        this.changeDetectorRef.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.successMessage = 'Parametros guardados correctamente.';
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'No se pudieron guardar los parametros.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  onAnalysisFilterChange(): void {
    this.selectedMarketData = null;
    this.selectedIndicator = null;
    this.recommendation = null;
    this.generateAnalysis();
  }

  onSymbolChange(): void {
    this.selectedMarketData = null;
    this.selectedIndicator = null;
    this.recommendation = null;
    this.loadRiskParameters(this.selectedSymbol);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getRecommendationResult(): string {
    if (this.recommendation) {
      return this.recommendation.result;
    }

    const change = this.selectedMarketData?.priceChangePercent ?? 0;
    const rsi = this.selectedIndicator?.rsi;

    if (rsi !== null && rsi !== undefined && rsi >= 70) {
      return 'ESPERAR';
    }

    if (rsi !== null && rsi !== undefined && rsi <= 30 && change > 0) {
      return 'COMPRAR';
    }

    if (change <= -2) {
      return 'ESPERAR';
    }

    return change > 1 ? 'COMPRAR' : 'ESPERAR';
  }

  getRiskLevel(): string {
    if (this.recommendation) {
      return this.recommendation.riskLevel;
    }

    if (this.maxRiskPercent <= 1) {
      return 'Bajo';
    }

    if (this.maxRiskPercent <= 3) {
      return 'Medio';
    }

    return 'Alto';
  }

  getRecommendationReason(): string {
    if (this.recommendation) {
      return this.recommendation.reason;
    }

    const trend = this.selectedMarketData?.priceChangePercent ?? 0;
    const rsi = this.selectedIndicator?.rsi;

    if (rsi !== null && rsi !== undefined && rsi >= 70) {
      return 'El activo presenta fuerza alcista, pero el RSI esta cerca de sobrecompra. Conviene esperar confirmacion.';
    }

    if (trend > 1) {
      return 'El activo mantiene variacion positiva y los parametros de riesgo permiten una operacion controlada.';
    }

    return 'No hay suficiente confirmacion direccional. Se recomienda observar antes de operar.';
  }

  getConfidencePercent(): number {
    if (this.recommendation) {
      return this.recommendation.confidencePercent;
    }

    const indicator = this.selectedIndicator;
    const trend = Math.abs(this.selectedMarketData?.priceChangePercent ?? 0);
    let confidence = Math.min(75, 45 + trend * 5);

    if (indicator?.rsi !== null && indicator?.rsi !== undefined) {
      confidence += indicator.rsi > 35 && indicator.rsi < 65 ? 10 : -5;
    }

    return Math.max(20, Math.min(95, Math.round(confidence)));
  }

  private loadRiskParameters(symbol: string): void {
    if (!symbol) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.analysisService.getRiskParameters(symbol).pipe(
      finalize(() => {
        this.loading = false;
        this.changeDetectorRef.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.selectedTimeframe = response.data.timeframe;
        this.selectedStrategy = response.data.strategy as Strategy;
        this.capital = response.data.capital;
        this.maxRiskPercent = response.data.maxRiskPercent;
        this.stopLossPercent = response.data.stopLossPercent;
        this.takeProfitPercent = response.data.takeProfitPercent;
        this.generateAnalysis();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'No se pudieron cargar los parametros de riesgo.';
      }
    });
  }

  private loadHistoryChart(symbol: string): void {
    this.marketService.getMarketHistory(symbol).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (history) => {
        this.renderChart([...history.data].reverse());
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error('No se pudo cargar el historial del activo:', error);
      }
    });
  }

  private getRiskParametersRequest(): RiskParametersRequest {
    return {
      symbol: this.selectedSymbol,
      timeframe: this.selectedTimeframe,
      strategy: this.selectedStrategy,
      capital: Number(this.capital),
      maxRiskPercent: Number(this.maxRiskPercent),
      stopLossPercent: Number(this.stopLossPercent),
      takeProfitPercent: Number(this.takeProfitPercent)
    };
  }

  private async renderChart(history: MarketData[]): Promise<void> {
    if (!this.viewInitialized || !this.analysisChartRef) {
      return;
    }

    const { default: Chart } = await import('chart.js/auto');
    const labels = history.map((item) => new Date(item.timestamp).toLocaleTimeString());
    const prices = history.map((item) => item.price);

    this.chart?.destroy();
    this.chart = new Chart(this.analysisChartRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
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
    this.changeDetectorRef.detectChanges();
  }
}
