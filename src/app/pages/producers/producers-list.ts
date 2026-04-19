import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Producer, ProducerStats } from '../../models/models';
import { ProducersService } from '../../services/producers.service';
import { AuthService } from '../../auth/services/auth.service';
import { NOMS_PROVINCES, getTerritoiresByProvince } from '../../utils/rdc-geo';
import { scoreProducer } from '../../utils/scoring';

@Component({
  selector: 'app-producers-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, MatIcon],
  templateUrl: './producers-list.html',
  styleUrl: './producers-list.scss',
})
export class ProducersListComponent implements OnInit {
  private producersService = inject(ProducersService);
  protected auth = inject(AuthService);

  all = signal<Producer[]>([]);
  search = signal('');
  villageFilter = signal('');
  zoneFilter = signal('');
  sexeFilter = signal('tous');
  provinceFilter = signal('');
  territoireFilter = signal('');

  readonly provinces = NOMS_PROVINCES;
  territoiresOptions = computed(() => getTerritoiresByProvince(this.provinceFilter()));
  currentPage = signal(1);
  totalPages = signal(1);
  totalRecords = signal(0);
  pageSize = signal(15);

  loading = computed(() => this.producersService.loading());
  error = computed(() => this.producersService.error());

  /** Pending local producers not yet synced */
  pending = computed(() => this.producersService.pendingSync());

  /**
   * Online producers filtered by sexe only.
   * Province, territoire, zone and village are already applied server-side.
   */
  private filteredOnline = computed(() => {
    const sexe = this.sexeFilter();
    return this.all().filter(p => sexe === 'tous' || p.sexe === sexe);
  });

  /** Pending producers filtered by sexe + zone + province + territoire (local-only, prefix list) */
  private filteredPending = computed(() => {
    const sexe = this.sexeFilter();
    const zone = this.zoneFilter();
    const province = this.provinceFilter();
    const territoire = this.territoireFilter();
    return this.pending().filter(p =>
      (sexe === 'tous' || p.sexe === sexe) &&
      (!zone || p.zone === zone) &&
      (!province || p.province === province) &&
      (!territoire || p.territoire === territoire)
    );
  });

  /** Combined: pending rows first (visually distinct), then server rows */
  filtered = computed(() => [...this.filteredPending(), ...this.filteredOnline()]);

  private stats = signal<ProducerStats | null>(null);

  totalCount = computed(() => this.stats()?.total ?? this.totalRecords());
  eligibleCount = computed(() => this.stats()?.eligible ?? 0);
  nonEligibleCount = computed(() => this.stats()?.non_eligible ?? 0);
  femmesCount = computed(() => this.stats()?.femmes ?? 0);
  pendingCount = computed(() => this.pending().length);

  async ngOnInit(): Promise<void> {
    // Try to push any previously saved offline producers
    if (navigator.onLine) {
      await this.producersService.syncPending();
    }
    await Promise.all([this.load(), this.loadStats()]);
  }

  private async loadStats(): Promise<void> {
    const stats = await this.producersService.getStats();
    if (stats) this.stats.set(stats);
  }

  private async load(): Promise<void> {
    const result = await this.producersService.getPaginatedProducers(
      this.currentPage(),
      this.pageSize(),
      this.search(),
      this.villageFilter(),
      this.provinceFilter(),
      this.territoireFilter(),
      this.zoneFilter(),
    );
    this.all.set(result.data);
    this.totalPages.set(result.total_pages);
    this.totalRecords.set(result.total);
  }

  async onSearch(): Promise<void> {
    this.currentPage.set(1);
    await this.load();
  }

  async nextPage(): Promise<void> {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      await this.load();
    }
  }

  async previousPage(): Promise<void> {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      await this.load();
    }
  }

  getScore(p: Producer): number {
    // 1. Server-computed score from paginated list (> 0 means backend scored it)
    if (p.total_score != null && p.total_score > 0) return Math.round(p.total_score);
    // 2. Manually assigned score stored in DB
    if (p.scores?.[0]?.score_total) return p.scores[0].score_total;
    // 3. Compute client-side from producer fields (offline or no score assigned yet)
    return scoreProducer(p).total;
  }

  isEligible(p: Producer): boolean {
    return this.getScore(p) >= 60;
  }

  totalha(p: Producer): number {
    return (p.champs ?? []).reduce((s, c) => s + c.superficie, 0);
  }

  async delete(p: Producer): Promise<void> {
    if (!confirm(`Supprimer ${p.nom} ? Cette action est irrÃ©versible.`)) return;
    if (p._pending) {
      // Remove from local storage only
      this.producersService.removePending(p.uuid!);
    } else if (p.uuid) {
      await this.producersService.deleteProducer(p.uuid);
      await this.load();
    }
  }

  resetFilters(): void {
    this.search.set('');
    this.villageFilter.set('');
    this.zoneFilter.set('');
    this.sexeFilter.set('tous');
    this.provinceFilter.set('');
    this.territoireFilter.set('');
    this.currentPage.set(1);
    this.load();
  }

  initials(nom: string): string {
    return nom
      .split(' ')
      .slice(0, 2)
      .map(w => w.charAt(0).toUpperCase())
      .join('');
  }
}
