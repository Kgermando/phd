import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../auth/services/auth.service';
import { MatIcon } from '@angular/material/icon';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon, DatePipe],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfileComponent {
  protected auth = inject(AuthService);

  getRoleLabel(role: string): string {
    const roleMap: { [key: string]: string } = {
      'Directeur': 'Directeur',
      'Superviseur': 'Superviseur',
      'Producteur': 'Producteur',
      'Admin': 'Administrateur',
    };
    return roleMap[role] || role;
  }
}
