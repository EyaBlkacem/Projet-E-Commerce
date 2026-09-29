import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-horizontal-entreprises',
    templateUrl: './horizontalEntreprises.component.html',
    styleUrls: ['./horizontalEntreprises.component.scss'],
    standalone: false
})

/**
 * Horizontal Component
 */
export class HorizontalEntreprisesComponent implements OnInit {

  constructor() { }

  isCondensed = false;

  ngOnInit(): void {
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
