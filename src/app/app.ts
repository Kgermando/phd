import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaInstallPromptComponent } from './pwa-install-prompt/pwa-install-prompt';
import { AppUpdateService } from './services/app-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PwaInstallPromptComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<router-outlet /><app-pwa-install-prompt />`,
})
export class App implements OnInit {
  private readonly appUpdate = inject(AppUpdateService);

  ngOnInit(): void {
    this.appUpdate.init();
  }
}
