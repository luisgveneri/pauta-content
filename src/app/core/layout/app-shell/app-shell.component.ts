import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map } from 'rxjs';
import { ClerkService } from '../../auth/clerk.service';
import { OrgContextService } from '../../auth/org-context.service';

type NavItem = {
  label: string;
  icon: string;
  route: string;
};

const BASE_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
  { label: 'Viral Content', icon: 'insights', route: '/content' },
  { label: 'Idea Generator', icon: 'auto_awesome', route: '/ideas' },
  { label: 'Planner', icon: 'event_note', route: '/planner' },
  { label: 'Instagram', icon: 'photo_camera', route: '/instagram' },
];

const CLUB_NAV_ITEMS: NavItem[] = [
  { label: 'Campaigns', icon: 'campaign', route: '/campaigns' },
  { label: 'Playtomic', icon: 'sports_tennis', route: '/playtomic' },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './app-shell.component.html',
})
export class AppShellComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly clerk = inject(ClerkService);
  private readonly orgContext = inject(OrgContextService);
  private readonly orgSwitcherMount = viewChild<ElementRef<HTMLDivElement>>('orgSwitcherMount');
  private readonly userButtonMount = viewChild<ElementRef<HTMLDivElement>>('userButtonMount');

  protected readonly navItems = computed<NavItem[]>(() =>
    this.orgContext.isClub() ? [...BASE_NAV_ITEMS, ...CLUB_NAV_ITEMS] : BASE_NAV_ITEMS,
  );

  protected readonly isHandset = toSignal(
    this.breakpointObserver.observe(['(max-width: 959px)']).pipe(map((s) => s.matches)),
    { initialValue: false },
  );

  protected readonly sidenavOpened = computed(() => !this.isHandset());

  constructor() {
    afterNextRender(() => {
      void this.mountOrgSwitcher();
      void this.mountUserButton();
    });
  }

  private async mountOrgSwitcher() {
    await this.clerk.init();
    const mount = this.orgSwitcherMount();
    if (mount) {
      this.clerk.instance?.mountOrganizationSwitcher(mount.nativeElement, {
        hidePersonal: true,
        afterLeaveOrganizationUrl: '/select-organization',
      });
    }
  }

  private async mountUserButton() {
    await this.clerk.init();
    const mount = this.userButtonMount();
    if (mount) {
      this.clerk.instance?.mountUserButton(mount.nativeElement, {
        afterSignOutUrl: '/sign-in',
      });
    }
  }
}
