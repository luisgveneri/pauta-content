import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map } from 'rxjs';

type NavItem = {
  label: string;
  icon: string;
  route: string;
};

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
  templateUrl: './app-shell.component.html',
})
export class AppShellComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);

  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Viral Content', icon: 'insights', route: '/content' },
    { label: 'Idea Generator', icon: 'auto_awesome', route: '/ideas' },
    { label: 'Planner', icon: 'event_note', route: '/planner' },
  ];

  protected readonly isHandset = toSignal(
    this.breakpointObserver.observe(['(max-width: 959px)']).pipe(map((s) => s.matches)),
    { initialValue: false },
  );

  protected readonly sidenavOpened = computed(() => !this.isHandset());
}

