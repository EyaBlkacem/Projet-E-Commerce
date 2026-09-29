import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ProductsService } from 'src/app/core/services/products.service';
import { OrdersService } from 'src/app/core/services/orders.service';
import { DeliveriesService } from 'src/app/core/services/deliveries.service';
import { DealsService } from 'src/app/core/services/deals.service';
import { InvoicesService } from 'src/app/core/services/invoices.service';

interface MonthData { month: string; revenue: number; orders: number; }
interface TopProduct { id: number; title: string; price: number; sold: number; image?: string; }
interface StatusBucket { key: string; label: string; color: string; icon: string; count: number; pct: number; }

// Enum réel confirmé côté backend (DeliveriesController::updateStatus(),
// audité pour deliveries-ent) — Orders n'a AUCUN champ de statut, le suivi
// réel d'une commande passe par Deliveries.Status.
type DeliveryStatus = 'Pending' | 'In Transit' | 'Delivered' | 'Failed' | 'Returned';

interface OrderBundle {
  order: any;              // brut depuis getSellerOrders() : IdOrder, IdUser, IdDeal, IdState, DateTimeCommand, Active
  details: any[];          // depuis getOrderDetailsResolved() : IdProduct, Quantity, UnitPrice, Discount, product{...}, + FirstName/LastName/Email/Address/ZipCode/Telephone du client
  deliveries: any[];       // depuis getDeliveriesByOrder() : IdDelivery, Status, CreatedAt...
}

@Component({
  selector: 'app-dashboard-ent',
  templateUrl: './dashboard-ent.component.html',
  styleUrls: ['./dashboard-ent.component.scss'],
  standalone: false,
})
export class DashboardEntComponent implements OnInit {

  breadCrumbItems = [
    { label: 'Vendeur' },
    { label: 'Tableau de bord', active: true },
  ];

  // ─── Identité vendeur ─────────────────────────────────────────
  vendorName = '';
  shopName   = '';
  today      = new Date();

  // ─── KPI principaux (8 cartes cliquables) ─────────────────────
  kpis: Array<{ key: string; label: string; value: string; raw: number; icon: string; color: string; link: string; trend?: number }> = [
    { key: 'orders',     label: 'Commandes',         value: '0',      raw: 0, icon: 'ri-shopping-bag-3-line',     color: 'primary',   link: '/ent/orders'     },
    { key: 'delivered',  label: 'Livrées',           value: '0',      raw: 0, icon: 'ri-check-double-line',       color: 'success',   link: '/ent/deliveries' },
    { key: 'pending',    label: 'En cours',          value: '0',      raw: 0, icon: 'ri-time-line',               color: 'warning',   link: '/ent/orders'     },
    { key: 'revenue',    label: 'Revenus (TND)',     value: '0',      raw: 0, icon: 'ri-money-dollar-circle-line',color: 'info',      link: '/ent/invoices'   },
    { key: 'paid',       label: 'Encaissé (TND)',    value: '0',      raw: 0, icon: 'ri-bank-card-line',          color: 'success',   link: '/ent/invoices'   },
    { key: 'products',   label: 'Annonces actives',  value: '0',      raw: 0, icon: 'ri-store-2-line',            color: 'secondary', link: '/ent/products'   },
    { key: 'invoices',   label: 'Factures émises',   value: '0',      raw: 0, icon: 'ri-file-text-line',          color: 'dark',      link: '/ent/invoices'   },
    { key: 'reclam',     label: 'Réclamations',      value: '0',      raw: 0, icon: 'ri-customer-service-2-line', color: 'danger',    link: '/ent/reclamations' },
  ];

  // ─── Données analytiques ────────────────────────────────────
  sales: MonthData[] = [];
  topProducts: TopProduct[] = [];
  statusDist: StatusBucket[] = [];
  recentOrders: any[] = [];

  chartMode: 'revenue' | 'orders' = 'revenue';

  // ─── Insights ─────────────────────────────────────────────────
  conversionRate = 0;
  avgBasket      = 0;
  bestMonth      = '—';
  uniqueClients  = 0;
  monthRevenue   = 0;
  monthOrders    = 0;

  loading = true;
  error: string | null = null;

  // ⚠️ Réclamations désactivées côté dashboard tant que le backend n'a
  // pas de route scopée vendeur pour /reports (voir ngOnInit). Utilisé
  // par le template pour afficher un badge "bientôt disponible" au lieu
  // d'un simple "0" trompeur sur la carte KPI reclam.
  reclamationsUnavailable = true;

  private readonly deliveryStatusLabels: Record<DeliveryStatus, string> = {
    'Pending':     'En attente',
    'In Transit':  'En transit',
    'Delivered':   'Livrée',
    'Failed':      'Échouée',
    'Returned':    'Retournée',
  };

  constructor(private productsService: ProductsService, private ordersService: OrdersService, private deliveriesService: DeliveriesService, private dealsService: DealsService, private invoicesService: InvoicesService) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.vendorName = [user.firstName, user.lastName].filter(Boolean).join(' ')
                   || user.first_name || user.email || 'Vendeur';
    this.shopName   = user.shopName || user.shop_name || this.vendorName;

    // ✅ CORRIGÉ (19/08/2026) — l'ancienne version appelait :
    //  - getOrders() : 10 commandes de TOUTE la plateforme (bug de pagination)
    //  - getInvoices() : factures où le vendeur est CLIENT, pas fournisseur
    //    (/customers/{id}/invoices), donc quasi toujours vide/faux pour un
    //    dashboard vendeur
    //  - getSalesByMonth()/getTopProducts()/getReportOverview() : routes qui
    //    n'existent PAS dans routes/api.php (confirmé par recherche), donc
    //    toujours en échec silencieux (catchError -> [])
    // On reconstruit tout à partir de données réellement scopées au vendeur.
    //
    // ✅ CORRIGÉ (22/08/2026) — getMyOrders() appelait en interne
    // getOrdersByDeal() -> GET /orders (index), collisionné côté backend
    // avec la version admin-only de la route (routes/api.php Section 4,
    // qui écrase la Section 2 pour un même URI) → 403 pour un compte
    // entreprise. Remplacé par getSellerOrders() (GET /orders/seller,
    // route dédiée non affectée).
    //
    // ✅ CORRIGÉ (14/09/2026) — le filtre client
    // `orders.filter(o => myDealIds.includes(o.IdDeal))` excluait à tort
    // TOUTES les commandes issues d'un achat produit direct hors deal
    // (boutique-detail.component.ts), car IdDeal y est légitimement null
    // et null n'est jamais inclus dans myDealIds (voir
    // tijara-orders-invoice-delivery.md). getSellerOrders() étant une
    // route dédiée déjà scopée au vendeur connecté, ce filtre était non
    // seulement inutile mais destructeur — il a été retiré. myDealIds
    // est conservé (recalculé) au cas où on en aurait besoin plus tard,
    // mais n'est plus utilisé pour filtrer les commandes.
    forkJoin({
      myDealIds: this.dealsService.getMyDeals().pipe(
        map((res: any) => {
          const list: any[] = res?.data ?? res ?? [];
          return (Array.isArray(list) ? list : []).map(d => d.idDeal ?? d.IdDeal ?? d.id).filter(Boolean);
        }),
        catchError(() => of([] as number[]))
      ),
      products: this.productsService.getMyProducts().pipe(catchError(() => of([] as any[]))),
      invoices: this.invoicesService.getMyVendorInvoices().pipe(catchError(() => of([] as any[]))),
      reclamationsRaw: of([] as any[]),
    }).pipe(
      switchMap(({ myDealIds, products, invoices, reclamationsRaw }) =>
        this.ordersService.getSellerOrders().pipe(
          map((res: any) => {
            const list: any[] = res?.data ?? res ?? [];
            // Pas de filtre sur IdDeal ici : getSellerOrders() est déjà
            // scopée au vendeur connecté côté backend, et beaucoup de
            // commandes légitimes (achat produit hors deal) ont
            // IdDeal === null.
            return Array.isArray(list) ? list : [];
          }),
          catchError(() => of([] as any[])),
          map((orders: any[]) => ({ orders, products, invoices, reclamationsRaw }))
        )
      ),
      switchMap(({ orders, products, invoices, reclamationsRaw }) => {
        // Best effort : GET /reports n'est pas scopé par vendeur côté
        // backend. On filtre nous-mêmes sur les réclamations qui visent
        // l'un des produits du vendeur, via IdProduct — inopérant tant
        // que reclamationsRaw est vide (voir note ci-dessus), mais on
        // garde la logique prête pour le jour où le backend expose une
        // vraie route.
        const myProductIds = new Set(
          (products || []).map((p: any) => +(p.IdProduct ?? 0)).filter(Boolean)
        );
        const reclamations = (reclamationsRaw || []).filter((r: any) =>
          myProductIds.has(+(r.IdProduct ?? 0))
        );

        if (!orders || orders.length === 0) {
          return of({ bundles: [] as OrderBundle[], products, invoices, reclamations });
        }

        const bundleRequests = orders.map((o: any) =>
          forkJoin({
            details: this.ordersService.getOrderDetailsResolved(o.IdOrder).pipe(catchError(() => of([]))),
            deliveries: this.deliveriesService.getDeliveriesByOrder(o.IdOrder).pipe(catchError(() => of([]))),
          }).pipe(map(({ details, deliveries }) => ({ order: o, details, deliveries } as OrderBundle)))
        );

        return forkJoin(bundleRequests).pipe(
          map((bundles: any) => ({ bundles, products, invoices, reclamations }))
        );
      }),
      catchError(() => {
        this.error = 'Impossible de charger le tableau de bord.';
        return of({ bundles: [] as OrderBundle[], products: [] as any[], invoices: [] as any[], reclamations: [] as any[] });
      })
    ).subscribe(({ bundles, products, invoices, reclamations }) => {
      this.computeAll(bundles, products, invoices, reclamations);
      this.loading = false;
    });
  }

  // ─── Calculs ──────────────────────────────────────────────────
  private computeAll(bundles: OrderBundle[], products: any[], invoices: any[], reclamations: any[]): void {
    const totalOrders = bundles.length;

    // Statut réel = dernière livraison connue de la commande (Deliveries.Status).
    // Une commande sans livraison créée est considérée "Pending".
    const statusPerOrder: DeliveryStatus[] = bundles.map(b => {
      const dels = b.deliveries || [];
      if (dels.length === 0) return 'Pending';
      const sorted = [...dels].sort((a: any, c: any) =>
        new Date(c.CreatedAt || 0).getTime() - new Date(a.CreatedAt || 0).getTime()
      );
      return (sorted[0].Status as DeliveryStatus) || 'Pending';
    });

    const delivered = statusPerOrder.filter(s => s === 'Delivered').length;
    const pending   = statusPerOrder.filter(s => s === 'Pending' || s === 'In Transit').length;

    // Invoices.Total / Invoices.Status confirmés PascalCase
    // (InvoicesController::pay()/cancel()/store()).
    const invoiceByOrder = new Map<number, any>(
      (invoices || []).map((i: any) => [+(i.IdOrder ?? 0), i])
    );
    const revenue = (invoices || []).reduce((s, i) => s + (+(i.Total ?? 0)), 0);
    const paid = (invoices || [])
      .filter(i => i.Status === 'Paid')
      .reduce((s, i) => s + (+(i.Total ?? 0)), 0);

    // Products.Active confirmé (pas is_active/active).
    const activeProducts = (products || []).filter(p => !!p.Active).length;

    this.reclamationsUnavailable = reclamations.length === 0;

    const vals: Record<string, number> = {
      orders: totalOrders, delivered, pending,
      revenue, paid,
      products: activeProducts,
      invoices: (invoices || []).length,
      reclam: reclamations.length,
    };

    this.kpis.forEach(k => {
      k.raw   = vals[k.key] ?? 0;
      k.value = ['revenue', 'paid'].includes(k.key)
                  ? this.formatNumber(k.raw)
                  : String(k.raw);
    });

    // ─── Commandes récentes ───────────────────────────────────
    this.recentOrders = [...bundles]
      .sort((a, b) => new Date(b.order.DateTimeCommand || 0).getTime() - new Date(a.order.DateTimeCommand || 0).getTime())
      .slice(0, 5)
      .map((b, idx) => {
        const first = b.details?.[0];
        const client = first
          ? ([first.FirstName, first.LastName].filter(Boolean).join(' ') || first.Email || '—')
          : '—';
        const inv = invoiceByOrder.get(+(b.order.IdOrder ?? 0));
        const total = inv
          ? +(inv.Total ?? 0)
          : (b.details || []).reduce((s: number, d: any) =>
              s + (+(d.UnitPrice ?? d.product?.PriceProduct ?? 0) * +(d.Quantity ?? 1)), 0);
        const orderIndex = bundles.indexOf(b);
        const status = statusPerOrder[orderIndex] ?? 'Pending';
        return {
          id: `#${b.order.IdOrder}`,
          client,
          total,
          status: this.deliveryStatusLabels[status],
          rawStatus: status,
          date: b.order.DateTimeCommand ? new Date(b.order.DateTimeCommand).toLocaleDateString('fr-FR') : '—',
        };
      });

    // ─── Top produits (agrégé depuis OrderDetails résolus) ────
    const productAgg = new Map<number, TopProduct>();
    bundles.forEach(b => {
      (b.details || []).forEach((d: any) => {
        const pid = +(d.IdProduct ?? d.product?.IdProduct ?? 0);
        if (!pid) return;
        const qty = +(d.Quantity ?? 1);
        const price = +(d.UnitPrice ?? d.product?.PriceProduct ?? 0);
        const title = d.product?.TitleProduct ?? `Produit #${pid}`;
        const imgRaw = d.product?.ImageProduct;
        const image = Array.isArray(imgRaw) ? imgRaw[0] : imgRaw;
        const existing = productAgg.get(pid);
        if (existing) {
          existing.sold += qty;
        } else {
          productAgg.set(pid, { id: pid, title, price, sold: qty, image });
        }
      });
    });
    this.topProducts = Array.from(productAgg.values())
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    // ─── Ventes par mois (agrégé depuis orders + invoices) ─────
    const monthMap = new Map<string, { revenue: number; orders: number }>();
    bundles.forEach(b => {
      if (!b.order.DateTimeCommand) return;
      const d = new Date(b.order.DateTimeCommand);
      if (isNaN(d.getTime())) return;
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const inv = invoiceByOrder.get(+(b.order.IdOrder ?? 0));
      const rev = inv ? +(inv.Total ?? 0) : 0;
      const cur = monthMap.get(ym) ?? { revenue: 0, orders: 0 };
      cur.revenue += rev;
      cur.orders  += 1;
      monthMap.set(ym, cur);
    });
    this.sales = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, v]) => ({ month, revenue: v.revenue, orders: v.orders }));

    // ─── Insights ───────────────────────────────────────────────
    this.conversionRate = totalOrders > 0 ? Math.round((delivered / totalOrders) * 100) : 0;
    this.avgBasket      = totalOrders > 0 ? +(revenue / totalOrders).toFixed(2) : 0;

    const best = [...this.sales].sort((a, b) => b.revenue - a.revenue)[0];
    this.bestMonth = best && best.revenue > 0
      ? `${this.monthLabel(best.month)} (${best.revenue.toFixed(0)} TND)`
      : '—';

    this.uniqueClients = new Set(
      bundles.map(b => b.details?.[0]?.Email || b.details?.[0]?.IdUser).filter(Boolean)
    ).size;

    const now = new Date();
    const ym  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cur = this.sales.find(s => s.month === ym);
    this.monthRevenue = cur?.revenue ?? 0;
    this.monthOrders  = cur?.orders  ?? 0;

    // ─── Répartition des statuts (5 statuts réels de Deliveries) ─
    const buckets: Array<{ key: DeliveryStatus; label: string; color: string; icon: string }> = [
      { key: 'Delivered',  label: 'Livrées',    color: 'success', icon: 'ri-check-double-line' },
      { key: 'In Transit', label: 'En transit',  color: 'info',    icon: 'ri-send-plane-line' },
      { key: 'Pending',    label: 'En attente',  color: 'warning', icon: 'ri-time-line' },
      { key: 'Failed',     label: 'Échouées',    color: 'danger',  icon: 'ri-close-circle-line' },
      { key: 'Returned',   label: 'Retournées',  color: 'dark',    icon: 'ri-arrow-go-back-line' },
    ];
    this.statusDist = buckets
      .map(s => {
        const count = statusPerOrder.filter(st => st === s.key).length;
        const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
        return { ...s, count, pct };
      })
      .filter(s => s.count > 0);
  }

  // ─── Helpers ──────────────────────────────────────────────────
  get maxChartVal(): number {
    return Math.max(1, ...this.sales.map(m => this.chartMode === 'revenue' ? m.revenue : m.orders));
  }

  barHeight(m: MonthData): number {
    const v = this.chartMode === 'revenue' ? m.revenue : m.orders;
    return Math.max(4, (v / this.maxChartVal) * 100);
  }

  monthLabel(m: string): string {
    if (!m || m.length < 6) return m;
    const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    const mIdx = parseInt(m.slice(-2), 10) - 1;
    return `${months[mIdx] || ''} ${m.slice(0, 4)}`;
  }

  formatNumber(n: number): string {
    return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Livrée':     'badge bg-success-subtle text-success',
      'En transit': 'badge bg-info-subtle text-info',
      'En attente': 'badge bg-warning-subtle text-warning',
      'Échouée':    'badge bg-danger-subtle text-danger',
      'Retournée':  'badge bg-dark-subtle text-dark',
    };
    return map[status] || 'badge bg-secondary-subtle text-secondary';
  }
}