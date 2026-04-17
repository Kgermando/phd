import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { UserResponse } from '../../models/models';
import { UsersService } from '../../services/users.service';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-users-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIcon],
  templateUrl: './users-list.html',
  styleUrl: './users-list.scss',
})
export class UsersListComponent implements OnInit {
  private usersService = inject(UsersService);
  protected auth = inject(AuthService);

  protected all = signal<UserResponse[]>([]);
  search = signal('');
  currentPage = signal(1);
  totalPages = signal(1);
  pageSize = signal(15);

  loading = computed(() => this.usersService.loading());
  error = computed(() => this.usersService.error());

  readonly roles = ['Directeur', 'Superviseur', 'Producteur', 'Admin'];

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    const result = await this.usersService.getPaginatedUsers(
      this.currentPage(),
      this.pageSize(),
      this.search()
    );
    this.all.set(result.data);
    this.totalPages.set(result.pagination.total_pages);
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

  getRoleLabel(role: string): string {
    const roleMap: { [key: string]: string } = {
      'Directeur': 'Directeur',
      'Superviseur': 'Superviseur',
      'Producteur': 'Producteur',
      'Admin': 'Administrateur',
    };
    return roleMap[role] || role;
  }

  getStatusBadgeClass(status: boolean): string {
    return status ? 'badge-active' : 'badge-inactive';
  }

  getStatusLabel(status: boolean): string {
    return status ? 'Actif' : 'Inactif';
  }
}
