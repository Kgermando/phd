import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { AuthService } from '../auth/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIcon, MatTooltip],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class LayoutComponent {
  protected auth = inject(AuthService);
  private router = inject(Router);
  protected menuOpen = signal(false);
  protected profileDropdownOpen = signal(false);
  protected isProducteur = computed(() => this.auth.currentUser()?.role === 'Producteur');

  toggleMenu(): void { this.menuOpen.update(v => !v); }
  closeMenu(): void { this.menuOpen.set(false); }
  toggleProfileDropdown(): void { this.profileDropdownOpen.update(v => !v); }
  closeProfileDropdown(): void { this.profileDropdownOpen.set(false); }
  logout(): void { this.auth.logout(); }
  refresh(): void { this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: 'reload' }); }
}
