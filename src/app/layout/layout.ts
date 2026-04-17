import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { AuthService } from '../auth/services/auth.service';

@Component({
  selector: 'app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIcon],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class LayoutComponent {
  protected auth = inject(AuthService);
  protected menuOpen = signal(false);
  protected profileDropdownOpen = signal(false);
  protected isProducteur = computed(() => this.auth.currentUser()?.role === 'Producteur');

  toggleMenu(): void { this.menuOpen.update(v => !v); }
  closeMenu(): void { this.menuOpen.set(false); }
  toggleProfileDropdown(): void { this.profileDropdownOpen.update(v => !v); }
  closeProfileDropdown(): void { this.profileDropdownOpen.set(false); }
  logout(): void { this.auth.logout(); }
}
