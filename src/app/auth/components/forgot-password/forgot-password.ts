import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
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
    MatCardModule,
  ],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  forgotForm: FormGroup;
  error = signal('');
  success = signal('');
  loading = signal(false);
  submitted = signal(false);

  constructor() {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  /**
   * Soumettre le formulaire
   */
  async onSubmit(): Promise<void> {
    if (this.forgotForm.invalid) {
      this.error.set('Veuillez entrer une adresse email valide.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    try {
      const email = this.forgotForm.get('email')?.value.trim();
      const result = await this.auth.forgotPassword(email);

      if (result.success) {
        this.success.set('Email de réinitialisation envoyé. Vérifiez votre messagerie.');
        this.forgotForm.reset();
        this.submitted.set(true);

        // Rediriger après 3 secondes
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 3000);
      } else {
        this.error.set(result.message);
      }
    } catch (err: any) {
      this.error.set(err.message || 'Erreur lors de la demande');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Retour à la connexion
   */
  backToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
