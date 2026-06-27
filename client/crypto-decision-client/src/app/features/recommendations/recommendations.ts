import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { MarketService } from '../../core/services/market.service';
import { RecommendationService } from '../../core/services/recommendation.service';
import { AuthUser } from '../../shared/models/auth.models';
import {
  Recommendation,
  RecommendationAnalysisContext
} from '../../shared/models/analysis.models';

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, FormsModule, RouterModule],
  templateUrl: './recommendations.html',
  styleUrl: './recommendations.scss'
})
export class RecommendationsComponent implements OnInit {
  user: AuthUser | null = null;
  symbols: string[] = [];
  recommendations: Recommendation[] = [];
  selectedRecommendation: Recommendation | null = null;
  selectedSymbol = '';
  selectedType = '';
  loading = false;
  errorMessage = '';
  currentPage = 1;
  readonly pageSize = 8;
  totalRecommendations = 0;
  totalPages = 1;
  summary = {
    buy: 0,
    sell: 0,
    hold: 0,
    averageConfidence: 0
  };

  constructor(
    private authService: AuthService,
    private marketService: MarketService,
    private recommendationService: RecommendationService,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.user = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadSymbols();
    this.loadRecommendations();
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

  loadRecommendations(): void {
    this.loading = true;
    this.errorMessage = '';

    this.recommendationService.getRecommendations({
      symbol: this.selectedSymbol,
      type: this.selectedType,
      page: this.currentPage,
      limit: this.pageSize
    }).pipe(
      finalize(() => {
        this.loading = false;
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: (response) => {
        this.recommendations = response.data;
        this.totalRecommendations = response.pagination.total;
        this.totalPages = response.pagination.totalPages;
        this.currentPage = response.pagination.page;
        this.summary = response.summary;
        this.selectedRecommendation = this.recommendations[0] ?? null;
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'No se pudieron cargar las recomendaciones.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  clearFilters(): void {
    this.selectedSymbol = '';
    this.selectedType = '';
    this.currentPage = 1;
    this.loadRecommendations();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadRecommendations();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    this.loadRecommendations();
  }

  selectRecommendation(recommendation: Recommendation): void {
    this.selectedRecommendation = recommendation;
    this.changeDetectorRef.detectChanges();
  }

  goToAnalysis(symbol?: string): void {
    this.router.navigate(['/analysis'], {
      queryParams: symbol ? { symbol } : undefined
    });
  }

  registerOperation(recommendation: Recommendation): void {
    const analysis = this.getAnalysisContext(recommendation);
    const entryPrice = analysis?.marketData?.price ?? 0;
    const risk = analysis?.riskParameters;
    const riskAmount = risk
      ? Number(risk.capital) * (Number(risk.maxRiskPercent) / 100)
      : 0;
    const amount = entryPrice > 0 ? riskAmount / entryPrice : 0;

    this.router.navigate(['/operations'], {
      queryParams: {
        symbol: recommendation.symbol,
        operationType: this.getRecommendationResult(recommendation) === 'VENDER' ? 'venta' : 'compra',
        entryPrice: entryPrice || null,
        amount: amount || null
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getTotalByType(type: string): number {
    if (type === 'COMPRAR') {
      return this.summary.buy;
    }

    if (type === 'VENDER') {
      return this.summary.sell;
    }

    return this.summary.hold;
  }

  getAverageConfidence(): number {
    return this.summary.averageConfidence;
  }

  getRecommendationClass(recommendation: Recommendation | null): string {
    return this.getDecisionClass(this.getRecommendationResult(recommendation));
  }

  getDecisionClass(result: string | null | undefined): string {
    if (result === 'COMPRAR') {
      return 'positive-text';
    }

    if (result === 'VENDER') {
      return 'negative-text';
    }

    return 'warning-text';
  }

  getConfidencePercent(recommendation: Recommendation | null): number {
    return recommendation?.machineLearning?.confidencePercent ??
      recommendation?.confidence ??
      recommendation?.confidencePercent ??
      0;
  }

  getRecommendationResult(recommendation: Recommendation | null): string {
    if (recommendation?.machineLearning && !recommendation.riskOverride) {
      return recommendation.machineLearning.predictedResult;
    }

    return recommendation?.recommendationType || recommendation?.result || 'Sin generar';
  }

  getAnalysisContext(
    recommendation: Recommendation | null
  ): RecommendationAnalysisContext | null {
    const analysis = recommendation?.analysis;

    return analysis && typeof analysis === 'object' ? analysis : null;
  }

  getStrategyLabel(strategy: string | undefined): string {
    const labels: Record<string, string> = {
      trend: 'Tendencia',
      breakout: 'Ruptura',
      'mean-reversion': 'Reversion a la media'
    };

    return strategy ? labels[strategy] ?? strategy : 'No disponible';
  }

  getRsiInterpretation(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return 'Sin datos';
    }

    if (value >= 70) {
      return 'Sobrecompra';
    }

    if (value <= 30) {
      return 'Sobreventa';
    }

    return 'Zona neutral';
  }

  getTrendInterpretation(recommendation: Recommendation | null): string {
    const indicator = this.getAnalysisContext(recommendation)?.indicator;

    if (indicator?.ema === null || indicator?.ema === undefined ||
        indicator.sma === null || indicator.sma === undefined) {
      return 'Sin datos';
    }

    if (indicator.ema > indicator.sma) {
      return 'Impulso alcista';
    }

    if (indicator.ema < indicator.sma) {
      return 'Impulso bajista';
    }

    return 'Sin direccion';
  }

  getMacdInterpretation(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return 'Sin datos';
    }

    return value > 0 ? 'Momentum positivo' : value < 0 ? 'Momentum negativo' : 'Neutral';
  }

  getRiskRewardRatio(recommendation: Recommendation | null): number | null {
    const risk = this.getAnalysisContext(recommendation)?.riskParameters;

    if (!risk || Number(risk.stopLossPercent) <= 0) {
      return null;
    }

    return Number(risk.takeProfitPercent) / Number(risk.stopLossPercent);
  }

  getRiskAmount(recommendation: Recommendation | null): number | null {
    const risk = this.getAnalysisContext(recommendation)?.riskParameters;

    if (!risk) {
      return null;
    }

    return Number(risk.capital) * (Number(risk.maxRiskPercent) / 100);
  }

  getDecisionGuidance(recommendation: Recommendation | null): string {
    const result = this.getRecommendationResult(recommendation);

    if (result === 'COMPRAR') {
      return 'La evidencia favorece una posible entrada. Revise el precio actual y respete el stop loss antes de registrar la operacion.';
    }

    if (result === 'VENDER') {
      return 'La evidencia favorece reducir exposicion o evaluar una venta. Confirme que la senal siga vigente antes de actuar.';
    }

    return 'No existe confirmacion suficiente o las senales no coinciden. La accion sugerida es no abrir una operacion por ahora.';
  }

  getDisplayReason(reason: string): string {
    return reason
      .replace(/TensorFlow\.js proyecto/gi, 'El modelo predictivo recomienda')
      .replace(/tensorflow-js-dense-v1/gi, 'Modelo DSS v1');
  }
}
