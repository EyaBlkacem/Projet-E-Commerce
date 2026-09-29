import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, switchMap, catchError, tap , shareReplay } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import { ProductsService } from './products.service';
import { DealsService } from './deals.service';

/**
 * Utilisé par : cart, checkout, orders (ecommerce + shop), orders-ent,
 * orders-user, dashboard-ent, dashboard-admin, orders-admin, my-deliveries,
 * my-invoices-user (order total).
 *
 * NOTE FUSION : version admin reçue en parallèle — mêmes méthodes de base
 * mais implémentation autonome (sans BaseApiService). Différence de
 * comportement notée sur updateOrderStatus() : ici on garde le comportement
 * STRICT (throw sur statut inconnu) volontairement choisi à l'origine, au
 * lieu du fallback silencieux vers updateOrderActive() côté admin.
 * ?? À TRANCHER AVEC LE RESPONSABLE ADMIN : les deux comportements ne sont
 * pas équivalents, à confirmer laquelle des deux logiques est voulue avant
 * de basculer.
 *
 * updateOrderDetailStatus() utilise le mapping d'actions du responsable
 * admin (une sous-route par transition, cohérent avec updateOrderAction()
 * ci-dessous) plutôt qu'un PATCH générique.
 */
@Injectable({ providedIn: 'root' })
export class OrdersService extends BaseApiService {

  constructor(
    http: HttpClient,
    private products: ProductsService,
    private deals: DealsService
  ) { super(http); }

  get assetBaseUrl(): string {
    return this.apiUrl.replace(/\/api\/?$/, '');
  }

  getMyOrdersAsCustomer(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/orders`, {
      headers: this.getHeaders(),
      // Le backend identifie déjà le client depuis le token. Envoyer IdUser
      // est inutile et peut être refusé par les règles d'autorisation.
      params: { per_page: 5

      } as any
    }).pipe(map((res: any) => res?.data ?? res ?? []));
  }

  getOrders(params: Record<string, string | number | boolean | null | undefined> = {}): Observable<any> {
    const query = Object.entries(params).reduce((result, [key, value]) => {
      if (value !== null && value !== undefined && value !== '') result[key] = value;
      return result;
    }, {} as Record<string, string | number | boolean>);
    return this.http.get(`${this.apiUrl}/orders`, { headers: this.getHeaders(), params: query as any });
  }

  getOrdersByDeal(idDeal: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/orders`, {
      headers: this.getHeaders(),
      params: { IdDeal: idDeal, per_page: 5 } as any
    }).pipe(map((res: any) => res?.data ?? res ?? []));
  }

  getMyOrders(): Observable<any[]> {
    return this.getSellerOrders().pipe(
      map((res: any) => {
        const list = res?.data ?? res ?? [];
        return Array.isArray(list) ? list : [];
      })
    );
  }

  getSellerOrders(): Observable<any> {
    return this.http.get(`${this.apiUrl}/orders/seller`, { headers: this.getHeaders() });
  }

  getOrder(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/orders/${id}`, { headers: this.getHeaders() });
  }

  createOrder(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/orders`, data, { headers: this.getHeaders() }).pipe(
      tap((res: any) => {
        const id = res?.data?.IdOrder ?? res?.IdOrder ?? res?.id;
        if (id) this.trackOrderId(id);
      })
    );
  }

  // ?? Statut inconnu -> throw explicite (volontairement strict : on ne veut
  // PAS qu'un statut mal orthographié bascule silencieusement Active, comme
  // le ferait un fallback implicite). Utiliser updateOrderActive() directement
  // si c'est bien Active qu'on veut changer.
  updateOrderStatus(id: number, status: string): Observable<any> {
    const normalized = status.toLowerCase();
    const action = normalized === 'accepted' ? 'accept'
      : normalized === 'rejected' ? 'reject'
      : normalized === 'shipped' ? 'ship'
      : normalized === 'cancelled' ? 'cancel'
      : null;
    if (!action) throw new Error(`Transition de commande non prise en charge: ${status}`);
    return this.updateOrderAction(id, action);
  }

  updateOrderAction(id: number, action: 'accept' | 'cancel' | 'reject' | 'ship'): Observable<any> {
    return this.http.patch(`${this.apiUrl}/orders/${id}/${action}`, {}, { headers: this.getHeaders() });
  }

  // ?? Nécessite la route POST /api/orders/{order}/pay côté Laravel.
  // Codes à gérer : 200 ok, 402 solde insuffisant, 403 pas le propriétaire,
  // 409 déjà payée, 422 statut incompatible, 404 route pas encore implémentée.
  payOrder(idOrder: number, method: string = 'wallet'): Observable<any> {
    return this.http.post(`${this.apiUrl}/payments`, {
      IdUser: this.getCurrentUserId(),
      IdOrder: idOrder,
      Method: method,
    }, { headers: this.getHeaders() });
  }

  private get myOrderIdsKey(): string {
    const userId = this.getCurrentUserId();
    return userId ? `tijara_order_ids_${userId}` : 'tijara_order_ids_guest';
  }

  private trackOrderId(id: number): void {
    try {
      const raw = localStorage.getItem(this.myOrderIdsKey);
      const ids: number[] = raw ? JSON.parse(raw) : [];
      if (!ids.includes(id)) {
        ids.push(id);
        localStorage.setItem(this.myOrderIdsKey, JSON.stringify(ids));
      }
    } catch { /* ignore */ }
  }

  getMyTrackedOrders(): Observable<any[]> {
    // ?? GET /orders (index) est actuellement cassé côté backend : une
    // seconde déclaration Route::apiResource(...)->only(["index",...])
    // dans la section admin de routes/api.php écrase silencieusement la
    // version "auth:api" simple, donc TOUT utilisateur (même non-admin)
    // reçoit un 403 EnsureUserIsAdmin sur /orders. Correction côté backend
    // hors de portée ici -> on retombe sur le tracking localStorage +
    // récupération individuelle via GET /orders/{id} (route non affectée).
    return this.getOrders({ per_page: 50 }).pipe(
      switchMap((res: any) => {
        const list = res?.data ?? res ?? [];
        return of(Array.isArray(list) ? list : []);
      }),
      switchMap((orders: any[]) => this.attachTotals(orders)),
      catchError(() => this.getMyTrackedOrdersFallback())
    );
  }

  // Repli utilisé tant que GET /orders (index) renvoie 403 pour un simple
  // utilisateur : récupère les IDs suivis localement (voir trackOrderId(),
  // appelé automatiquement à chaque createOrder()) puis résout chaque
  // commande individuellement via GET /orders/{id}.
  private getMyTrackedOrdersFallback(): Observable<any[]> {
    let ids: number[] = [];
    try {
      const raw = localStorage.getItem(this.myOrderIdsKey);
      ids = raw ? JSON.parse(raw) : [];
    } catch { ids = []; }
    if (ids.length === 0) return of([]);
    return forkJoin(
      ids.map(id => this.getOrder(id).pipe(
        map((order: any) => order?.data ?? order ?? null),
        catchError(() => of(null))
      ))
    ).pipe(
      switchMap((orders: any[]) => this.attachTotals(orders.filter(o => o !== null)))
    );
  }

  private attachTotals(orders: any[]): Observable<any[]> {
    if (orders.length === 0) return of([]);
    return forkJoin(
      orders.map(o =>
        this.getOrderTotal(o.IdOrder ?? o.id).pipe(
          map((total: any) => {
            const totalRaw: any = total?.data ?? total;
            let totalValue = 0;
            if (typeof totalRaw === "number") {
              totalValue = totalRaw;
            } else if (totalRaw && typeof totalRaw === "object") {
              totalValue = totalRaw.total ?? totalRaw.Total ?? totalRaw.total_amount ?? totalRaw.TotalAmount ?? totalRaw.amount ?? 0;
            }
            return { ...o, __total: totalValue };
          }),
          catchError(() => of({ ...o, __total: 0 }))
        )
      )
    );
  }

  getOrderDetailsByOrder(idOrder: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/order-details`, {
      headers: this.getHeaders(),
      params: { IdOrder: idOrder, per_page: 5} as any
    });
  }

  // Version générique : accepte n'importe quel filtre (IdOrder, IdUser,
  // IdSeller, page, per_page...) — utile quand on ne veut pas se limiter
  // au cas fixe IdOrder + per_page:5 de getOrderDetailsByOrder().
  getOrderDetails(params: Record<string, any> = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/order-details`, { headers: this.getHeaders(), params: params as any });
  }

  getOrderDetailsResolved(idOrder: number): Observable<any[]> {
    return this.getOrderDetailsByOrder(idOrder).pipe(
      switchMap((res: any) => {
        const raw: any[] = res?.data ?? res ?? [];
        const details = Array.isArray(raw) ? raw : [];

        const missingIds = Array.from(new Set(
          details.filter(d => !d.product && d.IdProduct).map(d => d.IdProduct)
        ));
        if (missingIds.length === 0) return of(details);

        const productRequests: Record<string, Observable<any>> = {};
        missingIds.forEach(pid => {
          productRequests[pid] = this.products.getProduct(pid).pipe(
            map((p: any) => p?.data ?? p),
            catchError(() => of(null))
          );
        });

        return forkJoin(productRequests).pipe(
          map((productsById: Record<string, any>) =>
            details.map(d => d.product ? d : { ...d, product: productsById[d.IdProduct] ?? null })
          )
        );
      })
    );
  }

  getOrderTotal(idOrder: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/order-details/total/${idOrder}`, { headers: this.getHeaders() });
  }

  createOrderDetail(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/order-details`, data, { headers: this.getHeaders() });
  }

  // Alternative 100% backend, sans localStorage : passe par /order-details
  // (route sans collision, contrairement à /orders) pour retrouver les
  // IdOrder du client connecté, puis résout chaque commande via GET /orders/{id}.
  private _myOrdersDynamicCache$: Observable<any[]> | null = null;

  getMyOrdersDynamic(forceRefresh: boolean = false): Observable<any[]> {
    if (this._myOrdersDynamicCache$ && !forceRefresh) {
      return this._myOrdersDynamicCache$;
    }

    const userId = this.getCurrentUserId();
    if (!userId) return of([]);

    this._myOrdersDynamicCache$ = this.http.get(`${this.apiUrl}/order-details`, {
      headers: this.getHeaders(),
      params: { IdUser: userId, per_page: 5 } as any
    }).pipe(
      switchMap((res: any) => {
        const list = res?.data ?? res ?? [];
        const orderIds: number[] = Array.from(new Set(
          (Array.isArray(list) ? list : []).map((d: any) => d.IdOrder).filter(Boolean)
        ));
        if (orderIds.length === 0) return of([]);
        return forkJoin(
          orderIds.map(id => this.getOrder(id).pipe(
            map((o: any) => o?.data ?? o),
            catchError(() => of(null))
          ))
        ).pipe(
          map((orders: any[]) => orders.filter(o => o !== null))
        );
      }),
      shareReplay(1)
    );

    return this._myOrdersDynamicCache$;
  }

  // Variante paginée de getMyOrdersDynamic(), dédiée à OrdersComponent.
  // N'existe pas côté backend nativement (voir note sur GET /orders 403
  // pour un non-admin ci-dessus) : on récupère la liste complète des
  // IdOrder du client via /order-details (route non affectée par le bug),
  // puis on ne résout via GET /orders/{id} que les commandes de la page
  // demandée, pour éviter de recharger tout l'historique à chaque clic.
  getMyOrdersPaginated(page: number = 1, pageSize: number = 10): Observable<any> {
    const userId = this.getCurrentUserId();
    if (!userId) return of({ data: [], total: 0, current_page: 1, last_page: 1 });

    return this.http.get(`${this.apiUrl}/order-details`, {
      headers: this.getHeaders(),
      params: { IdUser: userId, per_page: 1000 } as any
    }).pipe(
      switchMap((res: any) => {
        const list = res?.data ?? res ?? [];
        const orderIds: number[] = Array.from(new Set(
          (Array.isArray(list) ? list : []).map((d: any) => d.IdOrder).filter(Boolean)
        )).sort((a, b) => b - a); // plus récentes en premier

        const total = orderIds.length;
        const lastPage = Math.max(1, Math.ceil(total / pageSize));
        const currentPage = Math.min(Math.max(1, page), lastPage);
        const pageIds = orderIds.slice((currentPage - 1) * pageSize, currentPage * pageSize);

        if (pageIds.length === 0) {
          return of({ data: [], total, current_page: currentPage, last_page: lastPage });
        }

        return forkJoin(
          pageIds.map(id => this.getOrder(id).pipe(
            map((o: any) => o?.data ?? o),
            catchError(() => of(null))
          ))
        ).pipe(
          switchMap((orders: any[]) => this.attachTotals(orders.filter(o => o !== null))),
          map((orders: any[]) => ({ data: orders, total, current_page: currentPage, last_page: lastPage }))
        );
      }),
      catchError(() => of({ data: [], total: 0, current_page: 1, last_page: 1 }))
    );
  }

  // ? Accepte un boolean (comme l'envoient les composants admin via
  // `!row.active`) et le convertit en 0/1 pour le backend.
  updateOrderActive(id: number, active: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/orders/${id}`, { Active: active ? 1 : 0 }, { headers: this.getHeaders() });
  }

  // --- Admin ---------------------------------------------

  // ? Accepte les params (page, per_page, Active, search...) et renvoie
  // la réponse Laravel paginée brute (data, total, last_page, current_page) —
  // forme attendue par OrdersAdminComponent.load().
  getAdminOrders(params: Record<string, any> = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/orders`, { headers: this.getHeaders(), params: params as any });
  }

  updateAdminOrderStatus(id: number, status: string): Observable<any> {
    return throwError(() => new Error('Le backend ne fournit pas de transition de statut de commande pour l\'administrateur.'));
  }

  // ? Mapping d'actions (repris du responsable admin) : chaque statut de
  // ligne de commande a sa propre sous-route, cohérent avec updateOrderAction()
  // ci-dessus. Repli en PATCH générique si un statut hors mapping arrive.
  private readonly orderDetailActionMap: Record<string, string> = {
    pending:      '',
    accepted:     'accept',
    rejected:     'reject',
    out_of_stock: 'out-of-stock',
    shipped:      'ship',
    delivered:    'deliver',
    cancelled:    'cancel',
    returned:     'return',
  };

  updateOrderDetailStatus(idOrderDetail: number, status: string): Observable<any> {
    const action = this.orderDetailActionMap[status];
    if (!action) {
      return this.http.patch(`${this.apiUrl}/order-details/${idOrderDetail}`, { Status: status }, { headers: this.getHeaders() });
    }
    return this.http.patch(`${this.apiUrl}/order-details/${idOrderDetail}/${action}`, {}, { headers: this.getHeaders() });
  }

  // Contourne la limite backend (per_page plafonné à 50) en enchaînant les
  // pages côté front, pour permettre une recherche/filtre/pagination réelle
  // sur l'INTÉGRALITÉ des données plutôt que sur une seule page à la fois.
  // ?? Réservé aux méthodes ci-dessous (fetch-all explicite) — ne pas
  // l'utiliser pour getAdminOrders() qui doit rester en pagination serveur.
  private fetchAllPages(fetchPage: (page: number, perPage: number) => Observable<any>, perPage: number = 50): Observable<any[]> {
    return fetchPage(1, perPage).pipe(
      switchMap((first: any) => {
        const firstData: any[] = first?.data ?? [];
        const lastPage: number = first?.last_page ?? 1;
        if (lastPage <= 1) return of(firstData);
        const rest = Array.from({ length: lastPage - 1 }, (_, i) => i + 2).map(p =>
          fetchPage(p, perPage).pipe(map((r: any) => r?.data ?? []))
        );
        return forkJoin(rest).pipe(map((pages: any[][]) => firstData.concat(...pages)));
      }),
      catchError(() => of([]))
    );
  }

  // Admin : toutes les commandes, toutes pages confondues
  getAllOrdersAdmin(extraParams: Record<string, any> = {}): Observable<any[]> {
    return this.fetchAllPages((page, per_page) => this.getOrders({ ...extraParams, page, per_page }));
  }

  // Vendeur : toutes ses commandes reçues, toutes pages confondues
  getAllSellerOrders(extraParams: Record<string, any> = {}): Observable<any[]> {
    return this.fetchAllPages((page, per_page) =>
      this.http.get(`${this.apiUrl}/orders/seller`, { headers: this.getHeaders(), params: { ...extraParams, page, per_page } as any })
    );
  }

  getStates(): Observable<any> {
    return this.http.get(`${this.apiUrl}/states`, { headers: this.getHeaders() });
  }

  // Client : toutes ses commandes, toutes pages confondues. L'index /orders
  // filtre déjà par IdUser côté backend pour un non-admin (vérifié dans
  // OrdersController::index()), donc plus besoin du contournement
  // localStorage historique de getMyTrackedOrders().
  getAllMyOrders(extraParams: Record<string, any> = {}): Observable<any[]> {
    return this.fetchAllPages((page, per_page) => this.getOrders({ ...extraParams, page, per_page }));
  }
}
