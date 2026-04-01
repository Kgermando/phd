import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { db } from '../../db/database';
import { Producer } from '../../models/models';
import { scoreProducer } from '../../utils/scoring';

interface ZoneStat { zone: string; count: number; eligible: number; avgScore: number; }

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
  zones = signal<ZoneStat[]>([]);
  maxZoneCount = signal(1);
  recent = signal<Producer[]>([]);

  async ngOnInit(): Promise<void> {
    const all = await db.producers.toArray();
    const scored = all.map((p) => ({ ...p, score: scoreProducer(p).total }));

    this.total.set(scored.length);
    const eli = scored.filter((p) => p.score >= 60);
    this.eligible.set(eli.length);
    this.nonEligible.set(scored.length - eli.length);
    this.femmes.set(scored.filter((p) => p.sexe === 'femme').length);
    const avg = scored.length ? Math.round(scored.reduce((s, p) => s + p.score, 0) / scored.length) : 0;
    this.avgScore.set(avg);

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
    this.loaded.set(true);
  }

  pct(part: number, total: number): number {
    return Math.round((part / total) * 100);
  }
}
