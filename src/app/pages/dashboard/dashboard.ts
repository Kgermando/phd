import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { db } from '../../db/database';
import { Producer } from '../../models/models';
import { scoreProducer } from '../../utils/scoring';

interface ZoneStat { zone: string; count: number; eligible: number; avgScore: number; }
interface BarStat { label: string; count: number; }
interface PieSlice { label: string; count: number; pct: number; color: string; d: string; }
interface LineDot { x: number; y: number; count: number; label: string; }

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIcon],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  loaded = signal(false);
  total = signal(0);
  eligible = signal(0);
  nonEligible = signal(0);
  avgScore = signal(0);
  femmes = signal(0);
  hommes = signal(0);
  zones = signal<ZoneStat[]>([]);
  maxZoneCount = signal(1);
  recent = signal<Producer[]>([]);

  // Pie charts
  statutFoncierPie = signal<PieSlice[]>([]);
  sourceEauPie     = signal<PieSlice[]>([]);
  typeRizPie       = signal<PieSlice[]>([]);
  cooperativePie   = signal<PieSlice[]>([]);

  // Bar chart (ordered data — tranche d'âge)
  trancheAgeStats = signal<BarStat[]>([]);
  maxTrancheAge = computed(() => Math.max(...this.trancheAgeStats().map(s => s.count), 1));

  // Line chart data
  private _linePts = signal<{ month: string; label: string; count: number }[]>([]);

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
    const t = this.total();
    const f = this.femmes();
    const h = this.hommes();
    if (t === 0) return { fDash: `0 ${this.CIRC}`, hDash: `0 ${this.CIRC}`, fOffset: this.CIRC, hOffset: this.CIRC };
    return {
      fDash: `${(f / t) * this.CIRC} ${this.CIRC}`,
      hDash: `${(h / t) * this.CIRC} ${this.CIRC}`,
      fOffset: this.CIRC,
      hOffset: this.CIRC * (1 - f / t),
    };
  });

  async ngOnInit(): Promise<void> {
    const all = await db.producers.toArray();
    const scored = all.map((p) => ({ ...p, score: scoreProducer(p).total }));

    this.total.set(scored.length);
    const eli = scored.filter((p) => p.score >= 60);
    this.eligible.set(eli.length);
    this.nonEligible.set(scored.length - eli.length);
    this.femmes.set(scored.filter((p) => p.sexe === 'femme').length);
    this.hommes.set(scored.filter((p) => p.sexe === 'homme').length);
    const avg = scored.length ? Math.round(scored.reduce((s, p) => s + p.score, 0) / scored.length) : 0;
    this.avgScore.set(avg);

    // Secteurs géographiques
    const zoneMap = new Map<string, { count: number; eligible: number; scoreSum: number }>();
    for (const p of scored) {
      const z = p.zone || 'Inconnue';
      const cur = zoneMap.get(z) ?? { count: 0, eligible: 0, scoreSum: 0 };
      cur.count++;
      if (p.score >= 60) cur.eligible++;
      cur.scoreSum += p.score;
      zoneMap.set(z, cur);
    }
    const zStats: ZoneStat[] = [...zoneMap.entries()].map(([zone, v]) => ({
      zone, count: v.count, eligible: v.eligible,
      avgScore: v.count ? Math.round(v.scoreSum / v.count) : 0,
    })).sort((a, b) => b.count - a.count);
    this.zones.set(zStats);
    this.maxZoneCount.set(Math.max(...zStats.map((z) => z.count), 1));

    const sortedByDate = [...scored].sort((a, b) =>
      b.dateRecensement.localeCompare(a.dateRecensement)
    );
    this.recent.set(sortedByDate.slice(0, 6));

    // Pie: Statut foncier
    const sfLabels: Record<string, string> = { proprietaire: 'Propriétaire', exploitant: 'Exploitant', metayer: 'Métayer', autre: 'Autre' };
    const sfMap = new Map<string, number>();
    for (const p of scored) sfMap.set(p.statutFoncier, (sfMap.get(p.statutFoncier) ?? 0) + 1);
    this.statutFoncierPie.set(this.buildPie(
      [...sfMap.entries()].map(([k, v]) => ({ label: sfLabels[k] ?? k, count: v })).sort((a, b) => b.count - a.count),
      ['#1565c0', '#42a5f5', '#29b6f6', '#90caf9'],
    ));

    // Pie: Source d'eau
    const seLabels: Record<string, string> = { pluie: 'Pluie', fleuve: 'Fleuve', barrage: 'Barrage', forage: 'Forage' };
    const seMap = new Map<string, number>();
    for (const p of scored) seMap.set(p.sourceEau, (seMap.get(p.sourceEau) ?? 0) + 1);
    this.sourceEauPie.set(this.buildPie(
      [...seMap.entries()].map(([k, v]) => ({ label: seLabels[k] ?? k, count: v })).sort((a, b) => b.count - a.count),
      ['#0277bd', '#26c6da', '#00897b', '#80deea'],
    ));

    // Pie: Type de riziculture
    const trLabels: Record<string, string> = { pluviale: 'Pluviale', irriguee: 'Irriguée', 'bas-fond': 'Bas-fond' };
    const trMap = new Map<string, number>();
    for (const p of scored) for (const c of p.champs) trMap.set(c.typeRiziculture, (trMap.get(c.typeRiziculture) ?? 0) + 1);
    this.typeRizPie.set(this.buildPie(
      [...trMap.entries()].map(([k, v]) => ({ label: trLabels[k] ?? k, count: v })).sort((a, b) => b.count - a.count),
      ['#2e7d32', '#558b2f', '#aed581'],
    ));

    // Pie: Coopérative
    const coop = scored.filter(p => p.membreCooperative).length;
    this.cooperativePie.set(this.buildPie(
      [{ label: 'Membre', count: coop }, { label: 'Non-membre', count: scored.length - coop }],
      ['#43a047', '#e53935'],
    ));

    // Bar: Tranches d'âge
    const refYear = 2026;
    const ages = scored.map(p => refYear - parseInt(p.dateNaissance?.split('-')[0] ?? '1980', 10));
    this.trancheAgeStats.set([
      { label: '< 25 ans',  count: ages.filter(a => a < 25).length },
      { label: '25–35 ans', count: ages.filter(a => a >= 25 && a <= 35).length },
      { label: '36–45 ans', count: ages.filter(a => a >= 36 && a <= 45).length },
      { label: '46–55 ans', count: ages.filter(a => a >= 46 && a <= 55).length },
      { label: '> 55 ans',  count: ages.filter(a => a > 55).length },
    ]);

    // Line: Évolution des recensements par mois
    const monthMap = new Map<string, number>();
    for (const p of scored) {
      const ym = p.dateRecensement?.slice(0, 7) ?? '';
      if (ym) monthMap.set(ym, (monthMap.get(ym) ?? 0) + 1);
    }
    this._linePts.set(
      [...monthMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([ym, count]) => {
          const [year, monthIdx] = ym.split('-');
          return { month: ym, label: `${MONTHS_FR[parseInt(monthIdx, 10) - 1]} ${year}`, count };
        }),
    );

    this.loaded.set(true);
  }

  pct(part: number, total: number): number {
    return Math.round((part / total) * 100);
  }

  private buildPie(data: { label: string; count: number }[], colors: string[]): PieSlice[] {
    const total = data.reduce((s, d) => s + d.count, 0);
    const CX = 60, CY = 60, R = 54;
    let cumAngle = -Math.PI / 2;
    return data.map((d, i) => {
      const proportion = total > 0 ? d.count / total : 0;
      const angle = proportion * 2 * Math.PI;
      const x1 = CX + R * Math.cos(cumAngle);
      const y1 = CY + R * Math.sin(cumAngle);
      cumAngle += angle;
      const x2 = CX + R * Math.cos(cumAngle);
      const y2 = CY + R * Math.sin(cumAngle);
      const largeArc = angle > Math.PI ? 1 : 0;
      const path = proportion >= 1
        ? `M ${CX} ${CY - R} A ${R} ${R} 0 1 1 ${CX - 0.01} ${CY - R} Z`
        : proportion === 0
          ? ''
          : `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
      return { label: d.label, count: d.count, pct: Math.round(proportion * 100), color: colors[i % colors.length], d: path };
    });
  }
}
