import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
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
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPasswordComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  resetForm: FormGroup;
  error = signal('');
  success = signal('');
  loading = signal(false);
  validating = signal(true);
  tokenValid = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  token = '';

  constructor() {
    this.resetForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        password_confirm: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  /**
   * Initialisation
   */
  async ngOnInit(): Promise<void> {
    // Récupérer le token de l'URL
    this.token = this.route.snapshot.paramMap.get('token') || '';

    if (!this.token) {
      this.error.set('Token invalide');
      this.validating.set(false);
      return;
    }

    // Vérifier le token
    const result = await this.auth.verifyResetToken(this.token);
    this.validating.set(false);

    if (result.success) {
      this.tokenValid.set(true);
    } else {
      this.error.set(result.message || 'Token invalide ou expiré');
    }
  }

  /**
   * Validateur personnalisé pour les mots de passe
   */
  private passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('password_confirm')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }

    return null;
  }

  /**
   * Soumettre le formulaire
   */
  async onSubmit(): Promise<void> {
    if (this.resetForm.invalid) {
      this.error.set('Veuillez remplir tous les champs correctement.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    try {
      const password = this.resetForm.get('password')?.value;
      const confirmPassword = this.resetForm.get('password_confirm')?.value;

      const result = await this.auth.resetPassword(this.token, password, confirmPassword);

      if (result.success) {
        this.success.set('Mot de passe réinitialisé avec succès. Redirection en cours...');
        this.resetForm.reset();

        // Rediriger après 2 secondes
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      } else {
        this.error.set(result.message);
      }
    } catch (err: any) {
      this.error.set(err.message || 'Erreur lors de la réinitialisation');
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
   * Basculer la visibilité de la confirmation
   */
  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  /**
   * Retour à la connexion
   */
  backToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
