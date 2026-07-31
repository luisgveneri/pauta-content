import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { ClerkService } from './clerk.service';

@Component({
  selector: 'app-sign-in-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="flex min-h-screen items-center justify-center bg-slate-50">
      <div #mountPoint></div>
    </div>
  `,
})
export class SignInPage {
  private readonly clerk = inject(ClerkService);
  private readonly mountPoint = viewChild.required<ElementRef<HTMLDivElement>>('mountPoint');

  constructor() {
    afterNextRender(() => void this.mount());
  }

  private async mount() {
    await this.clerk.init();
    this.clerk.instance?.mountSignIn(this.mountPoint().nativeElement, {
      fallbackRedirectUrl: '/select-organization',
    });
  }
}
