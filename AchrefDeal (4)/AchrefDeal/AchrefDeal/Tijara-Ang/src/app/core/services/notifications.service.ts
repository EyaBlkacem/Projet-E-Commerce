import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import { EchoService } from './echo.service';

export interface AppNotification {
  id:         number;
  type:       string;
  title:      string;
  message:    string;
  link:       string | null;
  is_read:    boolean;
  created_at: string;
  icon:       string;
  // Champs compatibles avec le HTML existant de la topbar
  desc:       string;
  time:       string;
  state:      boolean;
  img?:       string;
}

/**
 * Adapt? 100% au vrai backend (NotificationsController + NotificationSent
 * via Reverb) ? remplace :
 * 1) loadNotifications() qui attendait { notifications: [], unread_count: 0 }
 *    ? la vraie r?ponse est la pagination Laravel { data: [...], total, ... }
 *    sur GET /notifications, et le compteur non-lu vient d'une route ? part
 *    (GET /notifications/unread-count ? { unread: N }).
 * 2) mapNotif() qui lisait des champs en minuscules (idNotification, title,
 *    description, isRead...) ? le backend renvoie du PascalCase
 *    (IdNotification, Title, Description, Type, Date, IsRead).
 * 3) listenSignalR() (ChatService/SignalR, techno .NET d?sactiv?e) ? ?coute
 *    d?sormais le canal priv? Reverb 'user.{id}' via EchoService, ?v?nement
 *    'notification.sent' (NotificationSent::broadcastAs()).
 *
 * Utilis? par : public-layout, topbaruser, topbar-entreprise, topbar admin.
 *
 * NOTE FUSION : cette version conserve TOUTES les m?thodes de la version
 * "admin" (NotificationService) + ajoute les m?thodes Observable expos?es
 * s?par?ment (getNotifications, getUnreadNotificationsCount,
 * markNotificationRead, markAllNotificationsRead) utiles si un composant
 * veut g?rer lui-m?me l'abonnement plut?t que de passer par les BehaviorSubject.
 *
 * ? CORRIG? (14/09/2026) ? getLink() renvoyait syst?matiquement des routes
 * '/admin/...' quel que soit l'appelant (public-layout, topbaruser,
 * topbar-entreprise). Pour un vendeur, cliquer sur une notif "Boost activ?"
 * ou "Nouveau message" naviguait donc vers une route '/admin/...' inexistante
 * dans le routeur vendeur, qui retombait sur la route wildcard et redirigeait
 * vers /ent/dashboard. getLink() accepte d?sormais un pr?fixe de base
 * ('/admin' par d?faut, pour ne rien casser c?t? admin existant) ? chaque
 * appelant doit passer son propre pr?fixe ('/ent', '/users', ...).
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService extends BaseApiService implements OnDestroy {

  notifications$ = new BehaviorSubject<AppNotification[]>([]);
  unreadCount$   = new BehaviorSubject<number>(0);
  newPush$       = new Subject<AppNotification>();

  private subs         = new Subscription();
  private initialized  = false;

  constructor(http: HttpClient, private echoService: EchoService) { super(http); }

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.loadNotifications();
    this.loadUnreadCount();
    this.listenRealtime();
  }

  // -- Charger depuis l'API ----------------------------------
  // GET /notifications renvoie la pagination Laravel standard :
  // { data: [...], total, current_page, last_page, ... }
  loadNotifications(): void {
    this.http.get<any>(
      `${this.apiUrl}/notifications`,
      { headers: this.getHeaders() }
    ).pipe(catchError(() => of({ data: [] })))
    .subscribe(res => {
      const rows = res?.data || res || [];
      this.notifications$.next(rows.map((n: any) => this.mapNotif(n)));
    });
  }

  // Le compteur non-lu vient d'une route d?di?e, pas du m?me appel que
  // la liste ? voir NotificationsController::unreadCount().
  loadUnreadCount(): void {
    this.http.get<{ unread: number }>(
      `${this.apiUrl}/notifications/unread-count`,
      { headers: this.getHeaders() }
    ).pipe(catchError(() => of({ unread: 0 })))
    .subscribe(res => this.unreadCount$.next(res?.unread ?? 0));
  }

  // Acc?s direct en Observable (utile pour un composant qui pr?f?re
  // appeler lui-m?me plut?t que de s'abonner ? loadNotifications()/notifications$).
  getNotifications(): Observable<any> {
    return this.http.get(`${this.apiUrl}/notifications`, { headers: this.getHeaders() });
  }

  getUnreadNotificationsCount(): Observable<any> {
    return this.http.get(`${this.apiUrl}/notifications/unread-count`, { headers: this.getHeaders() });
  }

  // -- ?couter en temps r?el (Reverb / Laravel Echo) ---------
  private listenRealtime(): void {
    this.echoService.connect();

    const channel = this.echoService.privateUserChannel();
    if (!channel) return;

    // 'notification.sent' correspond ? NotificationSent::broadcastAs().
    // broadcastWith() renvoie d?j? exactement les m?mes champs
    // (IdNotification, Title, Description, Type, Date, IsRead) que
    // GET /notifications ? mapNotif() g?re donc les deux sources
    // identiquement, pas de mapping s?par? n?cessaire.
    channel.listen('.notification.sent', (payload: any) => {
      this.addNotification(this.mapNotif(payload));
    });
  }

  private addNotification(n: AppNotification): void {
    const current = this.notifications$.value;
    this.notifications$.next([n, ...current]);
    this.unreadCount$.next(this.unreadCount$.value + 1);
    this.newPush$.next(n);
  }

  // -- Marquer comme lu -------------------------------------
  markRead(id: number): void {
    this.markNotificationRead(id).pipe(catchError(() => of(null))).subscribe(() => {
      const updated = this.notifications$.value.map(n =>
        n.id === id ? { ...n, is_read: true, state: false } : n
      );
      this.notifications$.next(updated);
      this.unreadCount$.next(Math.max(0, this.unreadCount$.value - 1));
    });
  }

  markNotificationRead(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/notifications/${id}/read`, {}, { headers: this.getHeaders() });
  }

  // -- Marquer tout comme lu ---------------------------------
  markAllRead(): void {
    this.markAllNotificationsRead().pipe(catchError(() => of(null))).subscribe(() => {
      const updated = this.notifications$.value.map(n =>
        ({ ...n, is_read: true, state: false })
      );
      this.notifications$.next(updated);
      this.unreadCount$.next(0);
    });
  }

  markAllNotificationsRead(): Observable<any> {
    return this.http.patch(`${this.apiUrl}/notifications/read-all`, {}, { headers: this.getHeaders() });
  }

  // -- Mapper backend (PascalCase) ? interface frontend ------
  // base : pr?fixe de routage ('/admin' par d?faut pour compat descendante
  // avec le flux BehaviorSubject existant, ? passer explicitement si ce
  // flux est un jour utilis? hors contexte admin).
  private mapNotif(n: any, base: string = '/admin'): AppNotification {
    return {
      id:         n.IdNotification ?? n.id ?? Date.now(),
      type:       n.Type ?? 'info',
      title:      n.Title ?? '',
      message:    n.Description ?? '',
      desc:       n.Description ?? '',
      time:       this.formatTime(n.Date),
      link:       this.getLink(n.Type, base),
      is_read:    !!n.IsRead,
      state:      !n.IsRead,
      created_at: n.Date ?? '',
      icon:       this.getIcon(n.Type),
    };
  }

  // base : pr?fixe de l'interface courante ('/admin', '/ent', '/users'...).
  // Chaque appelant doit passer le sien ? par d?faut '/admin' pour ne pas
  // casser les usages existants qui n'ont pas encore ?t? mis ? jour.
  getLink(type: string, base: string = '/admin'): string | null {
    const suffixes: Record<string, string> = {
      'order_received':  '/orders',
      'order_accepted':  '/orders',
      'order_rejected':  '/orders',
      'order_shipped':   '/deliveries',
      'order_cancelled': '/orders',
      'delivery_update': '/deliveries',
      'report_received': '/reclamations',
      'report_resolved': '/reclamations',
      'verification_approved': '/verification',
      'verification_rejected': '/verification',
      'boost_activated': base === '/ent' ? '/boost-packs' : '/boosts',
      'new_product':     '/products',
      'new_ad':           '/annonces',
      'new_deal':         '/deals',
      'payment_completed': '/payments',
      'payment_refunded':  '/payments',
      'invoice_created':   '/invoices',
      'invoice_paid':      '/invoices',
      'invoice_cancelled': '/invoices',
      'message':          '/messages',
    };
    const suffix = suffixes[type];
    return suffix ? `${base}${suffix}` : null;
  }

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      'order_received':  'ri-shopping-bag-3-line',
      'order_accepted':  'ri-checkbox-circle-line',
      'order_rejected':  'ri-close-circle-line',
      'order_shipped':   'ri-truck-line',
      'order_cancelled': 'ri-close-circle-line',
      'delivery_update': 'ri-truck-line',
      'report_received': 'ri-customer-service-2-line',
      'report_resolved': 'ri-checkbox-circle-line',
      'verification_approved': 'ri-shield-check-line',
      'verification_rejected': 'ri-shield-cross-line',
      'boost_activated': 'ri-rocket-2-line',
      'new_product':     'ri-box-3-line',
      'new_ad':           'ri-megaphone-line',
      'new_deal':         'ri-price-tag-3-line',
      'message':          'ri-message-3-line',
      'payment_completed': 'ri-bank-card-line',
      'payment_refunded':  'ri-refund-2-line',
      'invoice_created':   'ri-file-list-3-line',
      'invoice_paid':      'ri-checkbox-circle-line',
      'invoice_cancelled': 'ri-close-circle-line',
    };
    return icons[type] || 'ri-notification-3-line';
  }

  getColor(type: string): string {
    const colors: Record<string, string> = {
      'order_received':  'primary',
      'order_accepted':  'success',
      'order_rejected':  'danger',
      'order_shipped':   'info',
      'order_cancelled': 'danger',
      'delivery_update': 'info',
      'report_received': 'danger',
      'report_resolved': 'success',
      'verification_approved': 'success',
      'verification_rejected': 'danger',
      'boost_activated': 'warning',
      'new_product':     'success',
      'new_ad':           'success',
      'new_deal':         'warning',
      'message':          'warning',
      'payment_completed': 'success',
      'payment_refunded':  'warning',
      'invoice_created':   'primary',
      'invoice_paid':      'success',
      'invoice_cancelled': 'danger',
    };
    return colors[type] || 'secondary';
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    const d    = new Date(dateStr);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)    return '? l\'instant';
    if (diff < 3600)  return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.initialized = false;
  }
}