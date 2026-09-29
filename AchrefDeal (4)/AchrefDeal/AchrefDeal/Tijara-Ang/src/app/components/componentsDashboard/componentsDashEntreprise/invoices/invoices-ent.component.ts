import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { InvoicesService } from 'src/app/core/services/invoices.service';
import { DealsService } from 'src/app/core/services/deals.service';
import { OrdersService } from 'src/app/core/services/orders.service';

// Enum réel confirmé — InvoicesController: 'Pending' à la création (store()),
// 'Paid' via pay(), 'Cancelled' via cancel(). Pas d'autre valeur possible.
type InvoiceStatus = 'Pending' | 'Paid' | 'Cancelled';

interface InvoiceRow {
  idInvoice: number | null;
  number: string;
  idOrder: number;
  clientName: string;
  clientEmail: string;
  products: string;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  status: InvoiceStatus;
  issuedAt: string | null;
  paidAt: string | null;
  virtual: boolean; // commande sans facture émise pour l'instant
}

@Component({
  selector: 'app-invoices-ent',
  standalone: false,
  template: `
<app-breadcrumbs title="Factures" [breadcrumbItems]="breadcrumbItems"></app-breadcrumbs>

<!-- ═════ KPI ═════ -->
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
          <h3 class="mb-0 fw-bold text-success">{{ paidTotal | number:'1.0-0' }}</h3>
          <p class="mb-0 fs-12 text-muted">Encaissé (TND)</p>
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
          <h3 class="mb-0 fw-bold text-warning">{{ pendingTotal | number:'1.0-0' }}</h3>
          <p class="mb-0 fs-12 text-muted">En attente (TND)</p>
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
          <h3 class="mb-0 fw-bold text-info">{{ grandTotal | number:'1.0-0' }}</h3>
          <p class="mb-0 fs-12 text-muted">Chiffre d'affaires (TND)</p>
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
      <i class="ri-file-text-line me-2 text-primary"></i>Factures émises
      <span class="badge bg-primary-subtle text-primary ms-2">{{ filtered.length }}</span>
    </h6>
    <div class="input-group input-group-sm" style="max-width:240px">
      <span class="input-group-text bg-white border-end-0"><i class="ri-search-line"></i></span>
      <input type="text" class="form-control border-start-0"
             placeholder="N° facture, commande ou client…"
             [(ngModel)]="search" (input)="applyFilter()" />
    </div>
    <select class="form-select form-select-sm" style="max-width:160px"
            [(ngModel)]="statusFilter" (change)="applyFilter()">
      <option value="">Tous les statuts</option>
      <option value="Paid">Payées</option>
      <option value="Pending">En attente</option>
      <option value="Cancelled">Annulées</option>
    </select>
    <button class="btn btn-sm btn-light" (click)="exportCSV()" title="Exporter CSV">
      <i class="ri-file-excel-2-line text-success me-1"></i>Export
    </button>
  </div>

  <div class="card-body p-0">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-primary"></div>
        <p class="text-muted mt-2 mb-0 fs-13">Chargement…</p>
      </div>
    }
    @else if (filtered.length === 0 && items.length === 0) {
      <div class="text-center py-5">
        <i class="ri-file-list-line display-3 text-muted opacity-50 d-block"></i>
        <h5 class="mt-3 mb-1">Aucune facture émise</h5>
        <p class="text-muted mb-3">Les factures s'affichent ici dès qu'une de vos commandes en génère une.</p>
      </div>
    }
    @else if (filtered.length === 0) {
      <div class="text-center py-5">
        <i class="ri-search-line display-5 text-muted opacity-50"></i>
        <p class="text-muted mt-2">Aucun résultat avec ces filtres.</p>
      </div>
    }
    @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th class="ps-3">N° Facture</th>
              <th>Commande</th>
              <th>Client</th>
              <th>Date</th>
              <th class="text-end">Sous-total</th>
              <th class="text-end">TVA</th>
              <th class="text-end">Total</th>
              <th class="text-center">Statut</th>
              <th class="text-end pe-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (i of filtered; track i.idOrder) {
              <tr>
                <td class="ps-3">
                  <div class="fw-semibold text-primary fs-13">{{ i.number }}</div>
                  @if (i.virtual) {
                    <span class="badge bg-warning-subtle text-warning fs-10">À émettre</span>
                  }
                </td>
                <td class="fs-13">#{{ i.idOrder }}</td>
                <td class="fs-13">
                  {{ i.clientName || '—' }}
                  @if (i.products) {
                    <div class="fs-11 text-muted text-truncate" style="max-width:160px">{{ i.products }}</div>
                  }
                </td>
                <td class="fs-12 text-muted">{{ formatDate(i.issuedAt) }}</td>
                <td class="text-end fs-13">{{ i.subtotal | number:'1.2-2' }}</td>
                <td class="text-end fs-12 text-muted">{{ i.tax | number:'1.2-2' }}</td>
                <td class="text-end fw-bold text-success">{{ i.total | number:'1.2-2' }} TND</td>
                <td class="text-center">
                  <span class="badge rounded-pill" [class]="statusClass(i.status)">{{ statusLabel(i.status) }}</span>
                </td>
                <td class="text-end pe-3">
                  @if (i.virtual) {
                    <button class="btn btn-sm btn-outline-primary rounded-pill" (click)="generate(i)"
                            [disabled]="generatingId === i.idOrder">
                      @if (generatingId === i.idOrder) { <span class="spinner-border spinner-border-sm me-1"></span> }
                      @else { <i class="ri-file-add-line me-1"></i> }
                      Générer
                    </button>
                  } @else {
                    <span class="text-muted fs-12">Consultation</span>
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
export class InvoicesEntComponent implements OnInit {
  breadcrumbItems = [{ label: 'Vendor', active: false }, { label: 'Factures', active: true }];

  items: InvoiceRow[] = [];
  filtered: InvoiceRow[] = [];
  search = '';
  statusFilter = '';
  loading = true;
  error: string | null = null;
  generatingId: number | null = null;
  downloadingId: number | null = null;

  get paidTotal(): number    { return this.items.filter(i => i.status === 'Paid').reduce((s, i) => s + i.total, 0); }
  get pendingTotal(): number { return this.items.filter(i => i.status === 'Pending').reduce((s, i) => s + i.total, 0); }
  get grandTotal(): number   { return this.items.filter(i => i.status !== 'Cancelled').reduce((s, i) => s + i.total, 0); }

  constructor(private invoicesService: InvoicesService, private dealsService: DealsService, private ordersService: OrdersService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = null;

    // Une seule requête pour les vraies factures : index() eager-load déjà
    // user/vendor/order/order.details.product, pas besoin de N+1 ici.
    this.invoicesService.getMyVendorInvoices().pipe(
      map((raw: any[]) => (Array.isArray(raw) ? raw : []).map(inv => this.mapInvoice(inv))),
      switchMap((invoiceRows: InvoiceRow[]) => {
        // Pour proposer "Générer" sur les commandes qui n'ont pas encore de
        // facture : mes deals -> mes commandes -> celles non couvertes.
        return this.dealsService.getMyDeals().pipe(
          map((res: any) => {
            const list: any[] = res?.data ?? res ?? [];
            return (Array.isArray(list) ? list : []).map(d => d.idDeal ?? d.IdDeal ?? d.id);
          }),
          switchMap((myDealIds: number[]) => {
            if (myDealIds.length === 0) return of(invoiceRows);
            return this.ordersService.getSellerOrders().pipe(
              map((res: any) => {
                const list: any[] = res?.data ?? res ?? [];
                return (Array.isArray(list) ? list : []).filter(o => myDealIds.includes(o.IdDeal));
              }),
              map((myOrders: any[]) => {
                const covered = new Set(invoiceRows.map(r => r.idOrder));
                const virtuals: InvoiceRow[] = myOrders
                  .filter(o => !covered.has(o.IdOrder))
                  .map(o => ({
                    idInvoice: null,
                    number: `PRÉ-${String(o.IdOrder).padStart(4, '0')}`,
                    idOrder: o.IdOrder,
                    clientName: '',
                    clientEmail: '',
                    products: '',
                    subtotal: 0,
                    tax: 0,
                    deliveryFee: 0,
                    total: 0,
                    status: 'Pending' as InvoiceStatus,
                    issuedAt: o.DateTimeCommand ?? null,
                    paidAt: null,
                    virtual: true,
                  }));
                return [...invoiceRows, ...virtuals];
              }),
              catchError(() => of(invoiceRows))
            );
          }),
          catchError(() => of(invoiceRows))
        );
      }),
      catchError(() => {
        this.error = 'Impossible de charger les factures.';
        return of([] as InvoiceRow[]);
      })
    ).subscribe((rows: InvoiceRow[]) => {
      this.items = rows.sort((a, b) => new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime());
      this.applyFilter();
      this.loading = false;
    });
  }

  private mapInvoice(inv: any): InvoiceRow {
    const details: any[] = inv.order?.details ?? [];
    const firstDetail = details.length > 0 ? details[0] : null;

    // Nom client : d'abord Invoices.user (relation Users), sinon retombe sur
    // les coordonnées stockées par ligne dans OrderDetails.
    const clientName = (inv.user?.NameUser
      ?? (firstDetail ? [firstDetail.FirstName, firstDetail.LastName].filter(Boolean).join(' ') : ''))
      || '—';
    const clientEmail = inv.user?.Email ?? firstDetail?.Email ?? '';

    const products = details
      .map(d => d.product?.NameProduct ?? d.product?.name ?? `#${d.IdProduct}`)
      .join(', ');

    return {
      idInvoice: +(inv.IdInvoice ?? 0) || null,
      number: inv.Number ?? '',
      idOrder: +(inv.IdOrder ?? 0),
      clientName,
      clientEmail,
      products,
      subtotal: +(inv.Subtotal ?? 0),
      tax: +(inv.Tax ?? 0),
      deliveryFee: +(inv.DeliveryFee ?? 0),
      total: +(inv.Total ?? 0),
      status: (inv.Status as InvoiceStatus) ?? 'Pending',
      issuedAt: inv.IssuedAt ?? null,
      paidAt: inv.PaidAt ?? null,
      virtual: false,
    };
  }

  applyFilter(): void {
    const s = this.search.trim().toLowerCase();
    this.filtered = this.items.filter(i => {
      if (s && !`${i.number} ${i.idOrder} ${i.clientName}`.toLowerCase().includes(s)) return false;
      if (this.statusFilter && i.status !== this.statusFilter) return false;
      return true;
    });
  }

  generate(i: InvoiceRow): void {
    this.generatingId = i.idOrder;
    // PaymentMethod requis par le validateur backend ; 'Cash' par défaut.
    // Note : Discount/DiscountType/PaymentMethod/PaymentTerms ne sont pas
    // persistés côté back (pas dans le fillable), seul le calcul du total
    // en dépend au moment de la création.
    this.invoicesService.generateInvoiceFromOrder(i.idOrder, 'Cash').subscribe({
      next: () => { this.generatingId = null; this.load(); },
      error: (err: any) => {
        this.generatingId = null;
        alert('Génération impossible : ' + this.errMsg(err));
      },
    });
  }

 markPaid(i: InvoiceRow): void {
  if (i.virtual || !i.idInvoice) return;
  this.invoicesService.markInvoicePaid(i.idInvoice).subscribe({
    next: () => { i.status = 'Paid'; this.applyFilter(); },
    error: (err: any) => alert('Mise à jour impossible : ' + this.errMsg(err)),
  });
}

  cancel(i: InvoiceRow): void {
    if (i.virtual || !i.number) return;
    if (!confirm(`Annuler la facture ${i.number} ?`)) return;
    this.invoicesService.cancelInvoice(i.number).subscribe({
      next: () => { i.status = 'Cancelled'; this.applyFilter(); },
      error: (err: any) => alert('Annulation impossible : ' + this.errMsg(err)),
    });
  }

  downloadPdf(i: InvoiceRow): void {
    if (!i.idInvoice) return;
    this.downloadingId = i.idInvoice;
    this.invoicesService.downloadInvoicePdf(i.idInvoice).subscribe({
      next: (blob: Blob) => {
        this.downloadingId = null;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${i.number || 'facture'}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        this.downloadingId = null;
        alert('Téléchargement impossible : ' + this.errMsg(err));
      }
    });
  }

  exportCSV(): void {
    const header = 'N°,Commande,Client,Date,Sous-total,TVA,Total,Statut\n';
    const rows = this.filtered.map(i =>
      [i.number, i.idOrder, `"${i.clientName}"`, this.formatDate(i.issuedAt), i.subtotal, i.tax, i.total, i.status].join(',')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `factures-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  formatDate(d: string | null): string {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  statusLabel(s: InvoiceStatus): string {
    return s === 'Paid' ? 'Payée' : s === 'Cancelled' ? 'Annulée' : 'En attente';
  }
  statusClass(s: InvoiceStatus): string {
    return s === 'Paid' ? 'bg-success-subtle text-success'
         : s === 'Cancelled' ? 'bg-danger-subtle text-danger'
         : 'bg-warning-subtle text-warning';
  }
    private errMsg(err: any): string {
    return err?.error?.message || err?.message || `HTTP ${err?.status || '?'}`;
  }
}
