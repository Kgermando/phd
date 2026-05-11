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
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  loginForm: FormGroup;
  error = signal('');
  loading = signal(false);
  showPassword = signal(false);

  constructor() {
    this.loginForm = this.fb.group({
      identifier: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
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
        const target = this.auth.currentUser()?.role === 'Producteur' ? '/producteurs' : '/dashboard';
        this.router.navigate([target]);
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
}
