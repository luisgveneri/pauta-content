import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { ClerkService } from './clerk.service';

@Component({
  selector: 'app-select-organization-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="flex min-h-screen items-center justify-center bg-slate-50">
      <div #mountPoint></div>
    </div>
  `,
})
export class SelectOrganizationPage {
  private readonly clerk = inject(ClerkService);
  private readonly mountPoint = viewChild.required<ElementRef<HTMLDivElement>>('mountPoint');

  constructor() {
    afterNextRender(() => void this.mount());
  }

  private async mount() {
    await this.clerk.init();
    this.clerk.instance?.mountOrganizationList(this.mountPoint().nativeElement, {
      afterSelectOrganizationUrl: '/dashboard',
      afterCreateOrganizationUrl: '/dashboard',
      hidePersonal: true,
    });
  }
}
