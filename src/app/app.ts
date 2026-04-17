import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaInstallPromptComponent } from './pwa-install-prompt/pwa-install-prompt';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PwaInstallPromptComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<router-outlet /><app-pwa-install-prompt />`,
})
export class App {}
