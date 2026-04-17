import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { UsersService } from '../../services/users.service';
import { User, UserResponse } from '../../models/models';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-user-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIcon, CommonModule],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private usersService = inject(UsersService);
  protected auth = inject(AuthService);

  readonly roles = ['Directeur', 'Superviseur', 'Producteur', 'Admin'];
  isEdit = signal(false);
  saving = signal(false);
  saved = signal(false);
  saveError = signal<string | null>(null);
  currentUser = signal<UserResponse | null>(null);

  form!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    const userId = this.route.snapshot.paramMap.get('id');
    
    if (userId) {
      this.isEdit.set(true);
      this.loadUser(userId);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      fullname: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required]],
      role: ['Producteur', Validators.required],
      permission: ['read'],
      password: ['', this.isEdit() ? [] : Validators.required],
      password_confirm: [''],
      status: [false],
    });
  }

  private async loadUser(userId: string): Promise<void> {
    try {
      const user = await this.usersService.getUserByUuid(userId);

      if (user) {
        this.currentUser.set(user);
        this.form.patchValue({
          fullname: user.fullname,
          email: user.email,
          telephone: user.telephone,
          role: user.role,
          permission: user.permission,
          status: user.status,
        });
      } else {
        this.saveError.set('Utilisateur introuvable');
      }
    } catch (err: any) {
      this.saveError.set('Erreur lors du chargement de l\'utilisateur');
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.form.valid) return;

    this.saving.set(true);
    this.saveError.set(null);
    this.saved.set(false);

    try {
      const formValue = this.form.value;
      
      // Validation des mots de passe
      if (!this.isEdit() && formValue.password !== formValue.password_confirm) {
        this.saveError.set('Les mots de passe ne correspondent pas');
        this.saving.set(false);
        return;
      }

      const userData: User = {
        uuid: this.currentUser()?.uuid || '',
        fullname: formValue.fullname || '',
        email: formValue.email || '',
        telephone: formValue.telephone || '',
        password: formValue.password || '',
        password_confirm: formValue.password_confirm || '',
        role: formValue.role || 'Producteur',
        permission: formValue.permission || '',
        status: formValue.status ?? false,
      };

      if (this.isEdit()) {
        // Update user
        await this.usersService.updateUser(this.currentUser()!.uuid, userData);
      } else {
        // Create new user
        await this.usersService.createUser(userData);
      }

      this.saved.set(true);
      setTimeout(() => {
        this.router.navigate(['/utilisateurs']);
      }, 1500);
    } catch (err: any) {
      this.saveError.set(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      this.saving.set(false);
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

  cancel(): void {
    this.router.navigate(['/utilisateurs']);
  }

  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    if (field.hasError('required')) {
      return `${fieldName} est requis`;
    }
    if (field.hasError('minlength')) {
      return `${fieldName} doit contenir au moins ${field.getError('minlength').requiredLength} caractères`;
    }
    if (field.hasError('email')) {
      return 'Adresse email invalide';
    }

    return 'Format invalide';
  }
}
