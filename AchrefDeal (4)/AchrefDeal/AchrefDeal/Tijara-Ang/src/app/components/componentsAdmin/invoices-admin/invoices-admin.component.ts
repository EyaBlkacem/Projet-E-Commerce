import { Component, OnInit } from '@angular/core';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { InvoicesService } from 'src/app/core/services/invoices.service';

interface InvoiceRow {
  idInvoice: number;
  number: string;
  idOrder: number;
  type: 'client' | 'vendor';
  clientName: string;
  clientEmail: string;
  vendorName: string;
  dealTitle: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  issuedAt: string | null;
  paidAt: string | null;
}

type SortField = 'number' | 'idOrder' | 'clientName' | 'vendorName' | 'issuedAt' | 'subtotal' | 'tax' | 'total' | 'status' | '';

@Component({
  selector: 'app-invoices-admin',
  standalone: false,
  template: `
<div class="factures-page">

  <!-- ===== En-tête ===== -->
  <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
    <div>
      <h2 class="fw-bold mb-1">Factures</h2>
      <p class="text-muted mb-0">Gérez, suivez et analysez toutes vos factures</p>
    </div>
    <div class="d-flex align-items-center gap-2">
      <div class="btn-group">
        <button class="btn btn-primary fw-semibold" (click)="newInvoice()">
          <i class="ri-add-line me-1"></i>Nouvelle facture
        </button>
        <button type="button" class="btn btn-primary dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
          <span class="visually-hidden">Options</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><a class="dropdown-item" (click)="newInvoice()"><i class="ri-file-add-line me-2"></i>Facture standard</a></li>
          <li><a class="dropdown-item" (click)="newInvoice()"><i class="ri-repeat-line me-2"></i>Facture récurrente</a></li>
        </ul>
      </div>
      <button class="btn btn-light fw-semibold" (click)="newDevis()">
        <i class="ri-add-line me-1"></i>Nouveau devis
      </button>
      <button class="btn btn-light fw-semibold" (click)="importInvoices()">
        <i class="ri-upload-2-line me-1"></i>Importer
      </button>
    </div>
  </div>

  <!-- ===== Cartes statistiques ===== -->
  <div class="row g-3 mb-3">
    <div class="col-6 col-lg-3">
      <div class="stat-card stat-purple">
        <div class="stat-icon"><i class="ri-file-text-line"></i></div>
        <div class="stat-body">
          <p class="stat-label">Total factures</p>
          <h3 class="stat-value">{{ items.length }}</h3>
          <span class="stat-trend"><i class="ri-arrow-up-line"></i> +{{ invoicesThisMonthCount }} ce mois</span>
        </div>
        <svg class="stat-spark" viewBox="0 0 100 34" preserveAspectRatio="none">
          <polyline points="0,28 15,24 30,26 45,16 60,18 75,8 100,4" fill="none" class="spark-line" stroke-width="2"/>
        </svg>
      </div>
    </div>
    <div class="col-6 col-lg-3">
      <div class="stat-card stat-green">
        <div class="stat-icon"><i class="ri-bank-card-line"></i></div>
        <div class="stat-body">
          <p class="stat-label">Encaissé (TND)</p>
          <h3 class="stat-value">{{ paidTotal | number:'1.0-0' }}</h3>
          <span class="stat-trend"><i class="ri-arrow-up-line"></i> {{ paidThisMonthTotal | number:'1.0-0' }} ce mois</span>
        </div>
        <svg class="stat-spark" viewBox="0 0 100 34" preserveAspectRatio="none">
          <polyline points="0,26 15,22 30,24 45,14 60,20 75,10 100,6" fill="none" class="spark-line" stroke-width="2"/>
        </svg>
      </div>
    </div>
    <div class="col-6 col-lg-3">
      <div class="stat-card stat-orange">
        <div class="stat-icon"><i class="ri-time-line"></i></div>
        <div class="stat-body">
          <p class="stat-label">En attente (TND)</p>
          <h3 class="stat-value">{{ pendingTotal | number:'1.0-0' }}</h3>
          <span class="stat-trend stat-trend-down"><i class="ri-arrow-down-line"></i> {{ pendingCount }} facture(s)</span>
        </div>
        <svg class="stat-spark" viewBox="0 0 100 34" preserveAspectRatio="none">
          <polyline points="0,10 15,18 30,14 45,22 60,16 75,24 100,20" fill="none" class="spark-line" stroke-width="2"/>
        </svg>
      </div>
    </div>
    <div class="col-6 col-lg-3">
      <div class="stat-card stat-blue">
        <div class="stat-icon"><i class="ri-money-dollar-circle-line"></i></div>
        <div class="stat-body">
          <p class="stat-label">CA total (TND)</p>
          <h3 class="stat-value">{{ grandTotal | number:'1.0-0' }}</h3>
          <span class="stat-trend"><i class="ri-arrow-up-line"></i> {{ grandTotalThisMonth | number:'1.0-0' }} ce mois</span>
        </div>
        <svg class="stat-spark" viewBox="0 0 100 34" preserveAspectRatio="none">
          <polyline points="0,24 15,20 30,22 45,12 60,16 75,6 100,10" fill="none" class="spark-line" stroke-width="2"/>
        </svg>
      </div>
    </div>
  </div>

  <!-- ===== Chips de statut ===== -->
  <div class="chip-strip mb-3">
    <button class="chip-item" [class.active]="statusFilter===''" (click)="setStatusFilter('')">
      <span class="chip-ico chip-ico-all"><i class="ri-grid-line"></i></span>
      <span class="chip-label">Tous</span>
      <span class="chip-count">{{ items.length }}</span>
    </button>
    <span class="chip-divider"></span>
    <button class="chip-item" [class.active]="statusFilter==='pending'" (click)="setStatusFilter('pending')">
      <span class="chip-ico chip-ico-pending"><i class="ri-time-line"></i></span>
      <span class="chip-label">En attente</span>
      <span class="chip-count">{{ countByStatus('pending') }}</span>
    </button>
    <span class="chip-divider"></span>
    <button class="chip-item" [class.active]="statusFilter==='paid'" (click)="setStatusFilter('paid')">
      <span class="chip-ico chip-ico-paid"><i class="ri-checkbox-circle-line"></i></span>
      <span class="chip-label">Payée</span>
      <span class="chip-count">{{ countByStatus('paid') }}</span>
    </button>
    <span class="chip-divider"></span>
    <button class="chip-item" [class.active]="statusFilter==='partial'" (click)="setStatusFilter('partial')">
      <span class="chip-ico chip-ico-partial"><i class="ri-pie-chart-2-line"></i></span>
      <span class="chip-label">Partiellement payée</span>
      <span class="chip-count">{{ countByStatus('partial') }}</span>
    </button>
    <span class="chip-divider"></span>
    <button class="chip-item" [class.active]="statusFilter==='cancelled'" (click)="setStatusFilter('cancelled')">
      <span class="chip-ico chip-ico-cancelled"><i class="ri-close-circle-line"></i></span>
      <span class="chip-label">Annulée</span>
      <span class="chip-count">{{ countByStatus('cancelled') }}</span>
    </button>
  </div>

  <!-- ===== Filtre Client / Vendeur ===== -->
  <div class="btn-group btn-group-sm mb-3">
    <button class="btn" [class.btn-primary]="typeFilter===''" [class.btn-outline-primary]="typeFilter!==''" (click)="setTypeFilter('')">Toutes</button>
    <button class="btn" [class.btn-primary]="typeFilter==='client'" [class.btn-outline-primary]="typeFilter!=='client'" (click)="setTypeFilter('client')">Factures client</button>
    <button class="btn" [class.btn-primary]="typeFilter==='vendor'" [class.btn-outline-primary]="typeFilter!=='vendor'" (click)="setTypeFilter('vendor')">Factures vendeur</button>
  </div>

  <!-- ===== Table ===== -->
  <div class="card border-0 shadow-sm">
    <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2 py-3">
      <div class="input-group input-group-sm flex-grow-1" style="max-width:280px">
        <span class="input-group-text bg-white border-end-0"><i class="ri-search-line"></i></span>
        <input type="text" class="form-control border-start-0" placeholder="N°, client, vendeur…"
               [(ngModel)]="search" (input)="onSearchChange()" />
      </div>

      <div class="date-range-group">
        <i class="ri-calendar-line text-muted ms-2 me-1"></i>
        <input type="date" class="date-input" [(ngModel)]="dateFrom" (change)="load()" />
        <span class="text-muted">–</span>
        <input type="date" class="date-input" [(ngModel)]="dateTo" (change)="load()" />
      </div>

      <div class="ms-auto d-flex align-items-center gap-2">
        <button class="btn btn-sm btn-light" (click)="resetFilters()" title="Réinitialiser les filtres">
          <i class="ri-filter-3-line me-1"></i>Filtres
        </button>
        <button class="btn btn-sm btn-light" (click)="exportCSV()" title="Export CSV">
          <i class="ri-file-excel-2-line text-success me-1"></i>Exporter
        </button>
      </div>
    </div>

    <div class="card-body p-0">
      @if (loading) {
        <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      } @else if (items.length === 0 && !loading) {
        <div class="text-center py-5">
          <i class="ri-file-list-line display-3 text-muted opacity-50"></i>
          <p class="text-muted mt-2 mb-0">Aucune facture ne correspond.</p>
        </div>
      } @else {
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3 sortable" (click)="sortBy('number')">N° Facture <i [class]="sortIcon('number')"></i></th>
                <th class="sortable" (click)="sortBy('idOrder')">Commande <i [class]="sortIcon('idOrder')"></i></th>
                <th class="sortable" (click)="sortBy('clientName')">Client <i [class]="sortIcon('clientName')"></i></th>
                <th class="sortable" (click)="sortBy('vendorName')">Vendeur <i [class]="sortIcon('vendorName')"></i></th>
                <th class="sortable" (click)="sortBy('issuedAt')">Date <i [class]="sortIcon('issuedAt')"></i></th>
                <th class="text-end sortable" (click)="sortBy('subtotal')">Sous-total <i [class]="sortIcon('subtotal')"></i></th>
                <th class="text-end sortable" (click)="sortBy('tax')">TVA <i [class]="sortIcon('tax')"></i></th>
                <th class="text-end sortable" (click)="sortBy('total')">Total <i [class]="sortIcon('total')"></i></th>
                <th class="text-center sortable" (click)="sortBy('status')">Statut <i [class]="sortIcon('status')"></i></th>
                <th class="text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (i of items; track i.idInvoice) {
                <tr>
                  <td class="ps-3 fw-semibold text-primary fs-13">
                    {{ i.number }}
                    <span class="badge rounded-pill ms-1" [class]="i.type === 'vendor' ? 'bg-warning-subtle text-warning' : 'bg-primary-subtle text-primary'">
                      {{ i.type === 'vendor' ? 'Vendeur' : 'Client' }}
                    </span>
                  </td>
                  <td class="fs-13">#{{ i.idOrder }}</td>
                  <td>
                    <div class="fs-13">{{ i.clientName || '—' }}</div>
                    @if (i.clientEmail) { <div class="fs-11 text-muted">{{ i.clientEmail }}</div> }
                  </td>
                  <td class="fs-12 text-muted">{{ i.vendorName || '—' }}</td>
                  <td class="fs-12 text-muted">{{ formatDate(i.issuedAt) }}</td>
                  <td class="text-end fs-13">{{ i.subtotal | number:'1.2-2' }}</td>
                  <td class="text-end fs-12 text-muted">{{ i.tax | number:'1.2-2' }}</td>
                  <td class="text-end fw-bold text-success">{{ i.total | number:'1.2-2' }} TND</td>
                  <td class="text-center">
                    <span class="badge rounded-pill" [class]="statusClass(i.status)">{{ statusLabel(i.status) }}</span>
                  </td>
                  <td class="text-end pe-3">
                    <button class="btn btn-sm btn-light" (click)="viewInvoice(i)" title="Aperçu">
                      <i class="ri-eye-line text-muted"></i>
                    </button>
                    <button class="btn btn-sm btn-light ms-1" (click)="print(i)" title="Imprimer">
                      <i class="ri-printer-line text-primary"></i>
                    </button>
                    <div class="btn-group ms-1">
                      <button class="btn btn-sm btn-light" data-bs-toggle="dropdown" title="Plus d'actions">
                        <i class="ri-more-2-fill text-muted"></i>
                      </button>
                      <ul class="dropdown-menu dropdown-menu-end">
                        @if (i.status !== 'paid' && i.status !== 'cancelled') {
                          <li><a class="dropdown-item" (click)="markPaid(i)"><i class="ri-check-line text-success me-2"></i>Marquer payée</a></li>
                        }
                        <li><a class="dropdown-item" (click)="print(i)"><i class="ri-download-2-line me-2"></i>Télécharger PDF</a></li>
                      </ul>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (!loading && items.length > 0) {
      <div class="card-footer bg-transparent d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
        <span class="text-muted fs-13">Affichage de {{ rangeStart }} à {{ rangeEnd }} sur {{ totalCount }} factures</span>
        <div class="d-flex align-items-center gap-2">
          <button class="btn btn-sm btn-light" [disabled]="currentPage===1" (click)="setPage(currentPage-1)">
            <i class="ri-arrow-left-s-line"></i>
          </button>
          @for (p of pageNumbers; track p) {
            <button class="btn btn-sm" [class.btn-primary]="p===currentPage" [class.btn-light]="p!==currentPage" (click)="setPage(p)">{{ p }}</button>
          }
          <button class="btn btn-sm btn-light" [disabled]="currentPage===totalPages" (click)="setPage(currentPage+1)">
            <i class="ri-arrow-right-s-line"></i>
          </button>
        </div>
        <select class="form-select form-select-sm" style="max-width:120px" [(ngModel)]="pageSize" (change)="changePageSize(pageSize)">
          <option [ngValue]="10">10 / page</option>
          <option [ngValue]="25">25 / page</option>
          <option [ngValue]="50">50 / page</option>
        </select>
      </div>
    }
  </div>
</div>
`,
  styles: [`
.factures-page { padding-bottom: 1rem; }

/* ---- Stat cards : blanches avec accent coloré ---- */
.stat-card {
  position: relative;
  border-radius: 18px;
  padding: 18px 20px;
  min-height: 118px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fff;
  border: 1px solid #eef0f5;
  box-shadow: 0 3px 10px -4px rgba(20,20,50,.08);
  transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
  cursor: default;
}
.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 28px -10px rgba(20,20,50,.16);
}
.stat-card::after {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  border-radius: 18px 0 0 18px;
  opacity: 0;
  transition: opacity .22s ease;
}
.stat-card:hover::after { opacity: 1; }

.stat-purple::after { background: #6249e8; }
.stat-green::after  { background: #0ab39c; }
.stat-orange::after { background: #f7a53b; }
.stat-blue::after   { background: #2b8fd6; }

.stat-icon {
  width: 38px; height: 38px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  transition: transform .22s ease;
}
.stat-card:hover .stat-icon { transform: scale(1.08); }

.stat-purple .stat-icon { background: #efeafe; color: #6249e8; }
.stat-green  .stat-icon { background: #dcf7f0; color: #0ab39c; }
.stat-orange .stat-icon { background: #fff1de; color: #f7a53b; }
.stat-blue   .stat-icon { background: #e4f1ff; color: #2b8fd6; }

.stat-label { font-size: 12px; margin: 0; color: #878a99; }
.stat-value { font-size: 26px; font-weight: 700; margin: 2px 0; color: #2b2b40; }
.stat-trend { font-size: 11px; display: inline-flex; align-items: center; gap: 4px; font-weight: 600; }

.stat-purple .stat-trend { color: #6249e8; }
.stat-green  .stat-trend { color: #0ab39c; }
.stat-orange .stat-trend { color: #f7a53b; }
.stat-blue   .stat-trend { color: #2b8fd6; }
.stat-trend-down { opacity: .85; }

.stat-spark { position: absolute; right: 0; bottom: 0; width: 55%; height: 40px; opacity: .55; }
.spark-line { stroke: currentColor; }
.stat-purple .spark-line { color: #6249e8; }
.stat-green  .spark-line { color: #0ab39c; }
.stat-orange .spark-line { color: #f7a53b; }
.stat-blue   .spark-line { color: #2b8fd6; }

/* ---- Chip strip ---- */
.chip-strip {
  background: linear-gradient(90deg, #f1eefe, #eef4fd);
  border-radius: 16px;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  gap: 18px;
  overflow-x: auto;
}
.chip-item {
  background: none;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 76px;
  padding: 4px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background .15s ease;
}
.chip-item:hover { background: rgba(255,255,255,.6); }
.chip-item.active { background: rgba(255,255,255,.85); box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.chip-ico {
  width: 30px; height: 30px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
}
.chip-ico-all      { background: #e6e1fd; color: #6249e8; }
.chip-ico-pending  { background: #fff1de; color: #f7a53b; }
.chip-ico-paid     { background: #d9f7ee; color: #0ab39c; }
.chip-ico-partial  { background: #dcedff; color: #2b8fd6; }
.chip-ico-cancelled{ background: #fde2e1; color: #e04f4f; }
.chip-label { font-size: 11px; color: #495057; white-space: nowrap; }
.chip-count { font-size: 14px; font-weight: 700; color: #2b2b40; }
.chip-divider { width: 1px; align-self: stretch; background: rgba(0,0,0,.06); }

/* ---- Date range ---- */
.date-range-group {
  display: flex; align-items: center; gap: 4px;
  border: 1px solid #e2e5ed; border-radius: 6px;
  padding: 3px 8px; background: #fff;
}
.date-input {
  border: none; outline: none; font-size: 12.5px; color: #495057;
  background: transparent; max-width: 118px;
}

/* ---- Table ---- */
.sortable { cursor: pointer; user-select: none; white-space: nowrap; }
.sortable i { font-size: 12px; opacity: .5; margin-left: 2px; }
.sortable:hover i { opacity: 1; }


:host-context([data-bs-theme="dark"]) {
  /* Cartes statistiques */
  .stat-card {
    background: var(--bs-card-bg);
    border-color: var(--bs-border-color);
    box-shadow: 0 3px 10px -4px rgba(0, 0, 0, .3);
  }
  .stat-card:hover {
    box-shadow: 0 14px 28px -10px rgba(0, 0, 0, .5);
  }
  .stat-label { color: var(--bs-secondary-color); }
  .stat-value { color: var(--bs-emphasis-color); }

  .stat-purple .stat-icon { background: rgba(98, 73, 232, .18); }
  .stat-green  .stat-icon { background: rgba(10, 179, 156, .18); }
  .stat-orange .stat-icon { background: rgba(247, 165, 59, .18); }
  .stat-blue   .stat-icon { background: rgba(43, 143, 214, .18); }

  /* Chips de statut */
  .chip-strip {
    background: linear-gradient(90deg, var(--bs-tertiary-bg), var(--bs-secondary-bg));
  }
  .chip-item:hover  { background: var(--bs-tertiary-bg); }
  .chip-item.active {
    background: var(--bs-card-bg);
    box-shadow: 0 2px 8px rgba(0, 0, 0, .35);
  }
  .chip-label { color: var(--bs-secondary-color); }
  .chip-count { color: var(--bs-emphasis-color); }
  .chip-divider { background: var(--bs-border-color); }

  .chip-ico-all       { background: rgba(98, 73, 232, .18) !important; }
  .chip-ico-pending   { background: rgba(247, 165, 59, .18) !important; }
  .chip-ico-paid      { background: rgba(10, 179, 156, .18) !important; }
  .chip-ico-partial   { background: rgba(43, 143, 214, .18) !important; }
  .chip-ico-cancelled { background: rgba(224, 79, 79, .18) !important; }

  /* Filtre par date */
  .date-range-group {
    background: var(--bs-tertiary-bg);
    border-color: var(--bs-border-color);
  }
  .date-input { color: var(--bs-body-color); background: transparent; }
  .date-input::-webkit-calendar-picker-indicator { filter: invert(.8); }

  /* Barre de recherche + inputs */
  .input-group-text {
    background: var(--bs-tertiary-bg) !important;
    border-color: var(--bs-border-color) !important;
    color: var(--bs-secondary-color);
  }
  .form-control, .form-select {
    background-color: var(--bs-tertiary-bg);
    border-color: var(--bs-border-color);
    color: var(--bs-body-color);
  }
  .form-control::placeholder { color: var(--bs-secondary-color); }
  .form-control:focus, .form-select:focus { background-color: var(--bs-tertiary-bg); }

  /* Carte + table */
  .card { background: var(--bs-card-bg); box-shadow: 0 2px 12px rgba(0, 0, 0, .35) !important; }
  .card-header, .card-footer { border-color: var(--bs-border-color) !important; }
  thead.table-light th, .table-light {
    background: var(--bs-tertiary-bg) !important;
    color: var(--bs-secondary-color) !important;
    border-color: var(--bs-border-color) !important;
  }
  .table > :not(caption) > * > * { border-color: var(--bs-border-color); color: var(--bs-body-color); }
  .table-hover > tbody > tr:hover > * { background-color: var(--bs-tertiary-bg); }

  /* Boutons clairs */
  .btn-light {
    background: var(--bs-tertiary-bg);
    border-color: var(--bs-border-color);
    color: var(--bs-body-color);
  }
  .btn-light:hover { background: var(--bs-secondary-bg); }

  /* Menus déroulants */
  .dropdown-menu {
    background: var(--bs-card-bg);
    border-color: var(--bs-border-color);
    box-shadow: 0 4px 16px rgba(0, 0, 0, .4);
  }
  .dropdown-item { color: var(--bs-body-color); }
  .dropdown-item:hover { background: var(--bs-tertiary-bg); color: var(--bs-emphasis-color); }
}
`],
})
export class InvoicesAdminComponent implements OnInit {
  breadcrumbItems = [{ label: 'Admin' }, { label: 'Factures', active: true }];

  items: InvoiceRow[] = [];
  search = '';
  statusFilter = '';
  typeFilter: '' | 'client' | 'vendor' = '';
  dateFrom: string | null = null;
  dateTo: string | null = null;
  loading = true;

  sortField: SortField = '';
  sortDir: 'asc' | 'desc' = 'asc';

  currentPage = 1;
  pageSize = 10;

  paidTotal = 0;
  pendingTotal = 0;
  pendingCount = 0;
  grandTotal = 0;
  invoicesThisMonthCount = 0;
  paidThisMonthTotal = 0;
  grandTotalThisMonth = 0;
  statusCounts: Record<string, number> = {};

  totalPages = 1;
  totalCount = 0;
  rangeStart = 0;
  rangeEnd = 0;
  pageNumbers: number[] = [];

  // ✅ Perf : ces totaux viennent désormais du backend (agrégats calculés
  // sur la requête filtrée avant pagination, cf. InvoicesController::index)
  // au lieu d'être recalculés depuis `items`, qui ne contient plus que la
  // page affichée depuis le passage à la pagination serveur.
  private applyStats(stats: any): void {
    this.paidTotal              = +(stats?.paid_total ?? 0);
    this.pendingTotal           = +(stats?.pending_total ?? 0);
    this.pendingCount           = +(stats?.pending_count ?? 0);
    this.grandTotal             = +(stats?.grand_total ?? 0);
    this.invoicesThisMonthCount = +(stats?.this_month_count ?? 0);
    this.paidThisMonthTotal     = +(stats?.paid_this_month_total ?? 0);
    this.grandTotalThisMonth    = +(stats?.grand_this_month_total ?? 0);
  }

  private recomputePagination(): void {
    this.rangeStart = this.totalCount === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    this.rangeEnd   = Math.min(this.currentPage * this.pageSize, this.totalCount);
    this.pageNumbers = Array.from({ length: this.totalPages }, (_, k) => k + 1);
  }

  constructor(private api: TijaraApiService, private invoices: InvoicesService) {}

  ngOnInit(): void { this.load(); }

  // ⚠️ Le backend renvoie TOUT le résultat déjà filtré (pas de page/per_page
  // sur cette route) — search/statut/dates partent bien au backend, la
  // pagination visuelle ci-dessous découpe juste ce résultat déjà filtré.
  load(): void {
    this.loading = true;
    const params: any = { page: this.currentPage, per_page: this.pageSize };
    if (this.search.trim())    params.search = this.search.trim();
    if (this.statusFilter)     params.Status = this.statusFilter;
    if (this.typeFilter)       params.Type   = this.typeFilter;
    if (this.dateFrom)         params.from   = this.dateFrom;
    if (this.dateTo)           params.to     = this.dateTo;
    this.invoices.getAdminInvoices(params).subscribe({
      next: (res: any) => {
        const rows: any[] = res?.data || [];
        this.items = rows.map((i: any) => {
          const client = i.user;
          const vendor = i.vendor;
          return {
            idInvoice:   i.IdInvoice,
            number:      i.Number || `FAC-${i.IdInvoice}`,
            idOrder:     i.IdOrder,
            // Une commande génère désormais 1 facture CLIENT + 1 facture
            // VENDOR par vendeur distinct (au lieu d'une seule facture
            // globale) — on distingue les deux via ce champ.
            type:        (i.Type === 'vendor' ? 'vendor' : 'client') as 'client' | 'vendor',
            clientName:  client ? `${client.FirstName || ''} ${client.LastName || ''}`.trim() || client.Username : '—',
            clientEmail: client?.Email || '',
            vendorName:  vendor ? `${vendor.FirstName || ''} ${vendor.LastName || ''}`.trim() || vendor.Username : '—',
            dealTitle:   i.order?.IdDeal ? `Deal #${i.order.IdDeal}` : '—',
            subtotal:   +(i.Subtotal ?? 0),
            tax:        +(i.Tax ?? 0),
            total:      +(i.Total ?? 0),
            status:      (i.Status || 'issued').toLowerCase(),
            issuedAt:    i.IssuedAt ?? null,
            paidAt:      i.PaidAt ?? null,
          };
        });
        this.totalCount  = res?.total        ?? this.items.length;
        this.totalPages  = res?.last_page    ?? 1;
        this.currentPage = res?.current_page ?? this.currentPage;
        this.applyStats(res?.stats);
        if (this.sortField) this.applySort(); else this.recomputePagination();
        this.loading = false;
        this.loadStatusCounts();
      },
      error: () => { this.loading = false; alert('Chargement impossible.'); }
    });
  }

  private searchDebounce: any = null;
  onSearchChange(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.currentPage = 1; this.load(); }, 400);
  }

  countByStatus(status: string): number {
    return this.statusCounts[status] ?? 0;
  }

  private loadStatusCounts(): void {
    const base: any = {};
    if (this.search.trim()) base.search = this.search.trim();
    if (this.typeFilter)    base.Type   = this.typeFilter;
    if (this.dateFrom)      base.from   = this.dateFrom;
    if (this.dateTo)        base.to     = this.dateTo;
    ['pending', 'paid', 'partial', 'cancelled'].forEach(status => {
      this.invoices.getAdminInvoices({ ...base, per_page: 1, Status: status }).subscribe((res: any) => {
        this.statusCounts[status] = res?.total ?? 0;
      });
    });
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.currentPage = 1;
    this.load();
  }

  setTypeFilter(type: '' | 'client' | 'vendor'): void {
    this.typeFilter = type;
    this.currentPage = 1;
    this.load();
  }

  resetFilters(): void {
    this.search = '';
    this.statusFilter = '';
    this.typeFilter = '';
    this.dateFrom = null;
    this.dateTo = null;
    this.currentPage = 1;
    this.load();
  }

  sortBy(field: SortField): void {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }
    this.applySort();
  }

  applySort(): void {
    if (this.sortField) {
      const field = this.sortField;
      const dir = this.sortDir === 'asc' ? 1 : -1;
      this.items = [...this.items].sort((a: any, b: any) => {
        const va = a[field];
        const vb = b[field];
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb)) * dir;
      });
    }
    this.recomputePagination();
  }

  sortIcon(field: SortField): string {
    if (this.sortField !== field) return 'ri-expand-up-down-line';
    return this.sortDir === 'asc' ? 'ri-sort-asc' : 'ri-sort-desc';
  }

  setPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.currentPage) return;
    this.currentPage = p;
    this.load();
  }

  changePageSize(size: number): void {
    this.pageSize = +size;
    this.currentPage = 1;
    this.load();
  }

  markPaid(i: InvoiceRow): void {
    this.invoices.markInvoicePaid(i.idInvoice).subscribe({
      next: () => { i.status = 'paid'; i.paidAt = new Date().toISOString(); this.load(); },
      error: () => alert('Mise à jour impossible.'),
    });
  }

  viewInvoice(i: InvoiceRow): void {
    this.print(i, false);
  }

  print(i: InvoiceRow, autoPrint: boolean = true): void {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Facture ${i.number}</title>
<style>body{font-family:Arial;padding:40px;color:#333;max-width:820px;margin:auto}
.header{display:flex;justify-content:space-between;border-bottom:3px solid #405189;padding-bottom:20px;margin-bottom:30px}
.logo{font-size:32px;font-weight:bold;color:#405189}.logo span{color:#0ab39c}
h2{color:#405189}table{width:100%;border-collapse:collapse}
th,td{padding:12px;border-bottom:1px solid #eee;text-align:left;font-size:13px}
th{background:#f5f7fb;color:#405189;text-transform:uppercase;font-size:11px}
.grand td{font-size:20px;font-weight:bold;color:#0ab39c;border-top:2px solid #405189;padding-top:14px}</style>
</head><body>
<div class="header">
  <div class="logo">🛍️ Tijara<span>.tn</span></div>
  <div style="text-align:right;font-size:13px">
    <strong>Facture ${i.number}</strong><br>
    Émise le ${this.formatDate(i.issuedAt) || '—'}<br>
    Statut : <strong>${this.statusLabel(i.status)}</strong>
  </div>
</div>
<h2>Commande #${i.idOrder}</h2>
<p><strong>Client :</strong> ${i.clientName || '—'}${i.clientEmail ? ' &lt;'+i.clientEmail+'&gt;' : ''}</p>
<p><strong>Vendeur :</strong> ${i.vendorName || '—'}</p>
<table>
  <thead><tr><th>Description</th><th style="text-align:right">Montant</th></tr></thead>
  <tbody>
    <tr><td>${i.dealTitle || 'Sous-total'}</td><td style="text-align:right">${i.subtotal.toFixed(3)} TND</td></tr>
    <tr><td>TVA (7%)</td><td style="text-align:right">${i.tax.toFixed(3)} TND</td></tr>
    <tr class="grand"><td>TOTAL</td><td style="text-align:right">${i.total.toFixed(3)} TND</td></tr>
  </tbody>
</table>
</body></html>`);
    w.document.close();
    if (autoPrint) setTimeout(() => w.print(), 300);
  }

  exportCSV(): void {
    // Export limité à la page actuelle (comme products-admin/orders-admin) :
    // la liste est désormais paginée côté backend, `items` ne contient que
    // la page affichée.
    const header = 'N°,Commande,Client,Vendeur,Date,Sous-total,TVA,Total,Statut\n';
    const rows = this.items.map(i =>
      [i.number, i.idOrder, `"${i.clientName}"`, `"${i.vendorName}"`,
       this.formatDate(i.issuedAt), i.subtotal, i.tax, i.total, i.status].join(',')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `factures-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  newInvoice(): void { alert('Fonctionnalité à venir : création de facture.'); }
  newDevis(): void { alert('Fonctionnalité à venir : création de devis.'); }
  importInvoices(): void { alert('Fonctionnalité à venir : import de factures.'); }

  formatDate(d: string | null): string {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
  }
  statusLabel(s: string): string {
    return s === 'paid' ? 'Payée'
         : s === 'cancelled' ? 'Annulée'
         : s === 'pending' ? 'En attente'
         : s === 'partial' ? 'Partiellement payée'
         : 'Émise';
  }
  statusClass(s: string): string {
    return s === 'paid' ? 'bg-success-subtle text-success'
         : s === 'cancelled' ? 'bg-danger-subtle text-danger'
         : s === 'pending' ? 'bg-warning-subtle text-warning'
         : s === 'partial' ? 'bg-info-subtle text-info'
                           : 'bg-info-subtle text-info';
  }

  private isSameMonth(d: Date, now: Date): boolean {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
}