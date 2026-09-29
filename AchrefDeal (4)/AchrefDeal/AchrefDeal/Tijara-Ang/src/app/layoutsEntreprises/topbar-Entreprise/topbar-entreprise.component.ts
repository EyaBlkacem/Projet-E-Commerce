import { Component, OnInit, EventEmitter, Output, Inject, ViewChild, TemplateRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { EventService } from '../../core/services/event.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { BoostPremiumService } from '../../core/services/boost-premium.service';

//Logout
import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { AuthenticationService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

// Language
import { CookieService } from 'ngx-cookie-service';
import { LanguageService } from '../../core/services/language.service';
import { TranslateService } from '@ngx-translate/core';
import { CartModel } from './topbar-entreprise.model';
import { cartData } from './data';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

// Store — AJOUTÉ pour centraliser le dark mode
import { Store } from '@ngrx/store';
import { RootReducerState } from '../../store';
import { changeMode as changeModeAction } from '../../store/layouts/layout-action';

@Component({
    selector: 'app-topbar-entreprise',
    templateUrl: './topbar-entreprise.component.html',
    styleUrls: ['./topbar-entreprise.component.scss'],
    standalone: false
})
export class TopbarEntrepriseComponent implements OnInit {
  messages: any
  element: any;
  mode: string | undefined;
  @Output() mobileMenuButtonClicked = new EventEmitter();
  allnotifications: any
  notifications: any[] = [];
  unreadNotifications: number = 0;
  flagvalue: any;
  valueset: any;
  countryName: any;
  cookieValue: any;
  userData: any;
  isPremium: boolean = false;
  cartData!: CartModel[];
  total = 0;
  cart_length: any = 0;
  totalNotify: number = 0;
  newNotify: number = 0;
  readNotify: number = 0;
  isDropdownOpen = false;
  @ViewChild('removenotification') removenotification !: TemplateRef<any>;
  notifyId: any;

  constructor(@Inject(DOCUMENT) private document: any, private eventService: EventService, public languageService: LanguageService, private modalService: NgbModal,
    public _cookiesService: CookieService, public translate: TranslateService, private tokenStorageService: TokenStorageService, private authFackservice: AuthenticationService,
    private router: Router, private TokenStorageService: TokenStorageService,
    private notificationsService: NotificationsService,
    private boostPremiumService: BoostPremiumService,
    private store: Store<RootReducerState>) { }

  loadPremiumStatus(): void {
    this.boostPremiumService.getPremiumStatus().subscribe({
      next: (status: any) => { this.isPremium = !!status?.isPremium; },
      error: () => { this.isPremium = false; }
    });
  }

loadNotifications(): void {
  const raw = localStorage.getItem('currentUser');
  if (!raw) return;
  this.notificationsService.getNotifications().subscribe({
    next: (res: any) => {
      const rows: any[] = res?.data ?? (Array.isArray(res) ? res : []);
      this.notifications = rows.map((n: any) => ({
        id: n.IdNotification,
        title: n.Title || '',
        desc: n.Description || '',
        icon: 'bx-badge-check',
        time: n.Date || '',
        state: false,
        isRead: !!n.IsRead,
        link: n.Type === 'reclamation' ? '/ent/reclamations' : this.notificationsService.getLink(n.Type),
      }));
      this.unreadNotifications = rows.filter((n: any) => !n.IsRead).length;
    },
    error: () => {}
  });
  this.notificationsService.getUnreadNotificationsCount().subscribe({
    next: (res: any) => { this.unreadNotifications = res?.unread ?? this.unreadNotifications; },
    error: () => {}
  });
}
onNotificationClick(n: any): void {
  if (!n.isRead) {
    this.notificationsService.markNotificationRead(n.id).subscribe({
      next: () => {
        n.isRead = true;
        this.unreadNotifications = Math.max(0, this.unreadNotifications - 1);
      }
    });
  }
  if (n.link) {
    this.router.navigate([n.link]);
  }
}
  markAllRead(): void {
    this.notificationsService.markAllNotificationsRead().subscribe({
      next: () => {
        this.notifications.forEach((n: any) => n.is_read = true);
        this.unreadNotifications = 0;
      }
    });
  }



  ngOnInit(): void {
    this.userData = this.TokenStorageService.getUser();
    this.element = document.documentElement;
    this.loadNotifications();
    this.loadPremiumStatus();

    // Cookies wise Language set
    this.cookieValue = this._cookiesService.get('lang');
    const val = this.listLang.filter(x => x.lang === this.cookieValue);
    this.countryName = val.map(element => element.text);
    if (val.length === 0) {
      if (this.flagvalue === undefined) { this.valueset = 'assets/images/flags/us.svg'; }
    } else {
      this.flagvalue = val.map(element => element.flag);
    }
    this.cartData = cartData;
    this.cart_length = this.cartData.length;
    this.cartData.forEach((item) => {
      var item_price = item.quantity * item.price
      this.total += item_price
    });
  }

  /**
   * Toggle the menu bar when having mobile screen
   */
  toggleMobileMenu(event: any) {
    document.querySelector('.hamburger-icon')?.classList.toggle('open')
    event.preventDefault();
    this.mobileMenuButtonClicked.emit();
  }

  /**
   * Fullscreen method
   */
  fullscreen() {
    document.body.classList.toggle('fullscreen-enable');
    if (
      !document.fullscreenElement && !this.element.mozFullScreenElement &&
      !this.element.webkitFullscreenElement) {
      if (this.element.requestFullscreen) {
        this.element.requestFullscreen();
      } else if (this.element.mozRequestFullScreen) {
        this.element.mozRequestFullScreen();
      } else if (this.element.webkitRequestFullscreen) {
        this.element.webkitRequestFullscreen();
      } else if (this.element.msRequestFullscreen) {
        this.element.msRequestFullscreen();
      }
    } else {
      if (this.document.exitFullscreen) {
        this.document.exitFullscreen();
      } else if (this.document.mozCancelFullScreen) {
        this.document.mozCancelFullScreen();
      } else if (this.document.webkitExitFullscreen) {
        this.document.webkitExitFullscreen();
      } else if (this.document.msExitFullscreen) {
        this.document.msExitFullscreen();
      }
    }
  }

  openModal(content: any) {
    this.modalService.open(content, { centered: true });
  }

  /**
  * Topbar Light-Dark Mode Change
  * CORRIGÉ : dispatche vers le store NgRx partagé au lieu de
  * modifier le DOM directement.
  */
  changeMode(mode: string) {
    this.mode = mode;
    this.eventService.broadcast('changeMode', mode);
    this.store.dispatch(changeModeAction({ mode }));
  }

  /***
   * Language Listing   MSK 
   */
  listLang = [
    { text: 'English', flag: 'assets/images/flags/dk.svg', lang: 'en' },
    { text: 'français', flag: 'assets/images/flags/french.svg', lang: 'fr' },
    { text: 'Arabic', flag: 'assets/images/flags/tn.svg', lang: 'ar' },
  ];

  setLanguage(text: string, lang: string, flag: string) {
    this.countryName = text;
    this.flagvalue = flag;
    this.cookieValue = lang;
    this.languageService.setLanguage(lang);
  }

  logout() {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (u?.id) localStorage.removeItem(`tijara_cart_${u.id}`);
    } catch {}
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('toast');
    localStorage.removeItem('tijara_cart');
    sessionStorage.clear();
    window.location.href = '/auth/login';
  }

  windowScroll() {
    if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
      (document.getElementById("back-to-top") as HTMLElement).style.display = "block";
      document.getElementById('page-topbar')?.classList.add('topbar-shadow');
    } else {
      (document.getElementById("back-to-top") as HTMLElement).style.display = "none";
      document.getElementById('page-topbar')?.classList.remove('topbar-shadow');
    }
  }

  deleteItem(event: any, id: any) {
    var price = event.target.closest('.dropdown-item').querySelector('.item_price').innerHTML;
    var Total_price = this.total - price;
    this.total = Total_price;
    this.cart_length = this.cart_length - 1;
    this.total > 1 ? (document.getElementById("empty-cart") as HTMLElement).style.display = "none" : (document.getElementById("empty-cart") as HTMLElement).style.display = "block";
    document.getElementById('item_' + id)?.remove();
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    if (this.isDropdownOpen) {
      this.isDropdownOpen = false;
    } else {
      this.isDropdownOpen = true;
    }
  }

  Search() {
    var searchOptions = document.getElementById("search-close-options") as HTMLAreaElement;
    var dropdown = document.getElementById("search-dropdown") as HTMLAreaElement;
    var input: any, filter: any, ul: any, li: any, a: any | undefined, i: any, txtValue: any;
    input = document.getElementById("search-options") as HTMLAreaElement;
    filter = input.value.toUpperCase();
    var inputLength = filter.length;

    if (inputLength > 0) {
      dropdown.classList.add("show");
      searchOptions.classList.remove("d-none");
      var inputVal = input.value.toUpperCase();
      var notifyItem = document.getElementsByClassName("notify-item");

      Array.from(notifyItem).forEach(function (element: any) {
        var notifiTxt = ''
        if (element.querySelector("h6")) {
          var spantext = element.getElementsByTagName("span")[0].innerText.toLowerCase()
          var name = element.querySelector("h6").innerText.toLowerCase()
          if (name.includes(inputVal)) {
            notifiTxt = name
          } else {
            notifiTxt = spantext
          }
        } else if (element.getElementsByTagName("span")) {
          notifiTxt = element.getElementsByTagName("span")[0].innerText.toLowerCase()
        }
        if (notifiTxt)
          element.style.display = notifiTxt.includes(inputVal) ? "block" : "none";

      });
    } else {
      dropdown.classList.remove("show");
      searchOptions.classList.add("d-none");
    }
  }

  closeBtn() {
    var searchOptions = document.getElementById("search-close-options") as HTMLAreaElement;
    var dropdown = document.getElementById("search-dropdown") as HTMLAreaElement;
    var searchInputReponsive = document.getElementById("search-options") as HTMLInputElement;
    dropdown.classList.remove("show");
    searchOptions.classList.add("d-none");
    searchInputReponsive.value = "";
  }

  checkedValGet: any[] = [];
  onCheckboxChange(event: any, id: any) {
    this.notifyId = id
    var result;
    if (id == '1') {
      var checkedVal: any[] = [];
      for (var i = 0; i < this.allnotifications.length; i++) {
        if (this.allnotifications[i].state == true) {
          result = this.allnotifications[i].id;
          checkedVal.push(result);
        }
      }
      this.checkedValGet = checkedVal;
    } else {
      var checkedVal: any[] = [];
      for (var i = 0; i < this.messages.length; i++) {
        if (this.messages[i].state == true) {
          result = this.messages[i].id;
          checkedVal.push(result);
        }
      }
      this.checkedValGet = checkedVal;
    }
    checkedVal.length > 0 ? (document.getElementById("notification-actions") as HTMLElement).style.display = 'block' : (document.getElementById("notification-actions") as HTMLElement).style.display = 'none';
  }

  notificationDelete() {
    if (this.notifyId == '1') {
      for (var i = 0; i < this.checkedValGet.length; i++) {
        for (var j = 0; j < this.allnotifications.length; j++) {
          if (this.allnotifications[j].id == this.checkedValGet[i]) {
            this.allnotifications.splice(j, 1)
          }
        }
      }
    } else {
      for (var i = 0; i < this.checkedValGet.length; i++) {
        for (var j = 0; j < this.messages.length; j++) {
          if (this.messages[j].id == this.checkedValGet[i]) {
            this.messages.splice(j, 1)
          }
        }
      }
    }
    this.calculatenotification()
    this.modalService.dismissAll();
  }

  get displayName(): string {
    if (!this.userData) return 'Vendeur';
    return this.userData.shopName ||
      [this.userData.firstName, this.userData.lastName].filter(Boolean).join(' ') ||
      'Vendeur';
  }

  calculatenotification() {
    this.totalNotify = 0;
    this.checkedValGet = []

    this.checkedValGet.length > 0 ? (document.getElementById("notification-actions") as HTMLElement).style.display = 'block' : (document.getElementById("notification-actions") as HTMLElement).style.display = 'none';
    if (this.totalNotify == 0) {
      document.querySelector('.empty-notification-elem')?.classList.remove('d-none')
    }
  }
}

