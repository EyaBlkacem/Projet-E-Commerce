import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';
import { ReclamationsService } from 'src/app/core/services/reclamations.service';
import { WishlistService } from 'src/app/core/services/wishlist.service';
import { CategoriesService } from 'src/app/core/services/categories.service';
import { OrdersService } from 'src/app/core/services/orders.service';
import { AnnoncesService } from 'src/app/core/services/annonces.service';
import { ProductsService } from 'src/app/core/services/products.service';
import { InvoicesService } from 'src/app/core/services/invoices.service';
import { MessagesService } from 'src/app/core/services/messages.service';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';

@Component({
  selector: 'app-dashboard-user',
  templateUrl: './dashboard-user.component.html',
  standalone: false,
})
export class DashboardUserComponent implements OnInit {

  userName = '';
  today    = new Date();
  userId   = 0;

  totalOrders       = 0;
  deliveredOrders   = 0;
  pendingOrders     = 0;
  reclamationsCount = 0;
  wishlistCount     = 0;
  myProductsCount   = 0;
  invoicesCount     = 0;
  unreadMessages    = 0;

  breadcrumbItems = [
    { label: 'Mon Espace' },
    { label: 'Tableau de bord', active: true },
  ];

  stats: Array<{ icon: string; label: string; value: string; color: string; link: string }> = [
    { icon: 'ri-shopping-bag-3-line',     label: 'Commandes',        value: '0', color: 'primary',   link: '/users/orders' },
    { icon: 'ri-truck-line',              label: 'Livrées',          value: '0', color: 'success',   link: '/users/my-deliveries' },
    { icon: 'ri-wallet-3-line',           label: 'Portefeuille',     value: '0', color: 'primary',   link: '/users/my-wallet' },
    { icon: 'ri-time-line',               label: 'En cours',         value: '0', color: 'warning',   link: '/users/orders' },
    { icon: 'ri-heart-3-line',            label: 'Favoris',          value: '0', color: 'danger',    link: '/users/wishlist' },
    { icon: 'ri-file-text-line',          label: 'Factures',         value: '0', color: 'info',      link: '/users/my-invoices' },
    { icon: 'ri-megaphone-line',          label: 'Mes annonces',     value: '0', color: 'secondary', link: '/users/my-products' },
    { icon: 'ri-chat-3-line',             label: 'Messages',         value: '0', color: 'dark',      link: '/users/messages' },
    { icon: 'ri-customer-service-2-line', label: 'Réclamations',     value: '0', color: 'warning',   link: '/users/reclamations' },
  ];

  recentOrders: any[] = [];

  // ✅ Reste un fallback d'icônes/couleurs si le backend renvoie moins de
  // 6 catégories ou si l'appel échoue — les vraies catégories (nom + id)
  // et leurs vrais compteurs remplacent ce contenu une fois chargés.
  categories = [
    { icon: 'ri-computer-line',   label: 'Électronique', color: 'primary',   count: '0', id: null as any },
    { icon: 'ri-t-shirt-line',    label: 'Mode',         color: 'info',      count: '0', id: null as any },
    { icon: 'ri-run-line',        label: 'Sport',        color: 'success',   count: '0', id: null as any },
    { icon: 'ri-home-2-line',     label: 'Maison',       color: 'warning',   count: '0', id: null as any },
    { icon: 'ri-leaf-line',       label: 'Bien-être',    color: 'danger',    count: '0', id: null as any },
    { icon: 'ri-restaurant-line', label: 'Alimentation', color: 'secondary', count: '0', id: null as any },
  ];

  private readonly CATEGORY_ICON_CYCLE = [
    'ri-computer-line', 'ri-t-shirt-line', 'ri-run-line',
    'ri-home-2-line', 'ri-leaf-line', 'ri-restaurant-line',
  ];
  private readonly CATEGORY_COLOR_CYCLE = [
    'primary', 'info', 'success', 'warning', 'danger', 'secondary',
  ];

  get deliveryRate(): number {
    return this.totalOrders > 0 ? Math.round((this.deliveredOrders / this.totalOrders) * 100) : 0;
  }

  constructor(
    private reclamationsService: ReclamationsService,
    private wishlistService: WishlistService,
    private categoriesService: CategoriesService,
    private ordersService: OrdersService,
    private annoncesService: AnnoncesService,
    private productsService: ProductsService,
    private invoicesService: InvoicesService,
    private messagesService: MessagesService,
    private api: TijaraApiService
  ) {}

  ngOnInit(): void {
    const stored = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.userName = stored.firstName || stored.first_name || stored.email || 'Utilisateur';
    this.userId   = Number(stored.IdUser ?? stored.id ?? 0);

    this.loadOrdersStats();
    this.loadRemainingStats();
    this.loadCategoriesWithCounts();
  }

  private loadOrdersStats(): void {
    this.ordersService.getOrderDetails({ IdUser: this.userId, per_page: 100 }).pipe(
      catchError(err => { console.error('[dashboard] getOrderDetails KO', err); return of(null); }),
      switchMap((res: any) => {
        const detailsArr = Array.isArray(res) ? res : (res as any)?.data || [];

        const groupedByOrder = new Map<number, any[]>();
        detailsArr.forEach((d: any) => {
          const orderId = d.IdOrder;
          if (!orderId) return;
          if (!groupedByOrder.has(orderId)) groupedByOrder.set(orderId, []);
          groupedByOrder.get(orderId)!.push(d);
        });

        const orderIds = Array.from(groupedByOrder.keys());
        if (orderIds.length === 0) return of({ mappedOrders: [] as any[] });

        return forkJoin(
          orderIds.map(id =>
            this.ordersService.getOrder(id).pipe(
              map((o: any) => o?.data ?? o ?? null),
              catchError(() => of(null))
            )
          )
        ).pipe(
          map((realOrders: any[]) => {
            const mappedOrders = orderIds.map((orderId, i) => {
              const lines     = groupedByOrder.get(orderId)!;
              const realOrder = realOrders[i];

              const total = lines.reduce((sum, d) => {
                const qty   = +(d.Quantity ?? 0);
                const price = +(d.UnitPrice ?? 0);
                return sum + price * qty;
              }, 0);

              const status    = realOrder?.Status ?? realOrder?.status ?? lines[0]?.Status ?? 'pending';
              const createdAt = realOrder?.DateTimeCommand ?? realOrder?.created_at ?? lines[0]?.DateTimeCommand ?? null;

              return {
                id:     `#${orderId}`,
                date:   createdAt ? new Date(createdAt).toLocaleDateString('fr-FR') : '—',
                vendor: 'Tijara',
                total,
                status: this.mapStatus(status),
              };
            });
            return { mappedOrders };
          })
        );
      })
    ).subscribe(({ mappedOrders }) => {
      this.totalOrders     = mappedOrders.length;
      this.deliveredOrders = mappedOrders.filter(o => o.status === 'Livrée').length;
      this.pendingOrders   = mappedOrders.filter(o => ['En attente', 'Confirmée', 'Expédiée'].includes(o.status)).length;
      this.recentOrders    = mappedOrders.slice(0, 5);

      this.stats[0].value = String(this.totalOrders);
      this.stats[1].value = String(this.deliveredOrders);
      this.stats[3].value = String(this.pendingOrders);
    });
  }

  private loadRemainingStats(): void {
    forkJoin({
      reclamations:  this.reclamationsService.getMyTrackedReclamationsResolved().pipe(
        catchError(err => { console.error('[dashboard] getMyTrackedReclamationsResolved KO', err); return of([] as any[]); })
      ),
      wishlistAds:   this.wishlistService.getWishlistAds().pipe(
        catchError(err => { console.error('[dashboard] getWishlistAds KO', err); return of([] as any[]); })
      ),
      wishlistDeals: this.wishlistService.getWishlistDeals().pipe(
        catchError(err => { console.error('[dashboard] getWishlistDeals KO', err); return of([] as any[]); })
      ),
      myProducts:    this.annoncesService.getMyAnnonces().pipe(
        catchError(err => { console.error('[dashboard] getMyAnnonces KO', err); return of([] as any[]); })
      ),
      invoices:      this.invoicesService.getInvoices().pipe(
        catchError(err => { console.error('[dashboard] getInvoices KO', err); return of([] as any[]); })
      ),
      wallet:        this.api.getMyWallet().pipe(
        catchError(err => { console.error('[dashboard] getMyWallet KO', err); return of(null); })
      ),
      conversations: this.messagesService.getConversations().pipe(
        catchError(err => { console.error('[dashboard] getConversations KO', err); return of([] as any[]); })
      ),
    }).subscribe(({ reclamations, wishlistAds, wishlistDeals, myProducts, invoices, wallet, conversations }) => {
      const adsArr           = Array.isArray(wishlistAds)   ? wishlistAds   : (wishlistAds as any)?.data   || [];
      const dealsArr         = Array.isArray(wishlistDeals) ? wishlistDeals : (wishlistDeals as any)?.data || [];
      const wishlist         = [...adsArr, ...dealsArr];
      const myProductsArr    = Array.isArray(myProducts)    ? myProducts    : (myProducts as any)?.data    || [];
      const invoicesArr      = Array.isArray(invoices)      ? invoices      : (invoices as any)?.data      || [];
      const conversationsArr = Array.isArray(conversations) ? conversations : (conversations as any)?.data || [];

      this.reclamationsCount = (reclamations || []).length;
      this.wishlistCount     = wishlist.length;
      this.myProductsCount   = myProductsArr.length;
      this.invoicesCount     = invoicesArr.length;
      this.unreadMessages    = conversationsArr.length;

      const walletData    = (wallet?.data ?? wallet) || null;
      const walletBalance = Number(walletData?.MoneyBudget ?? walletData?.balance ?? walletData?.Balance ?? 0);

      this.stats[2].value = String(walletBalance);
      this.stats[4].value = String(this.wishlistCount);
      this.stats[5].value = String(this.invoicesCount);
      this.stats[6].value = String(this.myProductsCount);
      this.stats[7].value = String(this.unreadMessages);
      this.stats[8].value = String(this.reclamationsCount);
    });
  }

  // ✅ CORRIGÉ : getCategories() ne renvoie que les métadonnées (id, nom) —
  // aucun compteur d'articles n'existe côté backend pour cet endpoint
  // (confirmé dans listing.component.ts : loadCategories() ne mappe que
  // id/name, jamais product_count). Le compteur réel doit être calculé
  // côté front en chargeant produits + annonces et en comptant combien
  // appartiennent à chaque catégorie — même principe que
  // getCategoryCount() dans listing.component.ts.
  private loadCategoriesWithCounts(): void {
    forkJoin({
      categoriesRaw: this.categoriesService.getCategories().pipe(
        catchError(err => { console.error('[dashboard] getCategories KO', err); return of([] as any[]); })
      ),
      products: this.productsService.getProducts({ per_page: 1000 }).pipe(
        catchError(err => { console.error('[dashboard] getProducts KO', err); return of([] as any[]); })
      ),
      annonces: this.annoncesService.getAnnonces({ per_page: 1000 }).pipe(
        catchError(err => { console.error('[dashboard] getAnnonces KO', err); return of([] as any[]); })
      ),
    }).subscribe(({ categoriesRaw, products, annonces }) => {
      const catList: any[] = Array.isArray(categoriesRaw) ? categoriesRaw : (categoriesRaw as any)?.data || [];
      const productsArr: any[] = Array.isArray(products) ? products : (products as any)?.data || [];
      const annoncesArr: any[] = Array.isArray(annonces) ? annonces : (annonces as any)?.data || [];

      // Chaque type d'item peut nommer le champ catégorie différemment
      // (voir la note QUERY_PARAM_MAP dans listing.component.ts) —
      // on tente tous les noms connus.
      const getCategId = (item: any): any =>
        item.IdCateg ?? item.idCateg ?? item.IdCateorie ?? item.id_categ ?? item.category_id ?? null;

      const allItems = [...productsArr, ...annoncesArr];

      const mappedCategories = catList.map((c: any, i: number) => {
        const id   = c.IdCateg ?? c.id;
        const name = c.TitleFr || c.TitleEn || c.TitleAr || c.name || 'Sans nom';
        const count = allItems.filter(item => String(getCategId(item)) === String(id)).length;
        return {
          icon:  this.CATEGORY_ICON_CYCLE[i % this.CATEGORY_ICON_CYCLE.length],
          color: this.CATEGORY_COLOR_CYCLE[i % this.CATEGORY_COLOR_CYCLE.length],
          label: name,
          count: String(count),
          id,
        };
      });

      if (mappedCategories.length > 0) {
        // Top 6 par nombre d'articles, cohérent avec le titre "Catégories populaires"
        this.categories = mappedCategories
          .sort((a, b) => Number(b.count) - Number(a.count))
          .slice(0, 6);
      }
    });
  }

  private mapStatus(s: string): string {
    const map: Record<string, string> = {
      pending: 'En attente', confirmed: 'Confirmée',
      shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée',
    };
    return map[s] || s || '—';
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Livrée':     'bg-success-subtle text-success',
      'Expédiée':   'bg-info-subtle text-info',
      'Confirmée':  'bg-primary-subtle text-primary',
      'En attente': 'bg-warning-subtle text-warning',
      'Annulée':    'bg-danger-subtle text-danger',
    };
    return map[status] || 'bg-secondary-subtle text-secondary';
  }
}