import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DeliveriesService } from 'src/app/core/services/deliveries.service';
import { TransportsService } from 'src/app/core/services/transports.service';
import { OrdersService } from 'src/app/core/services/orders.service';

interface DeliveryRow {
  idDelivery: number | null;
  idOrder: number;
  transportName: string;
  trackingNumber: string;
  status: string;
  addressLine: string;
  city: string;
  postalCode: string;
  deliveryFee: number;
  estimatedAt: string | null;
  createdAt: string | null;
  virtual: boolean;
}

@Component({
  selector: 'app-my-deliveries-user',
  standalone: false,
  template: `
<app-breadcrumbs title="Mes livraisons" [breadcrumbItems]="breadcrumbItems"></app-breadcrumbs>

<!-- ═════ KPI ═════ -->
<div class="row g-3 mb-4">
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid var(--vz-primary)">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-primary-subtle d-flex align-items-center justify-content-center">
          <i class="ri-truck-line fs-22 text-primary"></i>
        </div>
        <div>
          <h3 class="mb-0 fw-bold text-primary">{{ items.length }}</h3>
          <p class="mb-0 fs-12 text-muted">Total livraisons</p>
        </div>
      </div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid var(--vz-warning)">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-warning-subtle d-flex align-items-center justify-content-center">
          <i class="ri-time-line fs-22 text-warning"></i>
        </div>
        <div>
          <h3 class="mb-0 fw-bold text-warning">{{ pendingCount }}</h3>
          <p class="mb-0 fs-12 text-muted">En préparation</p>
        </div>
      </div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid var(--vz-info)">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-info-subtle d-flex align-items-center justify-content-center">
          <i class="ri-send-plane-line fs-22 text-info"></i>
        </div>
        <div>
          <h3 class="mb-0 fw-bold text-info">{{ shippedCount }}</h3>
          <p class="mb-0 fs-12 text-muted">En transit</p>
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
          <p class="mb-0 fs-12 text-muted">Livrées</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ═════ Toolbar ═════ -->
<div class="card border-0 shadow-sm">
  <div class="card-header bg-transparent py-3 d-flex flex-wrap align-items-center gap-2">
    <h6 class="mb-0 fw-semibold flex-grow-1">
      <i class="ri-truck-line me-2 text-primary"></i>Suivi de mes livraisons
      <span class="badge bg-primary-subtle text-primary ms-2">{{ filtered.length }}</span>
    </h6>
    <div class="btn-group btn-group-sm">
      <button class="btn" [class.btn-primary]="filter===''"         [class.btn-light]="filter!==''"         (click)="setFilter('')">Toutes</button>
      <button class="btn" [class.btn-primary]="filter==='pending'"  [class.btn-light]="filter!=='pending'"  (click)="setFilter('pending')">En attente</button>
      <button class="btn" [class.btn-primary]="filter==='preparing'"[class.btn-light]="filter!=='preparing'"(click)="setFilter('preparing')">Préparation</button>
      <button class="btn" [class.btn-primary]="filter==='shipped'"  [class.btn-light]="filter!=='shipped'"  (click)="setFilter('shipped')">Expédiées</button>
      <button class="btn" [class.btn-primary]="filter==='delivered'"[class.btn-light]="filter!=='delivered'"(click)="setFilter('delivered')">Livrées</button>
    </div>
  </div>

  <!-- Barre de recherche, tri, pagination (composant partagé) -->
  <div class="card-body pb-0">
    <app-search-pagination-bar
      [(searchInput)]="search"
      searchPlaceholder="N° commande ou tracking…"
      [(sortBy)]="sortBy"
      [sortOptions]="sortOptions"
      [currentPage]="currentPage"
      [totalPages]="totalPages"
      [pagesArray]="pagesArray"
      [totalResults]="filtered.length"
      (search)="applyFilter()"
      (clear)="onClearSearch()"
      (sortChange)="applyFilter()"
      (pageChange)="goToPage($event)">
    </app-search-pagination-bar>
  </div>

  <div class="card-body p-3 pt-0">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-primary"></div>
        <p class="text-muted mt-2 mb-0 fs-13">Chargement…</p>
      </div>
    }
    @else if (filtered.length === 0 && items.length === 0) {
      <div class="text-center py-5">
        <i class="ri-truck-line display-3 text-muted opacity-50 d-block"></i>
        <h5 class="mt-3 mb-1">Aucune livraison pour le moment</h5>
        <p class="text-muted mb-3">Passez une commande pour suivre sa livraison en temps réel.</p>
        <a routerLink="/shop/products" class="btn btn-primary">
          <i class="ri-shopping-bag-3-line me-1"></i>Parcourir la boutique
        </a>
      </div>
    }
    @else if (filtered.length === 0) {
      <div class="text-center py-5">
        <i class="ri-search-line display-5 text-muted opacity-50"></i>
        <p class="text-muted mt-2">Aucune livraison ne correspond à ces filtres.</p>
      </div>
    }
    @else {
      @for (d of paginatedItems; track d.idOrder) {
        <div class="border rounded-3 p-3 mb-3 delivery-card" style="transition:all .25s">
          <!-- Header -->
          <div class="d-flex flex-wrap align-items-start gap-3 mb-3">
            <div class="avatar-md rounded-3 d-flex align-items-center justify-content-center"
                 [class]="'bg-' + statusColor(d.status) + '-subtle'">
              <i class="fs-22" [class]="statusIcon(d.status) + ' text-' + statusColor(d.status)"></i>
            </div>
            <div class="flex-grow-1">
              <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                <h6 class="mb-0">Commande #{{ d.idOrder }}</h6>
                <span class="badge rounded-pill" [class]="'bg-' + statusColor(d.status) + '-subtle text-' + statusColor(d.status)">
                  {{ statusLabel(d.status) }}
                </span>
                @if (d.virtual) {
                  <span class="badge bg-light text-muted fs-10">Synthétisée depuis la commande</span>
                }
              </div>
              <div class="fs-12 text-muted">
                <i class="ri-truck-line me-1"></i>{{ d.transportName || 'Transporteur à affecter' }}
                @if (d.trackingNumber) {
                  &nbsp;·&nbsp;<span class="fw-semibold text-primary">{{ d.trackingNumber }}</span>
                  <button class="btn btn-sm btn-link p-0 ms-1" (click)="copy(d.trackingNumber)" title="Copier">
                    <i class="ri-file-copy-line"></i>
                  </button>
                }
              </div>
            </div>
            @if (d.status !== 'delivered' && d.status !== 'cancelled') {
              <div class="text-end">
                <div class="fs-11 text-muted">Livraison estimée</div>
                <div class="fs-13 fw-semibold">{{ estimateDate(d) }}</div>
              </div>
            }
          </div>

          <!-- Progress tracker -->
          <div class="position-relative mb-3 px-2">
            <div class="progress" style="height:6px">
              <div class="progress-bar" [class]="'bg-' + statusColor(d.status)"
                   [style.width.%]="progressPct(d.status)"></div>
            </div>
            <div class="d-flex justify-content-between mt-2 fs-11">
              <div class="text-center" [class.text-primary]="progressPct(d.status) >= 25" [class.fw-bold]="progressPct(d.status) >= 25">
                <i class="ri-checkbox-circle-line d-block"></i>Commandé
              </div>
              <div class="text-center" [class.text-primary]="progressPct(d.status) >= 50" [class.fw-bold]="progressPct(d.status) >= 50">
                <i class="ri-archive-line d-block"></i>Préparation
              </div>
              <div class="text-center" [class.text-primary]="progressPct(d.status) >= 75" [class.fw-bold]="progressPct(d.status) >= 75">
                <i class="ri-send-plane-line d-block"></i>Expédié
              </div>
              <div class="text-center" [class.text-success]="progressPct(d.status) >= 100" [class.fw-bold]="progressPct(d.status) >= 100">
                <i class="ri-check-double-line d-block"></i>Livré
              </div>
            </div>
          </div>

          <!-- Info grid -->
          <div class="row g-2 fs-13 pt-2 border-top">
            <div class="col-md-6">
              <div class="fs-11 text-muted"><i class="ri-map-pin-line me-1"></i>Adresse de livraison</div>
              <div>{{ d.addressLine || '—' }} @if (d.city) {, {{ d.city }}} @if (d.postalCode) {{{ d.postalCode }}}</div>
            </div>
            <div class="col-md-3">
              <div class="fs-11 text-muted"><i class="ri-money-dollar-circle-line me-1"></i>Frais de livraison</div>
              <div class="fw-semibold">{{ d.deliveryFee | number:'1.2-2' }} TND</div>
            </div>
            <div class="col-md-3 text-md-end">
              <div class="fs-11 text-muted"><i class="ri-calendar-line me-1"></i>Créée le</div>
              <div class="fs-12">{{ formatDate(d.createdAt) }}</div>
            </div>
          </div>
        </div>
      }
    }
  </div>
</div>

<style>
.delivery-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.06); border-color: var(--vz-primary) ! important ; }
</style>
`,
})
export class MyDeliveriesUserComponent implements OnInit {
  breadcrumbItems = [{ label: 'Tijara', active: false }, { label: 'Mes livraisons', active: true }];

  items: DeliveryRow[] = [];
  filtered: DeliveryRow[] = [];
  search = '';
  filter = '';
  loading = true;

  // ─── Recherche, tri & pagination (via SearchPaginationBarComponent) ───
  sortBy: 'recent' | 'oldest' = 'recent';
  sortOptions = [
    { value: 'recent', label: 'Plus récentes' },
    { value: 'oldest', label: 'Plus anciennes' },
  ];
  currentPage = 1;
  pageSize = 6;

  get pendingCount(): number   { return this.items.filter(d => d.status === 'pending' || d.status === 'preparing').length; }
  get shippedCount(): number   { return this.items.filter(d => d.status === 'shipped').length; }
  get deliveredCount(): number { return this.items.filter(d => d.status === 'delivered').length; }

  constructor(private deliveriesService: DeliveriesService, private ordersService: OrdersService, private transportsService: TransportsService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;

    forkJoin({
     orders: this.ordersService.getMyOrdersDynamic().pipe(catchError(() => of([] as any[]))),
      transports: this.transportsService.getTransports().pipe(catchError(() => of({ data: [] })))
    }).subscribe(({ orders, transports }: any) => {
      const transportsMap: Record<number, string> = {};
      (transports?.data ?? transports ?? []).forEach((t: any) => {
        transportsMap[t.IdTransport ?? t.idTransport] = t.Name ?? t.name ?? '';
      });

      if (!orders || orders.length === 0) {
        this.items = [];
        this.applyFilter();
        this.loading = false;
        return;
      }

      // Une requête par commande vers la route déjà scopée /deliveries/order/{id}
      const deliveryRequests = orders.map((o: any) =>
        this.deliveriesService.getDeliveriesByOrder(o.id ?? o.IdOrder).pipe(
          catchError(() => of([] as any[]))
        )
      );

      (forkJoin(deliveryRequests) as import('rxjs').Observable<any[][]>).subscribe((results: any[][]) => {
        const allDeliveries = results.flat();

        const delivs: DeliveryRow[] = allDeliveries.map((x: any) => ({
          idDelivery:     x.idDelivery     ?? x.IdDelivery ?? null,
          idOrder:        +(x.idOrder      ?? x.IdOrder ?? 0),
          transportName:  transportsMap[x.IdTransport ?? x.idTransport] || x.transportName || x.TransportName || '',
          trackingNumber: x.trackingNumber ?? x.TrackingNumber ?? '',
          status:         (x.status ?? x.Status ?? 'pending').toString().toLowerCase(),
          addressLine:    x.addressLine    ?? x.AddressLine ?? '',
          city:           x.city           ?? x.City ?? '',
          postalCode:     x.postalCode     ?? x.PostalCode ?? '',
          deliveryFee:    +(x.deliveryFee  ?? x.DeliveryFee ?? 0),
          estimatedAt:    x.estimatedAt    ?? x.EstimatedAt ?? null,
          createdAt:      x.createdAt      ?? x.CreatedAt   ?? null,
          virtual:        false,
        }));

        const deliveredOrderIds = new Set(delivs.map(d => d.idOrder));

        const virtualRows: DeliveryRow[] = orders
          .filter((o: any) => !deliveredOrderIds.has(+(o.id ?? o.IdOrder)))
          .map((o: any) => ({
            idDelivery:     null,
            idOrder:        +(o.id ?? o.IdOrder),
            transportName:  '',
            trackingNumber: '',
            status:         this.mapOrderStatus(o.status ?? o.Status),
            addressLine:    o.shipping_address || o.address || '',
            city:           o.city || '',
            postalCode:     o.postal_code || '',
            deliveryFee:    +(o.delivery_fee || 0),
            estimatedAt:    null,
            createdAt:      o.created_at || o.CreatedAt || o.DateTimeCommand || null,
            virtual:        true,
          }));

        this.items = [...delivs, ...virtualRows]
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        this.applyFilter();
        this.loading = false;
      });
    });
  }

  applyFilter(): void {
    const s = this.search.trim().toLowerCase();
    let list = this.items.filter(d => {
      if (s && !`${d.idOrder} ${d.trackingNumber}`.toLowerCase().includes(s)) return false;
      if (this.filter && d.status !== this.filter) return false;
      return true;
    });

    switch (this.sortBy) {
      case 'recent': list = list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()); break;
      case 'oldest': list = list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()); break;
    }

    this.filtered = list;
    this.currentPage = 1;
  }

  onClearSearch(): void {
    this.search = '';
    this.applyFilter();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get paginatedItems(): DeliveryRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  setFilter(f: string): void { this.filter = f; this.applyFilter(); }

  copy(v: string): void {
    if (!v) return;
    navigator.clipboard?.writeText(v);
  }

  estimateDate(d: DeliveryRow): string {
    if (d.estimatedAt) return this.formatDate(d.estimatedAt);
    if (!d.createdAt) return '—';
    const dt = new Date(d.createdAt);
    dt.setDate(dt.getDate() + 3);
    return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private mapOrderStatus(s: string): string {
    const m: Record<string, string> = {
      pending: 'pending', confirmed: 'preparing',
      shipped: 'shipped', delivered: 'delivered', cancelled: 'cancelled',
      returned: 'returned', failed: 'failed',
    };
    return m[s] || 'pending';
  }

  statusLabel(s: string): string {
    return ({ pending:'En attente', preparing:'Préparation', shipped:'Expédiée', delivered:'Livrée', cancelled:'Annulée', returned:'Retournée', failed:'Échec de livraison' } as any)[s] || s;
  }
  statusColor(s: string): string {
    return s === 'delivered' ? 'success' : s === 'shipped' ? 'info' : s === 'cancelled' ? 'danger' : s === 'returned' ? 'dark' : s === 'failed' ? 'danger' : s === 'preparing' ? 'primary' : 'warning';
  }
  statusIcon(s: string): string {
    return s === 'delivered' ? 'ri-check-double-line' : s === 'shipped' ? 'ri-send-plane-line' : s === 'preparing' ? 'ri-archive-line' : s === 'cancelled' ? 'ri-close-circle-line' : s === 'returned' ? 'ri-arrow-go-back-line' : s === 'failed' ? 'ri-error-warning-line' : 'ri-time-line';
  }
  progressPct(s: string): number {
    return s === 'delivered' ? 100 : s === 'shipped' ? 75 : s === 'preparing' ? 50 : (s === 'cancelled' || s === 'returned' || s === 'failed') ? 0 : 25;
  }
}

