import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { DeliveriesService } from 'src/app/core/services/deliveries.service';
import { DealsService } from 'src/app/core/services/deals.service';
import { InvoicesService } from 'src/app/core/services/invoices.service';
import { OrdersService } from 'src/app/core/services/orders.service';

// ⚠️ IMPORTANT — ReportsController (backend) est en réalité la table des
// signalements/réclamations (Subject, Description, IdCauseReport, State,
// TypeTable...), pas une source d'analytics de vente. Aucune route
// overview/sales-by-month/top-products/top-customers n'existe côté backend.
// Cet écran est donc entièrement recalculé côté front à partir des données
// réelles déjà confirmées sur les autres écrans : mes deals -> mes commandes,
// Deliveries (statut réel), et mes factures vendeur (revenus, produits).
//
// ⚠️ CORRIGÉ (19/08/2026) — load() appelait api.getOrders() (GET /orders
// index), collisionné côté backend avec la version admin-only de la route
// (voir routes/api.php Section 4) et renvoyant 403 pour un compte
// entreprise. Remplacé par api.getSellerOrders() (GET /orders/seller),
// route dédiée vendeur non affectée par la collision, puis filtré sur
// myDealIds comme avant.
//
// ⚠️ CORRIGÉ (19/08/2026, 2e passe) — load() appelait aussi
// api.getDeliveries() (GET /deliveries index), collisionné de la même
// façon (routes/api.php : déclaré en Section 2 auth:api ET en Section 4
// admin, cette dernière écrasant la première) → 403 silencieux pour un
// compte entreprise (avalé par catchError(() => of([]))), donc
// deliveriesByOrder restait toujours vide et TOUTES les commandes
// retombaient sur le statut "Pending" par défaut, sans erreur visible.
// Remplacé par un appel api.getDeliveriesByOrder(idOrder) par commande
// (GET /deliveries/order/{idOrder}, route scopée déclarée une seule fois
// en Section 3, non affectée par la collision).

type DeliveryStatus = 'Pending' | 'In Transit' | 'Delivered' | 'Failed' | 'Returned';

interface MonthData { month: string; revenue: number; orders: number; }
interface TopProduct { id: number; title: string; price: number; sold: number; }
interface StatusSlice { label: string; count: number; pct: number; color: string; icon: string; }

@Component({
  selector: 'app-reports-ent',
  standalone: false,
  template: `
<app-breadcrumbs title="Rapports" [breadcrumbItems]="breadcrumbItems"></app-breadcrumbs>

@if (error) {
  <div class="alert alert-danger">{{ error }}</div>
}

<!-- ═════ KPI cards ═════ -->
<div class="row g-3 mb-4">
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid var(--vz-primary)">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-primary-subtle d-flex align-items-center justify-content-center">
          <i class="ri-shopping-bag-3-line fs-22 text-primary"></i>
        </div>
        <div>
          <h3 class="mb-0 fw-bold text-primary">{{ totalOrders }}</h3>
          <p class="mb-0 text-muted fs-12">Commandes</p>
        </div>
      </div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid var(--vz-success)">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-success-subtle d-flex align-items-center justify-content-center">
          <i class="ri-check-double-line fs-22 text-success"></i>
        </div>
        <div>
          <h3 class="mb-0 fw-bold text-success">{{ deliveredCount }}</h3>
          <p class="mb-0 text-muted fs-12">Livrées</p>
        </div>
      </div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid var(--vz-info)">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-info-subtle d-flex align-items-center justify-content-center">
          <i class="ri-money-dollar-circle-line fs-22 text-info"></i>
        </div>
        <div>
          <h3 class="mb-0 fw-bold text-info">{{ totalRevenue | number:'1.0-0' }}</h3>
          <p class="mb-0 text-muted fs-12">Revenus (TND)</p>
        </div>
      </div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid var(--vz-warning)">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-warning-subtle d-flex align-items-center justify-content-center">
          <i class="ri-bank-card-line fs-22 text-warning"></i>
        </div>
        <div>
          <h3 class="mb-0 fw-bold text-warning">{{ paidRevenue | number:'1.0-0' }}</h3>
          <p class="mb-0 text-muted fs-12">Encaissé (TND)</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ═════ Main charts ═════ -->
<div class="row g-4 mb-4">
  <div class="col-xl-8">
    <div class="card border-0 shadow-sm h-100">
      <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2 py-3">
        <h6 class="mb-0 fw-semibold flex-grow-1">
          <i class="ri-line-chart-line me-2 text-primary"></i>Évolution des ventes
        </h6>
        <div class="btn-group btn-group-sm">
          <button class="btn" [class.btn-primary]="chartMode==='revenue'" [class.btn-light]="chartMode!=='revenue'"
                  (click)="chartMode='revenue'">Revenus</button>
          <button class="btn" [class.btn-primary]="chartMode==='orders'"  [class.btn-light]="chartMode!=='orders'"
                  (click)="chartMode='orders'">Commandes</button>
        </div>
      </div>
      <div class="card-body">
        @if (loading) {
          <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
        } @else if (sales.length === 0) {
          <div class="text-center py-5">
            <i class="ri-line-chart-line display-4 text-muted opacity-50 d-block"></i>
            <p class="text-muted mt-2 mb-0">Aucune donnée de vente disponible</p>
            <small class="text-muted">Basé sur vos factures émises — générez une facture depuis l'écran Commandes.</small>
          </div>
        } @else {
          <div class="d-flex align-items-end gap-2" style="height:280px">
            @for (m of sales; track m.month) {
              <div class="flex-grow-1 d-flex flex-column align-items-center h-100 justify-content-end"
                   [title]="monthLabel(m.month) + ' — ' + (chartMode==='revenue' ? (m.revenue + ' TND') : (m.orders + ' cmd'))">
                <div class="fs-11 fw-semibold" [class.text-primary]="chartMode==='revenue'" [class.text-success]="chartMode==='orders'">
                  {{ chartMode === 'revenue' ? (m.revenue | number:'1.0-0') : m.orders }}
                </div>
                <div class="w-100 rounded-top mt-1"
                     [style.height.%]="barHeight(m)"
                     [style.background]="chartMode==='revenue' ? 'linear-gradient(180deg,#405189,#0ab39c)' : 'linear-gradient(180deg,#0ab39c,#5cb85c)'"
                     style="min-height:8px;transition:all .3s"></div>
                <div class="fs-10 text-muted mt-1">{{ monthLabel(m.month) }}</div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  </div>

  <div class="col-xl-4">
    <div class="card border-0 shadow-sm h-100">
      <div class="card-header bg-transparent py-3">
        <h6 class="mb-0 fw-semibold">
          <i class="ri-star-line me-2 text-warning"></i>Top produits
        </h6>
        <small class="text-muted fs-11">D'après les commandes déjà facturées</small>
      </div>
      <div class="card-body p-0">
        @if (topProducts.length === 0) {
          <div class="text-center py-5">
            <i class="ri-trophy-line display-4 text-muted opacity-50 d-block"></i>
            <p class="text-muted mt-2 mb-0 fs-13">Aucune vente facturée pour le moment</p>
          </div>
        } @else {
          <ul class="list-group list-group-flush">
            @for (p of topProducts; track p.id; let i = $index) {
              <li class="list-group-item d-flex align-items-center gap-3 py-3">
                <div class="avatar-xs rounded-circle d-flex align-items-center justify-content-center fw-bold"
                     [class.bg-warning]="i===0" [class.text-white]="i===0"
                     [class.bg-secondary-subtle]="i!==0" [class.text-secondary]="i!==0">
                  {{ i + 1 }}
                </div>
                <div class="flex-grow-1 min-width-0">
                  <div class="fw-semibold fs-13 text-truncate">{{ p.title }}</div>
                  <div class="fs-11 text-muted">{{ p.price | number:'1.2-2' }} TND</div>
                </div>
                <span class="badge bg-success-subtle text-success rounded-pill">
                  <i class="ri-shopping-cart-2-line me-1"></i>{{ p.sold }}
                </span>
              </li>
            }
          </ul>
        }
      </div>
    </div>
  </div>
</div>

<!-- ═════ Status distribution + Insights ═════ -->
<div class="row g-4">
  <div class="col-md-6">
    <div class="card border-0 shadow-sm h-100">
      <div class="card-header bg-transparent py-3">
        <h6 class="mb-0 fw-semibold">
          <i class="ri-pie-chart-line me-2 text-info"></i>Répartition des commandes
        </h6>
      </div>
      <div class="card-body">
        @if (statusDist.length === 0) {
          <p class="text-muted text-center py-4 mb-0">Aucune donnée.</p>
        } @else {
          @for (s of statusDist; track s.label) {
            <div class="mb-3">
              <div class="d-flex justify-content-between fs-13 mb-1">
                <span><i [class]="s.icon + ' me-1 text-' + s.color"></i>{{ s.label }}</span>
                <span class="fw-semibold">{{ s.count }} ({{ s.pct }}%)</span>
              </div>
              <div class="progress" style="height:8px">
                <div class="progress-bar" [class]="'bg-' + s.color" [style.width.%]="s.pct"></div>
              </div>
            </div>
          }
        }
      </div>
    </div>
  </div>

  <div class="col-md-6">
    <div class="card border-0 shadow-sm h-100">
      <div class="card-header bg-transparent py-3">
        <h6 class="mb-0 fw-semibold">
          <i class="ri-lightbulb-flash-line me-2 text-success"></i>Insights
        </h6>
      </div>
      <div class="card-body">
        <div class="d-flex gap-3 mb-3">
          <div class="avatar-sm bg-success-subtle text-success rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
            <i class="ri-line-chart-line"></i>
          </div>
          <div>
            <div class="fs-13 fw-semibold">Taux de livraison</div>
            <div class="fs-11 text-muted">{{ conversionRate }}% des commandes sont livrées avec succès</div>
          </div>
        </div>
        <div class="d-flex gap-3 mb-3">
          <div class="avatar-sm bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
            <i class="ri-exchange-dollar-line"></i>
          </div>
          <div>
            <div class="fs-13 fw-semibold">Panier moyen</div>
            <div class="fs-11 text-muted">{{ avgBasket | number:'1.2-2' }} TND par commande facturée</div>
          </div>
        </div>
        <div class="d-flex gap-3 mb-3">
          <div class="avatar-sm bg-warning-subtle text-warning rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
            <i class="ri-calendar-check-line"></i>
          </div>
          <div>
            <div class="fs-13 fw-semibold">Meilleur mois</div>
            <div class="fs-11 text-muted">{{ bestMonth }}</div>
          </div>
        </div>
        <div class="d-flex gap-3">
          <div class="avatar-sm bg-info-subtle text-info rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
            <i class="ri-user-star-line"></i>
          </div>
          <div>
            <div class="fs-13 fw-semibold">Clients uniques</div>
            <div class="fs-11 text-muted">{{ uniqueClients }} acheteurs différents (commandes facturées)</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
`,
})
export class ReportsEntComponent implements OnInit {
  breadcrumbItems = [{ label: 'Vendor', active: false }, { label: 'Rapports', active: true }];

  loading = true;
  error: string | null = null;

  chartMode: 'revenue' | 'orders' = 'revenue';

  totalOrders = 0;
  deliveredCount = 0;
  totalRevenue = 0;
  paidRevenue = 0;

  sales: MonthData[] = [];
  topProducts: TopProduct[] = [];
  statusDist: StatusSlice[] = [];

  avgBasket = 0;
  conversionRate = 0;
  bestMonth = '—';
  uniqueClients = 0;

  get maxVal(): number {
    return Math.max(1, ...this.sales.map(m => this.chartMode === 'revenue' ? m.revenue : m.orders));
  }
  barHeight(m: MonthData): number {
    const val = this.chartMode === 'revenue' ? m.revenue : m.orders;
    return (val / this.maxVal) * 100;
  }

  constructor(private deliveriesService: DeliveriesService, private dealsService: DealsService, private invoicesService: InvoicesService, private ordersService: OrdersService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = null;

    this.dealsService.getMyDeals().pipe(
      map((res: any) => {
        const list: any[] = res?.data ?? res ?? [];
        return (Array.isArray(list) ? list : []).map(d => d.idDeal ?? d.IdDeal ?? d.id);
      }),
      switchMap((myDealIds: number[]) => {
        if (myDealIds.length === 0) {
          return of({ myOrders: [] as any[], deliveriesByOrder: new Map<number, any[]>(), invoices: [] as any[] });
        }
        return this.ordersService.getSellerOrders().pipe(
          map((res: any) => {
            const list: any[] = res?.data ?? res ?? [];
            return (Array.isArray(list) ? list : []).filter(o => myDealIds.includes(o.IdDeal));
          }),
          catchError(() => of([] as any[])),
          switchMap((myOrders: any[]) => {
            if (myOrders.length === 0) {
              return of({ myOrders, deliveriesByOrder: new Map<number, any[]>(), invoices: [] as any[] });
            }
            return forkJoin({
              deliveriesByOrder: forkJoin(
                myOrders.map(o =>
                  this.deliveriesService.getDeliveriesByOrder(o.IdOrder).pipe(
                    map((ds: any) => ({ IdOrder: o.IdOrder, ds: (Array.isArray(ds) ? ds : (ds?.data ?? [])) })),
                    catchError(() => of({ IdOrder: o.IdOrder, ds: [] as any[] }))
                  )
                )
              ).pipe(
                map((results: { IdOrder: number; ds: any[] }[]) => {
                  const m = new Map<number, any[]>();
                  results.forEach(r => m.set(r.IdOrder, r.ds));
                  return m;
                })
              ),
              invoices: this.invoicesService.getMyVendorInvoices().pipe(catchError(() => of([])))
            }).pipe(
              map(({ deliveriesByOrder, invoices }) => ({ myOrders, deliveriesByOrder, invoices }))
            );
          })
        );
      }),
      catchError(() => {
        this.error = 'Impossible de charger les données du rapport.';
        return of({ myOrders: [] as any[], deliveriesByOrder: new Map<number, any[]>(), invoices: [] as any[] });
      })
    ).subscribe(({ myOrders, deliveriesByOrder, invoices }: { myOrders: any[]; deliveriesByOrder: any; invoices: any[] }) => {
      this.buildReport(myOrders, deliveriesByOrder, invoices);
      this.loading = false;
    });
  }

  private buildReport(myOrders: any[], deliveriesByOrder: Map<number, any[]>, invoices: any[]): void {
    // ── Statut par commande : Active=0 -> Annulée, sinon dernier statut de livraison
    const orderStatus = (o: any): string => {
      if (Number(o.Active) === 0) return 'Annulée';
      const ds = deliveriesByOrder.get(o.IdOrder) || [];
      if (ds.length === 0) return 'Pending';
      const latest = [...ds].sort((a, b) => new Date(b.CreatedAt || 0).getTime() - new Date(a.CreatedAt || 0).getTime())[0];
      return (latest.Status as DeliveryStatus) ?? 'Pending';
    };

    const statuses = myOrders.map(orderStatus);
    this.totalOrders = myOrders.length;
    this.deliveredCount = statuses.filter(s => s === 'Delivered').length;
    this.conversionRate = this.totalOrders > 0 ? Math.round((this.deliveredCount / this.totalOrders) * 100) : 0;

    const statusMeta: Record<string, { label: string; color: string; icon: string }> = {
      'Pending':     { label: 'En attente', color: 'warning', icon: 'ri-time-line' },
      'In Transit':  { label: 'En transit',  color: 'info',    icon: 'ri-send-plane-line' },
      'Delivered':   { label: 'Livrées',     color: 'success', icon: 'ri-check-double-line' },
      'Failed':      { label: 'Échouées',    color: 'danger',  icon: 'ri-close-circle-line' },
      'Returned':    { label: 'Retournées',  color: 'dark',    icon: 'ri-arrow-go-back-line' },
      'Annulée':     { label: 'Annulées',    color: 'danger',  icon: 'ri-close-circle-line' },
    };
    const counts = new Map<string, number>();
    statuses.forEach(s => counts.set(s, (counts.get(s) || 0) + 1));
    this.statusDist = Array.from(counts.entries())
      .map(([key, count]) => {
        const meta = statusMeta[key] || { label: key, color: 'secondary', icon: 'ri-question-line' };
        return { label: meta.label, count, pct: this.totalOrders > 0 ? Math.round((count / this.totalOrders) * 100) : 0, color: meta.color, icon: meta.icon };
      })
      .sort((a, b) => b.count - a.count);

    // ── Revenus / factures (seule source financière réelle)
    const nonCancelled = (invoices || []).filter((i: any) => i.Status !== 'Cancelled');
    this.totalRevenue = nonCancelled.reduce((s: number, i: any) => s + (+i.Total || 0), 0);
    this.paidRevenue = (invoices || []).filter((i: any) => i.Status === 'Paid').reduce((s: number, i: any) => s + (+i.Total || 0), 0);
    this.avgBasket = nonCancelled.length > 0 ? +(this.totalRevenue / nonCancelled.length).toFixed(3) : 0;

    // ── Ventes par mois, depuis IssuedAt
    const monthMap = new Map<string, { revenue: number; orders: Set<number> }>();
    nonCancelled.forEach((inv: any) => {
      const d = inv.IssuedAt ? new Date(inv.IssuedAt) : null;
      if (!d || isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthMap.get(key) || { revenue: 0, orders: new Set<number>() };
      entry.revenue += +inv.Total || 0;
      entry.orders.add(inv.IdOrder);
      monthMap.set(key, entry);
    });
    this.sales = Array.from(monthMap.entries())
      .map(([month, v]) => ({ month, revenue: v.revenue, orders: v.orders.size }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const best = [...this.sales].sort((a, b) => b.revenue - a.revenue)[0];
    this.bestMonth = best ? `${this.monthLabel(best.month)} (${best.revenue.toFixed(0)} TND)` : '—';

    // ── Top produits, depuis les lignes de commande déjà embarquées dans les factures
    const productMap = new Map<number, { title: string; price: number; sold: number }>();
    nonCancelled.forEach((inv: any) => {
      const details: any[] = inv.order?.details ?? [];
      details.forEach((d: any) => {
        const id = +(d.IdProduct || 0);
        if (!id) return;
        const price = +(d.product?.PriceProduct ?? 0);
        const title = d.product?.NameProduct ?? `Produit #${id}`;
        const entry = productMap.get(id) || { title, price, sold: 0 };
        entry.sold += +(d.Quantity || 0);
        productMap.set(id, entry);
      });
    });
    this.topProducts = Array.from(productMap.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    // ── Clients uniques, depuis les factures (IdUser)
    this.uniqueClients = new Set(nonCancelled.map((i: any) => i.IdUser).filter(Boolean)).size;
  }

  monthLabel(m: string): string {
    if (!m || m.length < 7) return m;
    const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    const [year, mon] = m.split('-');
    const idx = parseInt(mon, 10) - 1;
    return `${months[idx] || m} ${year}`;
  }
}