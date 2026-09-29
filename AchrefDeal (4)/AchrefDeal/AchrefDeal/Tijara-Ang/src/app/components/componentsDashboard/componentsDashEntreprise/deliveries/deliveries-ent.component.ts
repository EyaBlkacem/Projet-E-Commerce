import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { OrdersService } from 'src/app/core/services/orders.service';
import { DeliveriesService } from 'src/app/core/services/deliveries.service';
import { TransportsService } from 'src/app/core/services/transports.service';

// Enum réel confirmé côté backend — DeliveriesController::updateStatus():
// $request->validate(['Status' => 'required|string|in:Pending,In Transit,Delivered,Failed,Returned'])
type DeliveryStatus = 'Pending' | 'In Transit' | 'Delivered' | 'Failed' | 'Returned';
const STATUSES: DeliveryStatus[] = ['Pending', 'In Transit', 'Delivered', 'Failed', 'Returned'];

interface DeliveryRow {
  idDelivery: number | null;
  idOrder: number;
  clientName: string;
  clientEmail: string;
  products: string;
  idTransport: number | null;
  transportName: string;
  trackingNumber: string;
  status: DeliveryStatus;
  addressLine: string;
  city: string;
  postalCode: string;
  phone: string;
  deliveryFee: number;
  note: string;
  createdAt: string | null;
  virtual: boolean;
  isMultiVendor: boolean;
}

interface TransportOpt { id: number; name: string; fee: number; }

@Component({
  selector: 'app-deliveries-ent',
  standalone: false,
  template: `
<app-breadcrumbs title="Livraisons" [breadcrumbItems]="breadcrumbItems"></app-breadcrumbs>

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
          <i class="ri-archive-line fs-22 text-warning"></i>
        </div>
        <div>
          <h3 class="mb-0 fw-bold text-warning">{{ pendingCount }}</h3>
          <p class="mb-0 fs-12 text-muted">En attente</p>
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
          <h3 class="mb-0 fw-bold text-info">{{ transitCount }}</h3>
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

@if (error) {
  <div class="alert alert-danger">{{ error }}</div>
}

<!-- ═════ Toolbar ═════ -->
<div class="card border-0 shadow-sm">
  <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2 py-3">
    <h6 class="mb-0 fw-semibold flex-grow-1">
      <i class="ri-truck-line me-2 text-primary"></i>Mes livraisons
      <span class="badge bg-primary-subtle text-primary ms-2">{{ filtered.length }}</span>
    </h6>
    <div class="input-group input-group-sm" style="max-width:240px">
      <span class="input-group-text bg-white border-end-0"><i class="ri-search-line"></i></span>
      <input type="text" class="form-control border-start-0"
             placeholder="Commande, client ou tracking…"
             [(ngModel)]="search" (input)="applyFilter()" />
    </div>
    <div class="btn-group btn-group-sm flex-wrap">
      <button class="btn" [class.btn-primary]="filter===''"           [class.btn-light]="filter!==''"           (click)="setFilter('')">Toutes</button>
      @for (s of statuses; track s) {
        <button class="btn" [class.btn-primary]="filter===s" [class.btn-light]="filter!==s" (click)="setFilter(s)">{{ s }}</button>
      }
    </div>
  </div>

  <div class="card-body p-0">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-primary"></div>
        <p class="text-muted mt-2 mb-0 fs-13">Chargement…</p>
      </div>
    }
    @else if (filtered.length === 0 && items.length === 0) {
      <div class="text-center py-5">
        <i class="ri-truck-line display-3 text-muted opacity-50 d-block"></i>
        <h5 class="mt-3 mb-1">Aucune livraison pour le moment</h5>
        <p class="text-muted mb-3">Dès qu'un client passera commande sur l'un de vos deals, elle apparaîtra ici.</p>
      </div>
    }
    @else if (filtered.length === 0) {
      <div class="text-center py-5">
        <i class="ri-search-line display-5 text-muted opacity-50"></i>
        <p class="text-muted mt-2">Aucune livraison ne correspond à ces filtres.</p>
      </div>
    }
    @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th class="ps-3">Commande</th>
              <th>Client</th>
              <th>Transporteur / Tracking</th>
              <th>Adresse</th>
              <th class="text-end">Frais</th>
              <th class="text-center">Statut</th>
              <th class="text-end pe-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (d of filtered; track $index) {
              <tr>
                <td class="ps-3">
                  <div class="fw-semibold text-primary fs-13">#{{ d.idOrder }}</div>
                  <div class="fs-11 text-muted">{{ formatDate(d.createdAt) }}</div>
                  @if (d.products) {
                    <div class="fs-11 text-muted text-truncate" style="max-width:160px">{{ d.products }}</div>
                  }
                </td>
                <td>
                  <div class="fs-13 fw-semibold">{{ d.clientName || '—' }}</div>
                  @if (d.clientEmail) { <div class="fs-11 text-muted">{{ d.clientEmail }}</div> }
                  @if (d.phone)       { <div class="fs-11 text-muted"><i class="ri-phone-line"></i> {{ d.phone }}</div> }
                </td>
                <td>
                  @if (d.transportName) {
                    <div class="fs-13"><i class="ri-truck-line text-info me-1"></i>{{ d.transportName }}</div>
                  } @else {
                    <span class="badge bg-light text-muted fs-11">Non affecté</span>
                  }
                  @if (d.trackingNumber) {
                    <div class="fs-11 text-primary fw-semibold mt-1">
                      <i class="ri-barcode-line"></i> {{ d.trackingNumber }}
                    </div>
                  }
                </td>
                <td class="fs-12">
                  @if (d.addressLine) {
                    <div>{{ d.addressLine }}</div>
                    @if (d.city || d.postalCode) {
                      <div class="text-muted">{{ d.city }} {{ d.postalCode }}</div>
                    }
                  } @else {
                    <span class="text-muted">—</span>
                  }
                </td>
                <td class="text-end fw-semibold fs-13">
                  @if (d.deliveryFee > 0) {
                    {{ d.deliveryFee | number:'1.2-2' }} TND
                  } @else {
                    <span class="text-muted fs-11">Gratuit</span>
                  }
                </td>
                <td class="text-center">
                  <select class="form-select form-select-sm"
                          [ngModel]="d.status"
                          (ngModelChange)="changeStatus(d, $event)"
                          [class]="'border-0 bg-' + statusColor(d.status) + '-subtle text-' + statusColor(d.status)"
                          style="font-weight:600;min-width:130px"
                          [disabled]="savingKey === rowKey(d)">
                    @for (s of statuses; track s) {
                      <option [value]="s">{{ s }}</option>
                    }
                  </select>
                </td>
                <td class="text-end pe-3">
                  <button class="btn btn-sm btn-outline-primary rounded-pill" (click)="openEdit(d)" title="Modifier">
                    <i class="ri-edit-2-line"></i> Gérer
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>
</div>

<!-- ═════ Modal édition ═════ -->
@if (editing) {
  <div class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,.5)" (click)="closeEdit($event)">
    <div class="modal-dialog modal-lg modal-dialog-centered" (click)="$event.stopPropagation()">
      <div class="modal-content border-0 shadow-lg">
        <div class="modal-header bg-primary-subtle">
          <h5 class="modal-title fw-bold text-primary">
            <i class="ri-truck-line me-2"></i>
            Livraison de la commande #{{ editing.idOrder }}
          </h5>
          <button type="button" class="btn-close" (click)="closeEdit()"></button>
        </div>
        <div class="modal-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fs-12 fw-semibold">Transporteur</label>
              <select class="form-select form-select-sm" [(ngModel)]="form.idTransport"
                      (change)="onTransportChange()">
                <option [ngValue]="null">— Aucun —</option>
                @for (t of transports; track t.id) {
                  <option [ngValue]="t.id">{{ t.name }} ({{ t.fee | number:'1.2-2' }} TND)</option>
                }
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label fs-12 fw-semibold">N° de tracking</label>
              <input type="text" class="form-control form-control-sm"
                     [(ngModel)]="form.trackingNumber" placeholder="ex : ARX-123456789" />
            </div>
            <div class="col-md-8">
              <label class="form-label fs-12 fw-semibold">Adresse de livraison</label>
              <input type="text" class="form-control form-control-sm"
                     [(ngModel)]="form.addressLine" placeholder="Rue, immeuble…" />
            </div>
            <div class="col-md-4">
              <label class="form-label fs-12 fw-semibold">Téléphone client</label>
              <input type="text" class="form-control form-control-sm"
                     [(ngModel)]="form.phone" placeholder="+216 …" />
            </div>
            <div class="col-md-6">
              <label class="form-label fs-12 fw-semibold">Ville</label>
              <input type="text" class="form-control form-control-sm" [(ngModel)]="form.city" />
            </div>
            <div class="col-md-3">
              <label class="form-label fs-12 fw-semibold">Code postal</label>
              <input type="text" class="form-control form-control-sm" [(ngModel)]="form.postalCode" />
            </div>
            <div class="col-md-3">
              <label class="form-label fs-12 fw-semibold">Frais (TND)</label>
              <input type="number" min="0" step="0.001" class="form-control form-control-sm"
                     [(ngModel)]="form.deliveryFee" />
            </div>
            <div class="col-12">
              <label class="form-label fs-12 fw-semibold">Note interne</label>
              <textarea class="form-control form-control-sm" rows="2"
                        [(ngModel)]="form.note" placeholder="Instructions, créneau…"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-light" (click)="closeEdit()" [disabled]="saving">Annuler</button>
          <button class="btn btn-primary" (click)="saveEdit()" [disabled]="saving">
            @if (saving) { <span class="spinner-border spinner-border-sm me-1"></span> }
            <i class="ri-save-line me-1"></i> Enregistrer
          </button>
        </div>
      </div>
    </div>
  </div>
}
`,
})
export class DeliveriesEntComponent implements OnInit {
  breadcrumbItems = [{ label: 'Vendor', active: false }, { label: 'Livraisons', active: true }];

  statuses = STATUSES;

  items: DeliveryRow[] = [];
  filtered: DeliveryRow[] = [];
  search = '';
  filter = '';
  loading = true;
  error: string | null = null;
  savingKey: string | null = null;

  transports: TransportOpt[] = [];

  editing: DeliveryRow | null = null;
  saving = false;
  form = {
    idTransport: null as number | null,
    trackingNumber: '',
    addressLine: '',
    city: '',
    postalCode: '',
    phone: '',
    deliveryFee: 0,
    note: '',
  };

  get pendingCount(): number  { return this.items.filter(d => d.status === 'Pending').length; }
  get transitCount(): number  { return this.items.filter(d => d.status === 'In Transit').length; }
  get deliveredCount(): number { return this.items.filter(d => d.status === 'Delivered').length; }

  constructor(private ordersService: OrdersService, private deliveriesService: DeliveriesService, private transportsService: TransportsService) {}

  ngOnInit(): void { this.load(); }

  rowKey(d: DeliveryRow): string {
    return d.idDelivery ? `d${d.idDelivery}` : `virtual-${d.idOrder}`;
  }

  // ─── Load ─────────────────────────────────────────────────────
  // ✅ CORRIGÉ — deux bugs de pagination silencieuse corrigés :
  // 1) getMyDeals()+getOrders() sans params -> remplacé par getMyOrders(),
  //    qui interroge /orders avec IdDeal + per_page=50 (cf. audit orders-ent).
  // 2) getDeliveries() sans params -> DeliveriesController::index() a aussi
  //    DEFAULT_PER_PAGE=10 sur TOUTE la table Deliveries, tous vendeurs
  //    confondus. On bascule sur getDeliveriesByOrder(IdOrder), qui utilise
  //    orderDeliveries() côté backend (Deliveries::where('IdOrder',...)->get(),
  //    sans pagination du tout).
  // 3) getOrderDetailsByOrder() -> getOrderDetailsResolved(), qui résout le
  //    produit manquant (OrderDetailsController::index() n'a pas de
  //    with('product'), confirmé sur le modèle : pas de $with par défaut).
  load(): void {
    this.loading = true;
    this.error = null;

    this.transportsService.getTransports(true).pipe(
      map((res: any) => res?.data ?? res ?? []),
      catchError(() => of([]))
    ).subscribe((transports: any[]) => {
      this.transports = (transports || []).map((t: any) => ({
        id:   +(t.IdTransport ?? 0),
        name:  (t.Name ?? 'Transport'),
        fee:  +(t.DeliveryFee ?? 0),
      })).filter((t: TransportOpt) => t.id > 0);

      this.ordersService.getAllSellerOrders().pipe(
        switchMap((myOrders: any[]) => {
          if (myOrders.length === 0) return of([] as DeliveryRow[]);

          // ✅ CORRIGÉ — getOrderDetailsResolved(o.IdOrder) interrogeait
          // GET /order-details?IdOrder=X SANS filtre vendeur : ça exposait
          // le nom des produits et les infos client des LIGNES D'AUTRES
          // VENDEURS sur une commande partagée. On réutilise o.details,
          // déjà scopé par getSellerOrders() côté backend.
          // ✅ AJOUTÉ — détection multi-vendeur via GET /orders/{id}
          // (Orders::with('details.product'), sans filtre), utilisée
          // uniquement comme flag booléen, jamais pour afficher les
          // données des autres vendeurs.
          const requests = myOrders.map((o: any) =>
            forkJoin({
              deliveries: this.deliveriesService.getDeliveriesByOrder(o.IdOrder).pipe(
                catchError(() => of([]))
              ),
              fullOrder: this.ordersService.getOrder(o.IdOrder).pipe(
                map((r: any) => r?.data ?? r ?? null),
                catchError(() => of(null))
              )
            }).pipe(
              map(({ deliveries, fullOrder }) => {
                const vendorIds = new Set(
                  (fullOrder?.details ?? [])
                    .map((d: any) => d.product?.IdUser)
                    .filter((id: any) => !!id)
                );
                const isMultiVendor = vendorIds.size > 1;
                return this.buildRowsForOrder(o, o.details ?? [], deliveries, isMultiVendor);
              })
            )
          );

          return forkJoin(requests).pipe(map((rowsPerOrder: DeliveryRow[][]) => rowsPerOrder.flat()));
        }),
        catchError(() => {
          this.error = 'Impossible de charger les livraisons.';
          return of([] as DeliveryRow[]);
        })
      ).subscribe((rows: DeliveryRow[]) => {
        this.items = rows.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        this.applyFilter();
        this.loading = false;
      });
    });
  }

  private buildRowsForOrder(order: any, details: any[], orderDeliveries: any[], isMultiVendor: boolean = false): DeliveryRow[] {
    const first = Array.isArray(details) && details.length > 0 ? details[0] : null;
    const clientName = first ? ([first.FirstName, first.LastName].filter(Boolean).join(' ') || first.Email || '—') : '—';
    const clientEmail = first?.Email ?? '';
    const products = Array.isArray(details)
      ? details.map(d => d.product?.TitleProduct ?? d.product?.title ?? d.product?.NameProduct ?? `#${d.IdProduct}`).join(', ')
      : '—';

    if (orderDeliveries.length === 0) {
      return [{
        idDelivery: null,
        idOrder: order.IdOrder,
        clientName,
        clientEmail,
        products,
        idTransport: null,
        transportName: '',
        trackingNumber: '',
        status: 'Pending',
        addressLine: first?.Address ?? '',
        city: '',
        postalCode: first?.ZipCode ?? '',
        phone: first?.Telephone ?? '',
        deliveryFee: 0,
        note: '',
        createdAt: order.DateTimeCommand ?? null,
        virtual: true,
        isMultiVendor,
      }];
    }

    return orderDeliveries.map((dl: any) => ({
      idDelivery: +(dl.IdDelivery ?? 0) || null,
      idOrder: order.IdOrder,
      clientName,
      clientEmail,
      products,
      idTransport: dl.IdTransport ?? null,
      transportName: this.transports.find(t => t.id === dl.IdTransport)?.name ?? '',
      trackingNumber: dl.TrackingNumber ?? '',
      status: (dl.Status as DeliveryStatus) ?? 'Pending',
      addressLine: dl.AddressLine ?? first?.Address ?? '',
      city: dl.City ?? '',
      postalCode: dl.PostalCode ?? first?.ZipCode ?? '',
      phone: dl.Phone ?? first?.Telephone ?? '',
      deliveryFee: +(dl.DeliveryFee ?? 0),
      note: dl.Note ?? '',
      createdAt: dl.CreatedAt ?? order.DateTimeCommand ?? null,
      virtual: false,
      isMultiVendor,
    }));
  }

  // ─── Filter ───────────────────────────────────────────────────
  applyFilter(): void {
    const s = this.search.trim().toLowerCase();
    this.filtered = this.items.filter(d => {
      if (s && !`${d.idOrder} ${d.clientName} ${d.trackingNumber}`.toLowerCase().includes(s)) return false;
      if (this.filter && d.status !== this.filter) return false;
      return true;
    });
  }
  setFilter(f: string): void { this.filter = f; this.applyFilter(); }

  // ─── Status change (auto-create si virtuelle) ──────────────────
  changeStatus(d: DeliveryRow, newStatus: DeliveryStatus): void {
    // ✅ AJOUTÉ — Deliveries n'a aucun lien vendeur/produit côté backend
    // et aucune vérification d'appartenance sur store/update/updateStatus :
    // sans cette garde, un vendeur pourrait modifier le colis créé par
    // un AUTRE vendeur sur une commande partagée. Correctif temporaire
    // en attendant l'ajout d'un IdVendor sur Deliveries côté backend.
    if (d.isMultiVendor) {
      alert("Cette commande contient des produits d'autres vendeurs. La gestion de livraison groupée n'est pas encore prise en charge — contactez l'administrateur.");
      return;
    }

    const key = this.rowKey(d);
    this.savingKey = key;
    const prevStatus = d.status;

    if (d.virtual || !d.idDelivery) {
      this.deliveriesService.createDelivery({ // TODO verify
        IdOrder: d.idOrder,
        IdTransport: d.idTransport,
        TrackingNumber: d.trackingNumber || null,
        Status: newStatus,
        AddressLine: d.addressLine,
        City: d.city,
        PostalCode: d.postalCode,
        Phone: d.phone,
        DeliveryFee: d.deliveryFee || 0,
        Note: d.note,
        CreatedAt: new Date().toISOString(),
      }).subscribe({
        next: (res: any) => {
          const created = res?.data ?? res;
          const id = +(created?.IdDelivery ?? 0);
          this.savingKey = null;
          if (id > 0) {
            d.idDelivery = id;
            d.virtual = false;
            d.status = newStatus;
            this.applyFilter();
          } else {
            d.status = prevStatus;
            alert('Création de la livraison impossible.');
          }
        },
        error: (err: any) => {
          this.savingKey = null;
          d.status = prevStatus;
          alert('Création impossible : ' + this.errMsg(err));
        }
      });
      return;
    }

    this.deliveriesService.updateDeliveryStatus(d.idDelivery, newStatus).subscribe({
      next: () => { this.savingKey = null; d.status = newStatus; this.applyFilter(); },
      error: (err: any) => {
        this.savingKey = null;
        d.status = prevStatus;
        alert('Mise à jour du statut impossible : ' + this.errMsg(err));
      }
    });
  }

  // ─── Edit modal ───────────────────────────────────────────────
  openEdit(d: DeliveryRow): void {
    this.editing = d;
    this.form = {
      idTransport:    d.idTransport,
      trackingNumber: d.trackingNumber,
      addressLine:    d.addressLine,
      city:           d.city,
      postalCode:     d.postalCode,
      phone:          d.phone,
      deliveryFee:    d.deliveryFee,
      note:           d.note,
    };
  }
  closeEdit(ev?: Event): void {
    this.editing = null;
    this.saving = false;
  }
  onTransportChange(): void {
    const t = this.transports.find(x => x.id === this.form.idTransport);
    if (t && (!this.form.deliveryFee || this.form.deliveryFee === 0)) {
      this.form.deliveryFee = t.fee;
    }
  }
  saveEdit(): void {
    if (!this.editing) return;
    const d = this.editing;
    this.saving = true;

    const payload: any = {
      IdOrder:        d.idOrder,
      Status:         d.status,
      IdTransport:    this.form.idTransport,
      TrackingNumber: this.form.trackingNumber,
      AddressLine:    this.form.addressLine,
      City:           this.form.city,
      PostalCode:     this.form.postalCode,
      Phone:          this.form.phone,
      DeliveryFee:    +this.form.deliveryFee || 0,
      Note:           this.form.note,
    };

    const after = () => { this.saving = false; this.closeEdit(); this.load(); };
    const onErr = (err: any) => { this.saving = false; alert('Enregistrement impossible : ' + this.errMsg(err)); };

    if (d.virtual || !d.idDelivery) {
      payload.CreatedAt = new Date().toISOString();
      this.deliveriesService.createDelivery(payload).subscribe({ next: after, error: onErr });
    } else {
      this.deliveriesService.updateDelivery(d.idDelivery, payload).subscribe({ next: after, error: onErr });
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────
  formatDate(d: string | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  statusColor(s: DeliveryStatus): string {
    switch (s) {
      case 'Delivered': return 'success';
      case 'In Transit': return 'info';
      case 'Failed': return 'danger';
      case 'Returned': return 'dark';
      default: return 'warning';
    }
  }
  private errMsg(err: any): string {
    return err?.error?.message || err?.message || `HTTP ${err?.status || '?'}`;
  }
}
