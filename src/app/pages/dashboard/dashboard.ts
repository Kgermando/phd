import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { Producer, PieSlice, ZoneStat, BarStat, UserStats, LineData } from '../../models/models';
import { ApiService } from '../../services/api.service';
import { scoreProducer } from '../../utils/scoring';

interface RecentItem extends Producer { score: number; }
interface LineDot { x: number; y: number; count: number; label: string; }

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIcon, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);

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

  // Pie charts (pre-computed by backend)
  statutFoncierPie = signal<PieSlice[]>([]);
  sourceEauPie     = signal<PieSlice[]>([]);
  typeRizPie       = signal<PieSlice[]>([]);
  cooperativePie   = signal<PieSlice[]>([]);
  zonePie          = signal<PieSlice[]>([]);

  // Bar chart
  trancheAgeStats = signal<BarStat[]>([]);
  maxTrancheAge = computed(() => Math.max(...this.trancheAgeStats().map(s => s.count), 1));

  // Line chart
  private readonly _linePts = signal<LineData[]>([]);

  lineChartDots = computed<LineDot[]>(() => {
    const pts = this._linePts();
    if (pts.length === 0) return [];
    const W = 360, H = 80, padX = 10, padY = 8;
    const maxVal = Math.max(...pts.map(p => p.count), 1);
    return pts.map((pt, i) => ({
      x: padX + (i / Math.max(pts.length - 1, 1)) * (W - padX * 2),
      y: padY + (1 - pt.count / maxVal) * (H - padY * 2),
      count: pt.count,
      label: pt.label,
    }));
  });

  lineChartPath = computed(() => {
    const dots = this.lineChartDots();
    if (dots.length === 0) return '';
    if (dots.length === 1) return `M ${dots[0].x} ${dots[0].y}`;
    let d = `M ${dots[0].x.toFixed(1)} ${dots[0].y.toFixed(1)}`;
    for (let i = 1; i < dots.length; i++) {
      const cpx = ((dots[i - 1].x + dots[i].x) / 2).toFixed(1);
      d += ` C ${cpx} ${dots[i - 1].y.toFixed(1)}, ${cpx} ${dots[i].y.toFixed(1)}, ${dots[i].x.toFixed(1)} ${dots[i].y.toFixed(1)}`;
    }
    return d;
  });

  lineChartAreaPath = computed(() => {
    const dots = this.lineChartDots();
    const path = this.lineChartPath();
    if (!path || dots.length === 0) return '';
    const padY = 8, H = 80;
    const bottom = (padY + (H - padY * 2)).toFixed(1);
    return `${path} L ${dots[dots.length - 1].x.toFixed(1)} ${bottom} L ${dots[0].x.toFixed(1)} ${bottom} Z`;
  });

  // Sexe donut
  private readonly CIRC = 314.16;
  sexeDonut = computed(() => {
    const t = this.total(), f = this.femmes(), h = this.hommes();
    if (t === 0) return { fDash: `0 ${this.CIRC}`, hDash: `0 ${this.CIRC}`, fOffset: this.CIRC, hOffset: this.CIRC };
    return {
      fDash: `${(f / t) * this.CIRC} ${this.CIRC}`,
      hDash: `${(h / t) * this.CIRC} ${this.CIRC}`,
      fOffset: this.CIRC,
      hOffset: this.CIRC * (1 - f / t),
    };
  });

  // Agent performance
  userPerformance = signal<UserStats[]>([]);

  // Derived
  eligibilityRate = computed(() => this.total() > 0 ? Math.round((this.eligible() / this.total()) * 100) : 0);

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

      // Recent producers: score locally (backend preloads Champs)
      this.recent.set(
        (s.recent ?? []).map(p => ({ ...p, score: Math.round(scoreProducer(p).total) }))
      );

      // Pre-computed pies from backend
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

  pct(part: number, total: number): number {
    return total > 0 ? Math.round((part / total) * 100) : 0;
  }

  exportPdf(): void {
    window.open(`${this.api.baseUrl}/dashboard/export/pdf`, '_blank');
  }

  exportExcel(): void {
    window.open(`${this.api.baseUrl}/dashboard/export/excel`, '_blank');
  }
}
