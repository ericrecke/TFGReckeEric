import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize, interval, Subject, takeUntil } from 'rxjs';
import type {
  CandlestickData,
  IChartApi,
  ISeriesApi,
  UTCTimestamp
} from 'lightweight-charts';

import { AuthService } from '../../core/services/auth.service';
import { MarketService } from '../../core/services/market.service';
import { MarketCandle, MarketData, TechnicalIndicator } from '../../shared/models/market.models';
import { AuthUser } from '../../shared/models/auth.models';

interface CandlePoint {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, FormsModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('priceChart') private priceChartRef?: ElementRef<HTMLElement>;

  symbols: string[] = [];
  marketData: MarketData[] = [];
  indicators: TechnicalIndicator[] = [];
  selectedChartSymbol = '';
  selectedChartPeriod = '1H';
  user: AuthUser | null = null;

  loading = false;
  errorMessage = '';
  chartLoading = false;
  chartTransitionLoading = false;
  lastUpdatedAt: Date | null = null;

  private priceChart?: IChartApi;
  private priceSeries?: ISeriesApi<'Candlestick'>;
  private viewInitialized = false;
  private readonly refreshIntervalMs = 30000;
  private readonly liveRefreshIntervalMs = 5000;
  private readonly fallbackSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'];
  private readonly destroy$ = new Subject<void>();
  private marketRefreshInProgress = false;
  private liveRefreshInProgress = false;
  private priceChartCandles: CandlePoint[] = [];

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
    this.priceChart?.remove();
  }

  loadSymbolsAndMarketData(): void {
    this.loadMarketData();
  }

  loadMarketData(): void {
    if (this.marketRefreshInProgress) {
      return;
    }

    this.marketRefreshInProgress = true;
    this.loading = true;
    this.errorMessage = '';

    this.marketService.getMarketSummary().pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.marketRefreshInProgress = false;
        this.loading = false;
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: (response) => {
        this.symbols = response.symbols ?? [];
        this.marketData = response.data ?? [];
        this.indicators = response.indicators ?? [];
        this.selectedChartSymbol = this.selectedChartSymbol || this.symbols[0] || '';
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

  loadLiveMarketData(): void {
    if (this.liveRefreshInProgress) {
      return;
    }

    this.liveRefreshInProgress = true;

    this.marketService.getMarketLive().pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.liveRefreshInProgress = false;
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: (response) => {
        const liveData = response.data ?? [];
        this.symbols = response.symbols ?? this.symbols;
        this.marketData = liveData.map((liveItem) => ({
          ...this.marketData.find((item) => item.symbol === liveItem.symbol),
          ...liveItem
        }));
        this.lastUpdatedAt = new Date();
        this.appendLivePriceToChart();
        this.changeDetectorRef.detectChanges();
      },
      error: () => {
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  getDisplayAssets(): Array<Partial<MarketData> & { symbol: string }> {
    if (this.marketData.length) {
      return this.marketData;
    }

    const symbols = this.symbols.length ? this.symbols : this.fallbackSymbols;

    return symbols.map((symbol) => ({
      symbol,
      price: 0,
      priceChangePercent: 0,
      volume: 0
    }));
  }

  getTableAssets(): Array<Partial<MarketData> & { symbol: string }> {
    if (this.marketData.length) {
      return this.marketData;
    }

    return [{
      symbol: '-',
      price: 0,
      priceChangePercent: 0,
      volume: 0
    }];
  }

  loadPriceChart(symbol: string): void {
    if (!symbol) {
      return;
    }

    this.selectedChartSymbol = symbol;
    const requestedSymbol = symbol;
    this.chartLoading = true;
    this.chartTransitionLoading = Boolean(this.priceChart);
    this.changeDetectorRef.detectChanges();

    this.marketService.getMarketCandles(symbol, this.selectedChartPeriod).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.chartLoading = false;
        this.chartTransitionLoading = false;
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: (response) => {
        if (this.selectedChartSymbol !== requestedSymbol) {
          return;
        }

        this.renderPriceChart(response.data);
      },
      error: (error) => {
        this.errorMessage =
          error.error?.message || 'No se pudo obtener el historial para el grafico.';
      }
    });
  }

  setChartPeriod(period: string): void {
    if (this.selectedChartPeriod === period) {
      return;
    }

    this.selectedChartPeriod = period;
    this.loadPriceChart(this.selectedChartSymbol);
  }

  private startAutoRefresh(): void {
    interval(this.refreshIntervalMs).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadMarketData();
    });

    interval(this.liveRefreshIntervalMs).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadLiveMarketData();
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isPositiveChange(value: number | null | undefined): boolean {
    return (value ?? 0) >= 0;
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

  openAnalysis(symbol = this.selectedChartSymbol): void {
    this.router.navigate(['/analysis'], {
      queryParams: symbol ? { symbol } : undefined
    });
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

  private async renderPriceChart(candleData: MarketCandle[]): Promise<void> {
    if (!this.viewInitialized || !this.priceChartRef) {
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
    this.priceChartCandles = candles;
    const container = this.priceChartRef.nativeElement;
    const chartData: CandlestickData[] = candles.map((item) => ({
      time: item.time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close
    }));

    this.priceChart?.remove();
    this.priceChart = createChart(container, {
      width: container.clientWidth || 300,
      height: container.clientHeight || 290,
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
      localization: {
        priceFormatter: (price: number) => price < 1 ? price.toFixed(6) : price.toFixed(2)
      }
    });
    this.priceSeries = this.priceChart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444'
    });
    this.priceSeries.setData(chartData);
    this.priceChart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, chartData.length - 100),
      to: chartData.length + 5
    });
  }

  private appendLivePriceToChart(): void {
    const selectedMarketData = this.getSelectedMarketData();

    if (!this.priceChart || !this.priceSeries || !selectedMarketData) {
      return;
    }

    const lastCandle = this.priceChartCandles[this.priceChartCandles.length - 1];
    const lastPrice = lastCandle?.close;

    if (lastPrice === selectedMarketData.price) {
      return;
    }

    const nextTime = this.getBucketTime(new Date(selectedMarketData.timestamp));
    const lastTime = lastCandle?.time;

    if (lastTime === nextTime) {
      const open = lastCandle?.open ?? selectedMarketData.price;
      const close = selectedMarketData.price;
      const candle: CandlePoint = {
        time: nextTime,
        open,
        high: Math.max(lastCandle?.high ?? close, close),
        low: Math.min(lastCandle?.low ?? close, close),
        close
      };
      this.priceChartCandles[this.priceChartCandles.length - 1] = candle;
      this.priceSeries.update(candle);
      return;
    }

    const candle: CandlePoint = {
      time: nextTime,
      open: selectedMarketData.price,
      high: selectedMarketData.price,
      low: selectedMarketData.price,
      close: selectedMarketData.price
    };
    this.priceChartCandles.push(candle);
    this.priceSeries.update(candle);

    const maxPoints = this.getMaxChartPoints();
    while (this.priceChartCandles.length > maxPoints) {
      this.priceChartCandles.shift();
    }
  }

  private getMaxChartPoints(): number {
    return 1000;
  }

  private getBucketDate(date: Date): Date {
    const bucketDate = new Date(date);
    bucketDate.setUTCSeconds(0, 0);

    if (this.selectedChartPeriod === '1H') {
      bucketDate.setUTCMinutes(0);
      return bucketDate;
    }

    if (this.selectedChartPeriod === '4H') {
      const bucketHour = Math.floor(bucketDate.getUTCHours() / 4) * 4;
      bucketDate.setUTCHours(bucketHour, 0);
      return bucketDate;
    }

    if (this.selectedChartPeriod === '1D') {
      bucketDate.setUTCHours(0, 0);
      return bucketDate;
    }

    const day = bucketDate.getUTCDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    bucketDate.setUTCDate(bucketDate.getUTCDate() - daysFromMonday);
    bucketDate.setUTCHours(0, 0);
    return bucketDate;
  }

  private getBucketTime(date: Date): UTCTimestamp {
    return Math.floor(this.getBucketDate(date).getTime() / 1000) as UTCTimestamp;
  }
}
