import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../../models/models';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  loginForm: FormGroup;
  error = signal('');
  loading = signal(false);
  showPassword = signal(false);
  isOnline = signal(navigator.onLine);

  constructor() {
    this.loginForm = this.fb.group({
      identifier: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    window.addEventListener('online', () => this.isOnline.set(true));
    window.addEventListener('offline', () => this.isOnline.set(false));

    this.restoreSession();
  }

  /**
   * Restaurer la session depuis le stockage local
   */
  private async restoreSession(): Promise<void> {
    await this.auth.restoreSession();
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Soumettre le formulaire de connexion
   */
  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.error.set('Veuillez remplir tous les champs correctement.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const loginData: LoginRequest = {
        identifier: this.loginForm.get('identifier')?.value.trim(),
        password: this.loginForm.get('password')?.value,
      };

      const result = await this.auth.login(loginData);

      if (result.success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.error.set(result.message);
      }
    } catch (err: any) {
      this.error.set(err.message || 'Erreur lors de la connexion');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Basculer la visibilité du mot de passe
   */
  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  /**
   * Navigation vers mot de passe oublié
   */
  goToForgotPassword(): void {
    this.router.navigate(['/auth/forgot-password']);
  }

  /**
   * Obtenir le statut de connexion
   */
  get connectionStatus(): string {
    return this.isOnline() ? 'En ligne' : 'Hors ligne';
  }
}
