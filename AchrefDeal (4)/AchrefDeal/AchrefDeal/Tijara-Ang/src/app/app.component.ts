import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent {
  title = 'TIJARA';

  constructor( public translate  : TranslateService) {
    translate.setDefaultLang('fr');
    translate.use('fr');
        this.translate.onLangChange.subscribe((event) => {
          this.updateDirection(event.lang);
        });
  }
 


  updateDirection(lang: string) {
    const html = document.documentElement;
    const body = document.body;

    if (lang === 'ar') {
      html.setAttribute('dir', 'rtl');
      html.setAttribute('lang', 'ar');

      body.setAttribute('data-layout-direction', 'rtl');

      this.loadRTLStyles();
    } else {
      html.setAttribute('dir', 'ltr');
      html.setAttribute('lang', 'en');

      body.setAttribute('data-layout-direction', 'ltr');

      this.loadLTRStyles();
    }
}


loadRTLStyles() {
  this.replaceCSS('bootstrap', 'assets/css/bootstrap-rtl.min.css');
  this.replaceCSS('app', 'assets/css/app-rtl.min.css');
}

loadLTRStyles() {
  this.replaceCSS('bootstrap', 'assets/css/bootstrap.min.css');
  this.replaceCSS('app', 'assets/css/app.min.css');
}

replaceCSS(id: string, href: string) {
  let link = document.getElementById(id) as HTMLLinkElement;

  if (link) {
    link.href = href;
  }
}
}
