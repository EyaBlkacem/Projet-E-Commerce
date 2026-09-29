import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { InvoicesService } from 'src/app/core/services/invoices.service';
import { OrdersService } from 'src/app/core/services/orders.service';

interface InvoiceRow {
  idInvoice: number | null;
  number: string;
  idOrder: number;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  status: string;
  issuedAt: string | null;
  virtual: boolean;
}

@Component({
  selector: 'app-my-invoices-user',
  standalone: false,
  template: `
<app-breadcrumbs title="Mes factures" [breadcrumbItems]="breadcrumbItems"></app-breadcrumbs>

<!-- â•â•â•â•â• KPI Cards â•â•â•â•â• -->
<div class="row g-3 mb-4">
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid var(--vz-primary)">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-primary-subtle d-flex align-items-center justify-content-center">
          <i class="ri-file-text-line fs-22 text-primary"></i>
        </div>
        <div>
          <h3 class="mb-0 fw-bold text-primary">{{ items.length }}</h3>
          <p class="mb-0 fs-12 text-muted">Total factures</p>
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
          <h3 class="mb-0 fw-bold text-success">{{ paidCount }}</h3>
          <p class="mb-0 fs-12 text-muted">PayÃ©es</p>
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
          <p class="mb-0 fs-12 text-muted">En attente</p>
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
          <h3 class="mb-0 fw-bold text-info">{{ totalAmount | number:'1.0-0' }}</h3>
          <p class="mb-0 fs-12 text-muted">Montant total (TND)</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- â•â•â•â•â• Toolbar â•â•â•â•â• -->
<div class="card border-0 shadow-sm">
  <div class="card-header bg-transparent py-3 d-flex flex-wrap align-items-center gap-2">
    <h6 class="mb-0 fw-semibold flex-grow-1">
      <i class="ri-file-text-line me-2 text-primary"></i>Mes factures
      <span class="badge bg-primary-subtle text-primary ms-2">{{ filtered.length }}</span>
    </h6>
    <select class="form-select form-select-sm" style="max-width:160px"
            [(ngModel)]="statusFilter" (change)="applyFilter()">
      <option value="">Tous les statuts</option>
      <option value="paid">PayÃ©es</option>
      <option value="issued">Ã‰mises</option>
      <option value="pending">En attente</option>
      <option value="cancelled">AnnulÃ©es</option>
    </select>
  </div>

  <!-- Barre de recherche, tri, pagination (composant partagÃ©) -->
  <div class="card-body pb-0">
    <app-search-pagination-bar
      [(searchInput)]="search"
      searchPlaceholder="NÂ° facture ou commandeâ€¦"
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

  <div class="card-body p-0 pt-2">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-primary"></div>
        <p class="text-muted mt-2 mb-0 fs-13">Chargementâ€¦</p>
      </div>
    }
    @else if (filtered.length === 0 && items.length === 0) {
      <div class="text-center py-5">
        <i class="ri-file-list-line display-3 text-muted opacity-50 d-block"></i>
        <h5 class="mt-3 mb-1">Aucune facture pour le moment</h5>
        <p class="text-muted mb-3">Passez votre premiÃ¨re commande pour recevoir une facture Ã©lectronique.</p>
        <a routerLink="/shop/products" class="btn btn-primary">
          <i class="ri-shopping-bag-3-line me-1"></i>Parcourir la boutique
        </a>
      </div>
    }
    @else if (filtered.length === 0) {
      <div class="text-center py-5">
        <i class="ri-search-line display-5 text-muted opacity-50"></i>
        <p class="text-muted mt-2">Aucun rÃ©sultat avec ces filtres.</p>
      </div>
    }
    @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th class="ps-3">NÂ° Facture</th>
              <th>Commande</th>
              <th>Date</th>
              <th class="text-end">Sous-total</th>
              <th class="text-end">TVA</th>
              <th class="text-end">Total</th>
              <th class="text-center">Statut</th>
              <th class="text-end pe-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (i of paginatedItems; track i.idOrder) {
              <tr>
                <td class="ps-3">
                  <div class="fw-semibold text-primary fs-13">{{ i.number }}</div>
                  @if (i.virtual) {
                    <span class="badge bg-warning-subtle text-warning fs-10 mt-1">Ã€ Ã©mettre</span>
                  }
                </td>
                <td class="fs-13">#{{ i.idOrder }}</td>
                <td class="fs-12 text-muted">{{ formatDate(i.issuedAt) }}</td>
                <td class="text-end fs-13">{{ i.subtotal | number:'1.2-2' }} TND</td>
                <td class="text-end fs-12 text-muted">{{ i.tax | number:'1.2-2' }}</td>
                <td class="text-end fw-bold text-success">{{ i.total | number:'1.2-2' }} TND</td>
                <td class="text-center">
                  <span class="badge rounded-pill" [class]="statusClass(i.status)">{{ statusLabel(i.status) }}</span>
                </td>
                <td class="text-end pe-3">
                  @if (i.virtual) {
                    <button class="btn btn-sm btn-outline-primary rounded-pill" (click)="generate(i)"
                            [disabled]="generatingId === i.idOrder">
                      @if (generatingId === i.idOrder) {
                        <span class="spinner-border spinner-border-sm me-1"></span>
                      } @else {
                        <i class="ri-file-add-line me-1"></i>
                      }
                      GÃ©nÃ©rer
                    </button>
                  } @else {
                    <button class="btn btn-sm btn-light" (click)="print(i)" title="Imprimer">
                      <i class="ri-printer-line text-primary"></i>
                    </button>
                    <button class="btn btn-sm btn-light ms-1" (click)="download(i)" title="TÃ©lÃ©charger PDF">
                      <i class="ri-download-line text-success"></i>
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>
</div>
`,
})
export class MyInvoicesUserComponent implements OnInit {
  breadcrumbItems = [{ label: 'Tijara', active: false }, { label: 'Mes factures', active: true }];

  items: InvoiceRow[] = [];
  filtered: InvoiceRow[] = [];
  search = '';
  statusFilter = '';
  loading = true;
  generatingId: number | null = null;

  // â”€â”€â”€ Recherche, tri & pagination (via SearchPaginationBarComponent) â”€â”€â”€
  sortBy: 'recent' | 'oldest' | 'amount' = 'recent';
  sortOptions = [
    { value: 'recent', label: 'Plus rÃ©centes' },
    { value: 'oldest', label: 'Plus anciennes' },
    { value: 'amount', label: 'Montant le plus Ã©levÃ©' },
  ];
  currentPage = 1;
  pageSize = 8;

  get paidCount(): number    { return this.items.filter(i => i.status === 'paid').length; }
  get pendingCount(): number { return this.items.filter(i => i.status === 'pending' || i.virtual).length; }
  get totalAmount(): number  { return this.items.reduce((s, i) => s + (i.total || 0), 0); }

  constructor(private invoicesService: InvoicesService, private ordersService: OrdersService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    forkJoin({
      invoices: this.invoicesService.getInvoices().pipe(catchError(() => of([] as any[]))),
      orders:   this.ordersService.getMyOrdersDynamic().pipe(catchError(() => of([] as any[]))),
    }).subscribe(({ invoices, orders }) => {
      const invs: InvoiceRow[] = (invoices || []).map((i: any) => ({
        idInvoice:   i.idInvoice ?? i.IdInvoice ?? null,
        number:      i.number    ?? i.Number ?? `FAC-${i.idInvoice ?? ''}`,
        idOrder:     +(i.idOrder ?? i.IdOrder ?? 0),
        subtotal:    +(i.subtotal ?? i.Subtotal ?? 0),
        tax:         +(i.tax ?? i.Tax ?? 0),
        deliveryFee: +(i.deliveryFee ?? i.DeliveryFee ?? 0),
        total:       +(i.total ?? i.Total ?? 0),
        status:      i.status ?? i.Status ?? 'issued',
        issuedAt:    i.issuedAt ?? i.IssuedAt ?? null,
        virtual:     false,
      }));

      const invoicedOrderIds = new Set(invs.map(i => i.idOrder));

      const virtualRows: InvoiceRow[] = (orders || [])
        .filter((o: any) => !invoicedOrderIds.has(+o.id))
        .map((o: any) => {
          const subtotal = +(o.total_amount || o.totalAmount || 0);
          const tax = +(subtotal * 0.07).toFixed(3);
          const deliveryFee = 0;
          return {
            idInvoice:   null,
            number:      `PRÃ‰-${String(o.id).padStart(4, '0')}`,
            idOrder:     +o.id,
            subtotal,
            tax,
            deliveryFee,
            total:       +(subtotal + tax + deliveryFee).toFixed(3),
            status:      o.status === 'cancelled' ? 'cancelled' : 'pending',
            issuedAt:    o.created_at || null,
            virtual:     true,
          };
        });

      this.items = [...invs, ...virtualRows]
        .sort((a, b) => new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime());
      this.applyFilter();
      this.loading = false;
    });
  }

  applyFilter(): void {
    const s = this.search.trim().toLowerCase();
    let list = this.items.filter(i => {
      if (s && !`${i.number} ${i.idOrder}`.toLowerCase().includes(s)) return false;
      if (this.statusFilter && i.status !== this.statusFilter) return false;
      return true;
    });

    switch (this.sortBy) {
      case 'recent': list = list.sort((a, b) => new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime()); break;
      case 'oldest': list = list.sort((a, b) => new Date(a.issuedAt || 0).getTime() - new Date(b.issuedAt || 0).getTime()); break;
      case 'amount': list = list.sort((a, b) => (b.total || 0) - (a.total || 0)); break;
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

  get paginatedItems(): InvoiceRow[] {
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

  generate(i: InvoiceRow): void {
    this.generatingId = i.idOrder;
    this.invoicesService.generateInvoiceFromOrder(i.idOrder).subscribe({
      next: () => { this.generatingId = null; this.load(); },
      error: () => {
        this.generatingId = null;
        alert("Impossible de gÃ©nÃ©rer la facture pour le moment.");
      },
    });
  }

  print(i: InvoiceRow): void {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(this.buildInvoiceHtml(i));
    w.document.close();
    setTimeout(() => w.print(), 350);
  }

  download(i: InvoiceRow): void {
    const html = this.buildInvoiceHtml(i);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${i.number}.html`; a.click();
    URL.revokeObjectURL(url);
  }

  private buildInvoiceHtml(i: InvoiceRow): string {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Facture ${i.number}</title>
<style>
  *{box-sizing:border-box} body{font-family:Arial,sans-serif;padding:40px;color:#333;max-width:820px;margin:auto}
  .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #405189;padding-bottom:20px;margin-bottom:30px}
  .logo{font-size:32px;font-weight:bold;color:#405189}
  .logo span{color:#0ab39c}
  .meta{text-align:right;font-size:13px;color:#666}
  h2{color:#405189;margin:0 0 10px}
  .info{display:flex;justify-content:space-between;margin-bottom:30px;font-size:13px}
  .info h4{margin:0 0 8px;color:#405189;font-size:14px;text-transform:uppercase}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th,td{padding:12px;border-bottom:1px solid #eee;text-align:left;font-size:13px}
  th{background:#f5f7fb;color:#405189;text-transform:uppercase;font-size:11px}
  .total-row td{border:none;padding:8px 12px;font-size:15px}
  .total-row.grand td{font-size:20px;font-weight:bold;color:#0ab39c;border-top:2px solid #405189;padding-top:14px}
  .footer{margin-top:50px;padding-top:20px;border-top:1px solid #eee;font-size:11px;color:#888;text-align:center}
</style></head><body>
<div class="header">
  <div class="logo">ðŸ›ï¸ Tijara<span>.tn</span></div>
  <div class="meta">
    <div><strong>Facture ${i.number}</strong></div>
    <div>Ã‰mise le ${this.formatDate(i.issuedAt) || 'â€”'}</div>
    <div>Statut : <strong>${this.statusLabel(i.status)}</strong></div>
  </div>
</div>
<div class="info">
  <div>
    <h4>Vendeur</h4>
    Tijara Marketplace<br>Tunis, Tunisie<br>TVA: TN12345678
  </div>
  <div style="text-align:right">
    <h4>Commande</h4>
    RÃ©fÃ©rence : <strong>#${i.idOrder}</strong>
  </div>
</div>
<table>
  <thead><tr><th>Description</th><th style="text-align:right">Montant</th></tr></thead>
  <tbody>
    <tr><td>Sous-total produits</td><td style="text-align:right">${i.subtotal.toFixed(3)} TND</td></tr>
    <tr><td>TVA (7%)</td><td style="text-align:right">${i.tax.toFixed(3)} TND</td></tr>
    <tr><td>Frais de livraison</td><td style="text-align:right">${i.deliveryFee.toFixed(3)} TND</td></tr>
    <tr class="total-row grand"><td>TOTAL Ã€ PAYER</td><td style="text-align:right">${i.total.toFixed(3)} TND</td></tr>
  </tbody>
</table>
<div class="footer">Merci de votre confiance â€” Tijara.tn Â· contact@tijara.tn Â· +216 71 000 000</div>
</body></html>`;
  }

  formatDate(d: string | null): string {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  statusLabel(s: string): string {
    return s === 'paid' ? 'PayÃ©e'
         : s === 'cancelled' ? 'AnnulÃ©e'
         : s === 'pending' ? 'En attente'
         : 'Ã‰mise';
  }
  statusClass(s: string): string {
    return s === 'paid' ? 'bg-success-subtle text-success'
         : s === 'cancelled' ? 'bg-danger-subtle text-danger'
         : s === 'pending' ? 'bg-warning-subtle text-warning'
         : 'bg-info-subtle text-info';
  }
}