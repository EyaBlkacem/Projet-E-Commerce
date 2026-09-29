import { Component, OnInit, OnDestroy, AfterViewInit, EventEmitter, Output, Inject, ViewChild, TemplateRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { EventService } from '../../core/services/event.service';
import { MessagesService } from '../../core/services/messages.service';
import { NotificationsService } from '../../core/services/notifications.service';

//Logout
import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { AuthenticationService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

// Language
import { CookieService } from 'ngx-cookie-service';
import { LanguageService } from '../../core/services/language.service';
import { TranslateService } from '@ngx-translate/core';
import { CartModel } from './topbaruser.model';
import { cartData } from './data';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

// Store — AJOUTÉ pour centraliser le dark mode
import { Store } from '@ngrx/store';
import { RootReducerState } from '../../store';
import { changeMode as changeModeAction } from '../../store/layouts/layout-action';

@Component({
    selector: 'app-topbar-user',
    templateUrl: './topbaruser.component.html',
    styleUrls: ['./topbaruser.component.scss'],
    standalone: false
})
export class TopbarUserComponent implements OnInit, OnDestroy, AfterViewInit {
  messages: any
  element: any;
  mode: string | undefined;
  @Output() mobileMenuButtonClicked = new EventEmitter();
  allnotifications: any
  flagvalue: any;
  valueset: any;
  countryName: any;
  cookieValue: any;
  userData: any;
  cartData!: CartModel[];
  total = 0;
  cart_length: any = 0;
  totalNotify: number = 0;
  newNotify: number = 0;
  readNotify: number = 0;
  isDropdownOpen = false;
  unreadMessages = 0;
  notifications: any[] = [];
  unreadNotifications: number = 0;
  private msgPollTimer: any;
  @ViewChild('removenotification') removenotification !: TemplateRef<any>;
  notifyId: any;

  private resizeObserver?: ResizeObserver;

  // ✅ AJOUTÉ — garde-fous anti-chevauchement : si le backend local répond
  // lentement (~1-1.5s vu en Network), le setInterval(20s) peut relancer un
  // appel avant que le précédent soit terminé. On saute le tick suivant
  // plutôt que d'empiler des requêtes concurrentes sur /conversations,
  // /notifications, /unread-count à chaque page.
  private loadingMessages = false;
  private loadingNotifications = false;

  constructor(
    @Inject(DOCUMENT) private document: any,
    private eventService: EventService,
    public languageService: LanguageService,
    private modalService: NgbModal,
    public _cookiesService: CookieService,
    public translate: TranslateService,
    private tokenStorageService: TokenStorageService,
    private authFackservice: AuthenticationService,
    private router: Router,
    private TokenStorageService: TokenStorageService,
    private messagesService: MessagesService,
    private notificationsService: NotificationsService,
    private store: Store<RootReducerState>
  ) { }

  ngOnDestroy(): void {
    if (this.msgPollTimer) clearInterval(this.msgPollTimer);
    this.resizeObserver?.disconnect();
  }

  ngAfterViewInit(): void {
    this.syncHeaderHeightVar();

    const el = document.getElementById('page-topbar');
    if (el && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.syncHeaderHeightVar());
      this.resizeObserver.observe(el);
    } else {
      setTimeout(() => this.syncHeaderHeightVar(), 300);
    }
  }

  private syncHeaderHeightVar(): void {
    const el = document.getElementById('page-topbar');
    if (!el) return;
    const height = el.offsetHeight;
    document.documentElement.style.setProperty('--vz-header-height', `${height}px`);
  }

  loadUnreadMessages(): void {
    const raw = localStorage.getItem('currentUser');
    if (!raw) return;
    if (this.loadingMessages) return; // ✅ AJOUTÉ — évite l'empilement d'appels
    this.loadingMessages = true;
    this.messagesService.getConversations().subscribe({
      next: (data: any[]) => {
        this.unreadMessages = data.reduce((s: number, c: any) => s + (c.unread_count || 0), 0);
        this.loadingMessages = false;
      },
      error: () => { this.loadingMessages = false; }
    });
  }

 loadNotifications(): void {
  const raw = localStorage.getItem('currentUser');
  if (!raw) return;
  if (this.loadingNotifications) return; // ✅ AJOUTÉ — évite l'empilement d'appels
  this.loadingNotifications = true;
  this.notificationsService.getNotifications().subscribe({
    next: (res: any) => {
      const rows: any[] = res?.data ?? (Array.isArray(res) ? res : []);
      this.notifications = rows.map((n: any, index: number) => ({
        // ✅ CORRIGÉ — NG0955 "duplicated keys" en console : si le backend
        // renvoie une notification sans IdNotification (ou plusieurs), l'id
        // utilisé comme clé de tracking dans le @for du template devenait
        // undefined/vide pour plusieurs lignes à la fois. On garantit
        // désormais un id unique en repli sur l'index.
        id: n.IdNotification ?? n.id ?? `notif-${index}`,
        title: n.Title || '',
        desc: n.Description || '',
        icon: 'bx-badge-check',
        time: n.Date || '',
        state: false,
        isRead: !!n.IsRead,
        link: n.Type === 'reclamation' ? '/users/reclamations' : this.notificationsService.getLink(n.Type),
      }));
      this.unreadNotifications = rows.filter((n: any) => !n.IsRead).length;
      this.loadingNotifications = false;
    },
    error: () => { this.loadingNotifications = false; }
  });
  // Bonus fiabilité : utiliser aussi la route dédiée /unread-count
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
  loadCartCount(): void {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const key = u?.id ? `tijara_cart_${u.id}` : 'tijara_cart_guest';
      const cart = JSON.parse(localStorage.getItem(key) || '[]');
      this.cart_length = cart.reduce((sum: number, i: any) => sum + (i.qty || 1), 0);
    } catch { this.cart_length = 0; }
  }

  get userInitials(): string {
    const fn = (this.userData?.firstName || '')[0] || '';
    const ln = (this.userData?.lastName  || '')[0] || '';
    return (fn + ln).toUpperCase() || 'U';
  }

  get displayName(): string {
    if (!this.userData) return 'Client';
    return [this.userData.firstName, this.userData.lastName].filter(Boolean).join(' ')
        || this.userData.username
        || this.userData.email
        || 'Client';
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
    this.loadUnreadMessages();
    this.loadNotifications();
    this.loadCartCount();
    this.msgPollTimer = setInterval(() => {
      this.loadUnreadMessages();
      this.loadNotifications();
      this.loadCartCount();
    }, 20000);
    this.element = document.documentElement;

    this.cookieValue = this._cookiesService.get('lang');
    const val = this.listLang.filter(x => x.lang === this.cookieValue);
    this.countryName = val.map(element => element.text);
    if (val.length === 0) {
      if (this.flagvalue === undefined) { this.valueset = 'assets/images/flags/us.svg'; }
    } else {
      this.flagvalue = val.map(element => element.flag);
    }
  }

  toggleMobileMenu(event: any) {
    document.querySelector('.hamburger-icon')?.classList.toggle('open')
    event.preventDefault();
    this.mobileMenuButtonClicked.emit();
  }

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
      document.getElementById('page-topbar')?.classList.add('topbar-compact');
    } else {
      (document.getElementById("back-to-top") as HTMLElement).style.display = "none";
      document.getElementById('page-topbar')?.classList.remove('topbar-shadow');
      document.getElementById('page-topbar')?.classList.remove('topbar-compact');
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

  calculatenotification() {
    this.totalNotify = 0;
    this.checkedValGet = []

    this.checkedValGet.length > 0 ? (document.getElementById("notification-actions") as HTMLElement).style.display = 'block' : (document.getElementById("notification-actions") as HTMLElement).style.display = 'none';
    if (this.totalNotify == 0) {
      document.querySelector('.empty-notification-elem')?.classList.remove('d-none')
    }
  }
}