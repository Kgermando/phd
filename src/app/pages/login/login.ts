import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIcon],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  error = signal('');
  loading = signal(false);

  async onSubmit(): Promise<void> {
    if (!this.username || !this.password) {
      this.error.set('Veuillez remplir tous les champs.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const ok = await this.auth.login(this.username, this.password);
    this.loading.set(false);
    if (ok) {
      this.router.navigate(['/dashboard']);
    } else {
      this.error.set('Identifiant ou mot de passe incorrect.');
    }
  }
}
