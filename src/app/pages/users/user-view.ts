import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { Producer, UserResponse } from '../../models/models';
import { ApiService } from '../../services/api.service';
import { ProducersService } from '../../services/producers.service';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-user-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, MatIcon],
  templateUrl: './user-view.html',
  styleUrl: './user-view.scss',
})
export class UserViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private producersService = inject(ProducersService);
  protected auth = inject(AuthService);

  protected user = signal<UserResponse | null>(null);
  protected producers = signal<Producer[]>([]);
  protected search = signal('');
  protected sexeFilter = signal<'tous' | 'homme' | 'femme'>('tous');
  protected currentPage = signal(1);
  protected totalPages = signal(1);
  protected total = signal(0);
  protected pageSize = signal(15);
  protected userLoading = signal(false);
  protected userError = signal<string | null>(null);

  protected loading = computed(() => this.userLoading() || this.producersService.loading());
  protected error = computed(() => this.userError() || this.producersService.error());

  protected filtered = computed(() => {
    const sexe = this.sexeFilter();
    return sexe === 'tous' ? this.producers() : this.producers().filter(p => p.sexe === sexe);
  });

  private userUUID = '';

  async ngOnInit(): Promise<void> {
    this.userUUID = this.route.snapshot.paramMap.get('id') ?? '';
    await Promise.all([this.loadUser(), this.loadProducers()]);
  }

  private async loadUser(): Promise<void> {
    this.userLoading.set(true);
    this.userError.set(null);
    try {
      const response = await firstValueFrom(this.api.getUser(this.userUUID));
      this.user.set(response.data);
    } catch (err: any) {
      this.userError.set(err.message ?? 'Erreur lors du chargement de l\'utilisateur');
    } finally {
      this.userLoading.set(false);
    }
  }

  private async loadProducers(): Promise<void> {
    const result = await this.producersService.getPaginatedProducersByUserUUID(
      this.userUUID,
      this.currentPage(),
      this.pageSize(),
      this.search()
    );
    this.producers.set(result.data);
    this.totalPages.set(result.total_pages);
    this.total.set(result.total);
  }

  async onSearch(): Promise<void> {
    this.currentPage.set(1);
    await this.loadProducers();
  }

  resetFilters(): void {
    this.search.set('');
    this.sexeFilter.set('tous');
    this.currentPage.set(1);
    void this.loadProducers();
  }

  async nextPage(): Promise<void> {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      await this.loadProducers();
    }
  }

  async previousPage(): Promise<void> {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      await this.loadProducers();
    }
  }

  protected getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      Directeur: 'Directeur',
      Superviseur: 'Superviseur',
      Producteur: 'Agent',
      Admin: 'Administrateur',
    };
    return map[role] ?? role;
  }

  protected getStatusLabel(status: boolean): string {
    return status ? 'Actif' : 'Inactif';
  }

  protected getStatusBadgeClass(status: boolean): string {
    return status ? 'badge badge-active' : 'badge badge-inactive';
  }
}
