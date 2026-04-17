import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Producer, PieSlice, ZoneStat, BarStat, UserStats, LineData } from '../../models/models';
import { ApiService } from '../../services/api.service';
import { scoreProducer } from '../../utils/scoring';

interface RecentItem extends Producer { score: number; }

const PIE_PALETTE = ['#1565c0', '#43a047', '#e53935', '#fb8c00', '#8e24aa', '#00897b', '#f4511e', '#039be5'];
const paletteColor = (slice: PieSlice, i: number) => slice.color || PIE_PALETTE[i % PIE_PALETTE.length];

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIcon, DecimalPipe, NgApexchartsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  loaded = signal(false);
  error = signal<string | null>(null);

  total = signal(0);
  eligible = signal(0);
  nonEligible = signal(0);
  avgScore = signal(0);
  femmes = signal(0);
  hommes = signal(0);
  zones = signal<ZoneStat[]>([]);
  maxZoneCount = signal(1);
  recent = signal<RecentItem[]>([]);

  // Pie raw data
  statutFoncierPie = signal<PieSlice[]>([]);
  sourceEauPie     = signal<PieSlice[]>([]);
  typeRizPie       = signal<PieSlice[]>([]);
  cooperativePie   = signal<PieSlice[]>([]);
  zonePie          = signal<PieSlice[]>([]);

  // Bar + line raw data
  trancheAgeStats = signal<BarStat[]>([]);
  private readonly _linePts = signal<LineData[]>([]);

  // Agent performance
  userPerformance = signal<UserStats[]>([]);

  // Derived
  eligibilityRate = computed(() => this.total() > 0 ? Math.round((this.eligible() / this.total()) * 100) : 0);

  // ── Chart shared configs ─────────────────────────────────
  readonly donutChartConfig  = { type: 'donut' as const, height: 260, fontFamily: 'inherit' };
  readonly pieChartConfig    = { type: 'pie'   as const, height: 260, fontFamily: 'inherit' };
  readonly areaChartConfig   = { type: 'area'  as const, height: 220, fontFamily: 'inherit', toolbar: { show: false } };
  readonly barChartConfig    = { type: 'bar'   as const, height: 220, fontFamily: 'inherit', toolbar: { show: false } };
  readonly hBarChartConfig   = { type: 'bar'   as const, height: 220, fontFamily: 'inherit', toolbar: { show: false } };
  readonly legendBottom      = { position: 'bottom' as const, fontSize: '12px', fontFamily: 'inherit' };
  readonly donutPlotOptions  = { pie: { donut: { size: '65%' } } };
  readonly barPlotOptions    = { bar: { columnWidth: '60%', borderRadius: 4 } };
  readonly hBarPlotOptions   = { bar: { horizontal: true, barHeight: '65%', borderRadius: 4 } };
  readonly smoothStroke      = { curve: 'smooth' as const, width: 2 };
  readonly areaFill          = { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0 } };
  readonly noDataLabels      = { enabled: false };
  readonly areaTooltip       = { enabled: true };
  readonly sexeColors         = ['#e91e8c', '#1565c0'];
  readonly lineColors         = ['#43a047'];
  readonly trancheAgeColors   = ['#1565c0'];
  readonly zonesColors        = ['#e65100'];

  // ── Sexe donut ───────────────────────────────────────────
  sexeSeries  = computed(() => [this.femmes(), this.hommes()]);
  sexeLabels  = signal(['Femmes', 'Hommes']);

  // ── Line / area ──────────────────────────────────────────
  lineSeries = computed(() => [{ name: 'Producteurs recensés', data: this._linePts().map(p => p.count) }]);
  lineXAxis  = computed(() => ({ categories: this._linePts().map(p => p.label) }));

  // ── Statut foncier ───────────────────────────────────────
  statutFoncierSeries = computed(() => this.statutFoncierPie().map(s => s.count));
  statutFoncierLabels = computed(() => this.statutFoncierPie().map(s => s.label));
  statutFoncierColors = computed((): string[] => this.statutFoncierPie().map(paletteColor));

  // ── Source d'eau ─────────────────────────────────────────
  sourceEauSeries = computed(() => this.sourceEauPie().map(s => s.count));
  sourceEauLabels = computed(() => this.sourceEauPie().map(s => s.label));
  sourceEauColors = computed((): string[] => this.sourceEauPie().map(paletteColor));

  // ── Type de riziculture ──────────────────────────────────
  typeRizSeries = computed(() => this.typeRizPie().map(s => s.count));
  typeRizLabels = computed(() => this.typeRizPie().map(s => s.label));
  typeRizColors = computed((): string[] => this.typeRizPie().map(paletteColor));

  // ── Coopérative ──────────────────────────────────────────
  cooperativeSeries = computed(() => this.cooperativePie().map(s => s.count));
  cooperativeLabels = computed(() => this.cooperativePie().map(s => s.label));
  cooperativeColors = computed((): string[] => this.cooperativePie().map(paletteColor));

  // ── Zone pie ─────────────────────────────────────────────
  zonePieSeries = computed(() => this.zonePie().map(s => s.count));
  zonePieLabels = computed(() => this.zonePie().map(s => s.label));
  zonePieColors = computed((): string[] => this.zonePie().map(paletteColor));

  // ── Bar (tranche d'âge) ──────────────────────────────────
  trancheAgeSeries = computed(() => [{ name: 'Producteurs', data: this.trancheAgeStats().map(s => s.count) }]);
  trancheAgeXAxis  = computed(() => ({ categories: this.trancheAgeStats().map(s => s.label) }));

  // ── Horizontal bar (zones) ───────────────────────────────
  zonesSeries = computed(() => [{ name: 'Producteurs', data: this.zones().map(z => z.count) }]);
  zonesXAxis  = computed(() => ({ categories: this.zones().map(z => z.zone) }));

  async ngOnInit(): Promise<void> {
    try {
      const [statsResp, perfResp] = await Promise.all([
        firstValueFrom(this.api.getDashboardStats()),
        firstValueFrom(this.api.getUserPerformance()),
      ]);

      const s = statsResp.data;

      this.total.set(s.total);
      this.eligible.set(s.eligible);
      this.nonEligible.set(s.non_eligible);
      this.avgScore.set(s.avg_score);
      this.femmes.set(s.femmes);
      this.hommes.set(s.hommes);
      this.zones.set(s.zones ?? []);
      this.maxZoneCount.set(s.max_zone_count ?? 1);

      this.recent.set(
        (s.recent ?? []).map(p => ({ ...p, score: Math.round(scoreProducer(p).total) }))
      );

      this.statutFoncierPie.set(s.statut_foncier_pie ?? []);
      this.sourceEauPie.set(s.source_eau_pie ?? []);
      this.typeRizPie.set(s.type_riz_pie ?? []);
      this.cooperativePie.set(s.cooperative_pie ?? []);
      this.zonePie.set(s.zone_pie ?? []);

      this.trancheAgeStats.set(s.tranche_age_stats ?? []);
      this._linePts.set(s.line_data ?? []);

      this.userPerformance.set(perfResp.data ?? []);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Erreur de chargement du tableau de bord');
    } finally {
      this.loaded.set(true);
    }
  }

  exportMenuOpen = signal(false);
  toggleExportMenu(): void { this.exportMenuOpen.update(v => !v); }
  closeExportMenu(): void { this.exportMenuOpen.set(false); }

  private async downloadFile(path: string, filename: string): Promise<void> {
    this.closeExportMenu();
    try {
      const blob = await firstValueFrom(
        this.http.get(`${this.api.baseUrl}${path}`, { responseType: 'blob' })
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error('Erreur lors du téléchargement :', err);
    }
  }

  exportPdf(): void {
    this.downloadFile('/dashboard/export/pdf', 'dashboard_report.pdf');
  }

  exportExcel(): void {
    this.downloadFile('/dashboard/export/excel', 'dashboard_report.xlsx');
  }

  exportUserPerformancePdf(): void {
    this.downloadFile('/dashboard/export/user-performance-pdf', 'user_performance_report.pdf');
  }

  exportProducerScoresExcel(): void {
    this.downloadFile('/dashboard/export/producer-scores-excel', 'producer_scores.xlsx');
  }

  exportUserPerformanceExcel(): void {
    this.downloadFile('/dashboard/export/user-performance-excel', 'user_performance.xlsx');
  }
}

