import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';

@Injectable({ providedIn: 'root' })
export class LanguageService {

  public languages: string[] = ['fr', 'en', 'es', 'de', 'it', 'ru', 'ar'];

  constructor(public translate: TranslateService, private cookieService: CookieService) {

    let browserLang: any;
    /***
     * cookie Language Get — défaut : français
    */
    this.translate.addLangs(this.languages);
    if (this.cookieService.check('lang')) {
      browserLang = this.cookieService.get('lang');
    } else {
      // Toujours démarrer en français
      browserLang = 'fr';
    }
    translate.use(browserLang.match(/fr|en|es|de|it|ru|ar/) ? browserLang : 'fr');
  }

  /***
   * Cookie Language set
   */
  public setLanguage(lang: any) {
    this.translate.use(lang);
    this.cookieService.set('lang', lang);
  }

}
