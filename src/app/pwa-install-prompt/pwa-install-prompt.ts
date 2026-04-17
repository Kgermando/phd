import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  signal,
} from '@angular/core';

type Platform = 'ios' | 'mac-safari' | 'chromium' | 'unknown';

const DISMISSED_KEY = 'pwa-install-dismissed';

@Component({
  selector: 'app-pwa-install-prompt',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pwa-install-prompt.html',
  styleUrl: './pwa-install-prompt.scss',
  host: { 'aria-live': 'polite' },
})
export class PwaInstallPromptComponent implements OnInit {
  protected platform = signal<Platform>('unknown');
  protected deferredPrompt = signal<Event | null>(null);
  protected visible = signal(false);

  protected isIos = computed(() => this.platform() === 'ios');
  protected isMacSafari = computed(() => this.platform() === 'mac-safari');
  protected isChromium = computed(() => this.platform() === 'chromium');
  protected showManualSteps = computed(() => this.isIos() || this.isMacSafari());

  ngOnInit(): void {
    if (this.isAlreadyInstalled() || localStorage.getItem(DISMISSED_KEY)) {
      return;
    }

    this.platform.set(this.detectPlatform());

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt.set(e);
      this.platform.set('chromium');
      this.visible.set(true);
    });

    // iOS & Mac Safari have no beforeinstallprompt — show manual guide
    if (this.platform() === 'ios' || this.platform() === 'mac-safari') {
      this.visible.set(true);
    }
  }

  protected async install(): Promise<void> {
    const prompt = this.deferredPrompt() as BeforeInstallPromptEvent | null;
    if (!prompt) return;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;

    if (outcome === 'accepted') {
      this.dismiss();
    }
    this.deferredPrompt.set(null);
  }

  protected dismiss(): void {
    localStorage.setItem(DISMISSED_KEY, '1');
    this.visible.set(false);
  }

  private detectPlatform(): Platform {
    const ua = navigator.userAgent;

    const isIos = /iphone|ipad|ipod/i.test(ua);
    if (isIos) return 'ios';

    const isMac = /macintosh|mac os x/i.test(ua);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    if (isMac && isSafari) return 'mac-safari';

    return 'unknown';
  }

  private isAlreadyInstalled(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }
}

// Extend Event types for the non-standard BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
