import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { EventService } from '../core/services/event.service';

// Store
import { RootReducerState } from '../store';
import { Store } from '@ngrx/store';

@Component({
    selector: 'app-layout-entreprises',
    templateUrl: './layoutEntreprises.component.html',
    styleUrls: ['./layoutEntreprises.component.scss'],
    standalone: false
})

/**
 * Layout Component
 */
export class LayoutEntreprisesComponent implements OnInit {

  layoutType!: string;

  constructor(private store: Store<RootReducerState>, private translateService:TranslateService) { }

  ngOnInit(): void {
    this.store.select('layout').subscribe((data) => {
      this.layoutType = data.LAYOUT;
      document.documentElement.setAttribute('data-layout', data.LAYOUT);
      document.documentElement.setAttribute('data-bs-theme', data.LAYOUT_MODE);
      document.documentElement.setAttribute('data-layout-width', data.LAYOUT_WIDTH);
      document.documentElement.setAttribute('data-layout-position', data.LAYOUT_POSITION);
      document.documentElement.setAttribute('data-topbar', data.TOPBAR);
      data.LAYOUT == "vertical" || data.LAYOUT == "twocolumn" ? document.documentElement.setAttribute('data-sidebar', data.SIDEBAR_COLOR) : '';
      data.LAYOUT == "vertical" || data.LAYOUT == "twocolumn" ? document.documentElement.setAttribute('data-sidebar-size', data.SIDEBAR_SIZE) : '';
      data.LAYOUT == "vertical" || data.LAYOUT == "twocolumn" ? document.documentElement.setAttribute('data-sidebar-image', data.SIDEBAR_IMAGE) : '';
      data.LAYOUT == "vertical" || data.LAYOUT == "twocolumn" ? document.documentElement.setAttribute('data-layout-style', data.SIDEBAR_VIEW) : '';
      document.documentElement.setAttribute('data-preloader', data.DATA_PRELOADER)
      document.documentElement.setAttribute('data-sidebar-visibility', data.SIDEBAR_VISIBILITY);
    })

        // Pour Menu apprait horizental
    document.documentElement.setAttribute('data-layout', 'horizontal');
    document.body.setAttribute('data-layout', 'horizontal');
    document.body.setAttribute('data-topbar', 'light'); // أو dark
    //
    // ✅ اللغة الافتراضية
    this.translateService.setDefaultLang('fr');
    this.translateService.use('fr');

  }


  /**
  * Check if the vertical layout is requested
  */
  isVerticalLayoutRequested() {
    return this.layoutType === 'vertical';
  }

  /**
   * Check if the semibox layout is requested
   */
  isSemiboxLayoutRequested() {
    return this.layoutType === 'semibox';
  }

  /**
   * Check if the horizontal layout is requested
   */
  isHorizontalLayoutRequested() {
    return this.layoutType === 'horizontal';
  }

  /**
   * Check if the horizontal layout is requested
   */
  isTwoColumnLayoutRequested() {
    return this.layoutType === 'twocolumn';
  }

}
