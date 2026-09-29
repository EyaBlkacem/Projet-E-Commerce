import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';

@Component({
    selector: 'app-horizontal-users',
    templateUrl: './horizontalUsers.component.html',
    styleUrls: ['./horizontalUsers.component.scss'],
    standalone: false
})
/**
 * Horizontal Component
 */
export class HorizontalUsersComponent implements OnInit, AfterViewInit, OnDestroy {
  constructor() { }
  isCondensed = false;

  // ✅ NOUVEAU : recale dynamiquement le menu horizontal et le contenu
  // sous la topbar fixe, quelle que soit sa hauteur réelle (avec ou sans
  // la rangée de recherche).
  private resizeObserver?: ResizeObserver;
  private boundSync = () => this.syncLayoutOffsets();

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    // Petit délai pour laisser le DOM des enfants (topbar + menu) se stabiliser
    setTimeout(() => this.syncLayoutOffsets(), 0);

    const topbarEl = document.getElementById('page-topbar');
    if (topbarEl && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.syncLayoutOffsets());
      this.resizeObserver.observe(topbarEl);
    } else {
      window.addEventListener('resize', this.boundSync);
      setTimeout(() => this.syncLayoutOffsets(), 300);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.boundSync);
  }

  private syncLayoutOffsets(): void {
    const topbarEl = document.getElementById('page-topbar');
    if (!topbarEl) return;

    const topbarHeight = topbarEl.offsetHeight;

    // Le composant du menu horizontal est un élément custom <app-horizontal-topbar-user>,
    // qu'on positionne directement sous la topbar mesurée.
    const menuEl = document.querySelector('app-horizontal-topbar-user') as HTMLElement | null;
    if (menuEl) {
      menuEl.style.display = 'block';
      menuEl.style.position = 'relative';
      menuEl.style.marginTop = `${topbarHeight}px`;
    }

    const menuHeight = menuEl ? menuEl.offsetHeight : 0;

    const mainContentEl = document.querySelector('.main-content') as HTMLElement | null;
    if (mainContentEl) {
      mainContentEl.style.marginTop = `${topbarHeight + menuHeight}px`;
    }
  }

  /**
   * on settings button clicked from topbar
   */
  onSettingsButtonClicked() {
    document.body.classList.toggle('right-bar-enabled');
    const rightBar = document.getElementById('theme-settings-offcanvas');
    if (rightBar != null) {
      rightBar.classList.toggle('show');
      rightBar.setAttribute('style', "visibility: visible;");
    }
  }
  /**
   * On mobile toggle button clicked
   */
  onToggleMobileMenu() {
    if (document.documentElement.clientWidth <= 1024) {
      document.body.classList.toggle('menu');
    }
  }
}