import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, Subject, takeUntil } from 'rxjs';
import type {
  CandlestickData,
  IChartApi,
  ISeriesApi,
  UTCTimestamp
} from 'lightweight-charts';

import { AuthService } from '../../core/services/auth.service';
import { MarketService } from '../../core/services/market.service';
import { AnalysisService } from '../../core/services/analysis.service';
import { AuthUser } from '../../shared/models/auth.models';
import { MarketCandle, MarketData, TechnicalIndicator } from '../../shared/models/market.models';
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
  @ViewChild('analysisChart') private analysisChartRef?: ElementRef<HTMLElement>;

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
  loadingParameters = false;
  saving = false;
  errorMessage = '';
  successMessage = '';
  recommendation: Recommendation | null = null;

  private chart?: IChartApi;
  private candleSeries?: ISeriesApi<'Candlestick'>;
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
    this.chart?.remove();
  }

  loadSymbols(): void {
    this.loadingParameters = true;
    this.errorMessage = '';

    this.marketService.getSymbols().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.symbols = response.symbols ?? [];
        const requestedSymbol = this.activatedRoute.snapshot.queryParamMap.get('symbol')?.toUpperCase();
        this.selectedSymbol = requestedSymbol && this.symbols.includes(requestedSymbol)
          ? requestedSymbol
          : this.symbols.includes('BTCUSDT')
            ? 'BTCUSDT'
            : this.symbols[0] ?? '';
        this.loadRiskParameters(this.selectedSymbol);
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        this.loadingParameters = false;
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
    this.resetAnalysisResult();
    this.errorMessage = '';

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
    this.resetAnalysisResult();
  }

  onSymbolChange(): void {
    this.resetAnalysisResult();
    this.loadRiskParameters(this.selectedSymbol);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  registerOperation(): void {
    const recommendationResult = this.getRecommendationResult();
    const operationType = recommendationResult === 'VENDER' ? 'venta' : 'compra';
    const entryPrice = this.selectedMarketData?.price ?? 0;
    const riskAmount = Number(this.capital) * (Number(this.maxRiskPercent) / 100);
    const amount = entryPrice > 0 ? riskAmount / entryPrice : 0;

    this.router.navigate(['/operations'], {
      queryParams: {
        symbol: this.selectedSymbol,
        operationType,
        entryPrice: entryPrice || null,
        amount: amount || null
      }
    });
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

  getRecommendationClass(): string {
    const result = this.getRecommendationResult();

    if (result === 'COMPRAR') {
      return 'positive-text';
    }

    if (result === 'VENDER') {
      return 'negative-text';
    }

    return 'warning-text';
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
      return this.getDisplayReason(this.recommendation.reason);
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

  getDisplayReason(reason: string): string {
    return reason
      .replace(/TensorFlow\.js proyecto/gi, 'El modelo predictivo recomienda')
      .replace(/tensorflow-js-dense-v1/gi, 'Modelo DSS v1');
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

    this.loadingParameters = true;
    this.errorMessage = '';

    this.analysisService.getRiskParameters(symbol).pipe(
      finalize(() => {
        this.loadingParameters = false;
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
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'No se pudieron cargar los parametros de riesgo.';
      }
    });
  }

  private resetAnalysisResult(): void {
    this.selectedMarketData = null;
    this.selectedIndicator = null;
    this.recommendation = null;
    this.successMessage = '';
    this.chart?.remove();
    this.chart = undefined;
    this.candleSeries = undefined;
    this.changeDetectorRef.detectChanges();
  }

  private loadHistoryChart(symbol: string): void {
    this.marketService.getMarketCandles(symbol, this.selectedTimeframe).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (history) => {
        this.renderChart(history.data);
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

  private async renderChart(candleData: MarketCandle[]): Promise<void> {
    if (!this.viewInitialized || !this.analysisChartRef) {
      return;
    }

    const { createChart } = await import('lightweight-charts');
    const candles = candleData.map((item) => ({
      time: Math.floor(new Date(item.openTime).getTime() / 1000) as UTCTimestamp,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close
    }));
    const chartData: CandlestickData[] = candles.map((item) => ({
      time: item.time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close
    }));
    const container = this.analysisChartRef.nativeElement;

    this.chart?.remove();
    this.chart = createChart(container, {
      width: container.clientWidth || 300,
      height: container.clientHeight || 300,
      layout: {
        background: { color: '#0d1b2d' },
        textColor: '#dbeafe'
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.08)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.1)' }
      },
      rightPriceScale: {
        borderVisible: false,
        autoScale: true
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 18
      },
      handleScale: {
        mouseWheel: false,
        pinch: true,
        axisPressedMouseMove: false
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false
      },
      localization: {
        priceFormatter: (price: number) => price < 1 ? price.toFixed(6) : price.toFixed(2)
      }
    });
    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444'
    });
    this.candleSeries.setData(chartData);
    this.chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, chartData.length - 100),
      to: chartData.length + 5
    });
    this.changeDetectorRef.detectChanges();
  }
}
