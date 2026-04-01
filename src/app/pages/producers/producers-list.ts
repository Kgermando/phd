import { ChangeDetectionStrategy, Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { db } from '../../db/database';
import { Producer } from '../../models/models';
import { scoreProducer } from '../../utils/scoring';

const ZONES = ['Toutes', 'Yalisenza', 'Monzamboli', 'Kwanza', 'Yandongi-Yamandika', 'Manga', 'Bilia', 'YALGBA'];

@Component({
  selector: 'app-producers-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, MatIcon],
  templateUrl: './producers-list.html',
  styleUrl: './producers-list.scss',
})
export class ProducersListComponent implements OnInit {
  protected all = signal<(Producer & { score: number })[]>([]);
  search = signal('');
  zoneFilter = signal('Toutes');
  eligFilter = signal('tous');
  sexeFilter = signal('tous');
  readonly zones = ZONES;

  filtered = computed(() => {
    const q = this.search().toLowerCase();
    return this.all().filter((p) => {
      if (q && !p.nom.toLowerCase().includes(q) && !p.village.toLowerCase().includes(q)) return false;
      if (this.zoneFilter() !== 'Toutes' && p.zone !== this.zoneFilter()) return false;
      if (this.eligFilter() === 'eligible' && p.score < 60) return false;
      if (this.eligFilter() === 'non' && p.score >= 60) return false;
      if (this.sexeFilter() !== 'tous' && p.sexe !== this.sexeFilter()) return false;
      return true;
    });
  });

  eligibleCount = computed(() => this.all().filter(p => p.score >= 60).length);
  femmesCount = computed(() => this.all().filter(p => p.sexe === 'femme').length);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    const raw = await db.producers.toArray();
    this.all.set(raw.map((p) => ({ ...p, score: scoreProducer(p).total })));
  }

  totalha(p: Producer): number {
    return p.champs.reduce((s, c) => s + c.superficie, 0);
  }

  async delete(p: Producer & { score: number }): Promise<void> {
    if (!confirm(`Supprimer ${p.nom} ? Cette action est irréversible.`)) return;
    await db.producers.delete(p.id!);
    await this.load();
  }

  resetFilters(): void {
    this.search.set('');
    this.zoneFilter.set('Toutes');
    this.eligFilter.set('tous');
    this.sexeFilter.set('tous');
  }

  initials(nom: string): string {
    const parts = nom.trim().split(' ');
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }
}
