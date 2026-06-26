import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { MarketService } from '../../core/services/market.service';
import { RecommendationService } from '../../core/services/recommendation.service';
import { AuthUser } from '../../shared/models/auth.models';
import { Recommendation } from '../../shared/models/analysis.models';

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
      type: this.selectedType
    }).pipe(
      finalize(() => {
        this.loading = false;
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: (response) => {
        this.recommendations = response.data;
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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getTotalByType(type: string): number {
    return this.recommendations.filter((item) => this.getRecommendationResult(item) === type).length;
  }

  getAverageConfidence(): number {
    if (!this.recommendations.length) {
      return 0;
    }

    const total = this.recommendations.reduce((sum, item) => sum + this.getConfidencePercent(item), 0);
    return Math.round(total / this.recommendations.length);
  }

  getRecommendationClass(recommendation: Recommendation | null): string {
    const type = this.getRecommendationResult(recommendation);

    if (type === 'COMPRAR') {
      return 'positive-text';
    }

    if (type === 'VENDER') {
      return 'negative-text';
    }

    return 'warning-text';
  }

  getConfidencePercent(recommendation: Recommendation | null): number {
    return recommendation?.confidence ?? recommendation?.confidencePercent ?? 0;
  }

  getRecommendationResult(recommendation: Recommendation | null): string {
    return recommendation?.recommendationType || recommendation?.result || 'Sin generar';
  }
}
