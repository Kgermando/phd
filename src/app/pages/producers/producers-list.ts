import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Producer, ProducerStats } from '../../models/models';
import { ProducersService } from '../../services/producers.service';
import { AuthService } from '../../auth/services/auth.service';

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
  currentPage = signal(1);
  totalPages = signal(1);
  totalRecords = signal(0);
  pageSize = signal(15);

  loading = computed(() => this.producersService.loading());
  error = computed(() => this.producersService.error());

  /** Pending local producers not yet synced */
  pending = computed(() => this.producersService.pendingSync());

  /** Online producers filtered by sexe + zone */
  private filteredOnline = computed(() => {
    const sexe = this.sexeFilter();
    const zone = this.zoneFilter();
    return this.all().filter(p =>
      (sexe === 'tous' || p.sexe === sexe) &&
      (!zone || p.zone === zone)
    );
  });

  /** Pending producers filtered by sexe + zone (local-only, prefix list) */
  private filteredPending = computed(() => {
    const sexe = this.sexeFilter();
    const zone = this.zoneFilter();
    return this.pending().filter(p =>
      (sexe === 'tous' || p.sexe === sexe) &&
      (!zone || p.zone === zone)
    );
  });

  /** Combined: pending rows first (visually distinct), then server rows */
  filtered = computed(() => [...this.filteredPending(), ...this.filteredOnline()]);

  private stats = signal<ProducerStats | null>(null);

  totalCount = computed(() => this.stats()?.Total ?? this.totalRecords());
  eligibleCount = computed(() => this.stats()?.Eligible ?? 0);
  nonEligibleCount = computed(() => this.stats()?.NonEligible ?? 0);
  femmesCount = computed(() => this.stats()?.Femmes ?? 0);
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
    return p.scores?.[0]?.score_total ?? 0;
  }

  isEligible(p: Producer): boolean {
    return p.scores?.[0]?.recommande ?? false;
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
