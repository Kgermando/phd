import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';

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

  toggleMenu(): void { this.menuOpen.update(v => !v); }
  closeMenu(): void { this.menuOpen.set(false); }
  logout(): void { this.auth.logout(); }
}
