import { Component, OnInit, OnDestroy } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { DealsService } from 'src/app/core/services/deals.service';
import { DeliveriesService } from 'src/app/core/services/deliveries.service';
import { OrdersService } from 'src/app/core/services/orders.service';
import { TransportsService } from 'src/app/core/services/transports.service';
import { UsersVendorsService } from 'src/app/core/services/users-vendors.service';
import { CatalogAdminService } from 'src/app/core/services/catalog-admin.service';
import { PaymentsService } from 'src/app/core/services/payments.service';
import { ProductsService } from 'src/app/core/services/products.service';

interface DeliveryRow {
  idDelivery: number;
  idOrder: number;
  clientName: string;
  clientEmail: string;
  dealTitle: string;
  vendorNames: string[];
  multiVendor: boolean;
  idTransport: number | null;
  transportName: string;
  trackingNumber: string;
  status: string;          // pending | preparing | shipped | delivered | cancelled
  addressLine: string;
  city: string;
  postalCode: string;
  phone: string;
  deliveryFee: number;
  createdAt: string | null;
  shippedAt: string | null;
  estimatedAt: string | null;
  clientInitials: string;
  clientColor: string;
}

interface TransportOpt { id: number; name: string; fee: number; }

@Component({
  selector: 'app-deliveries-admin',
  standalone: false,
  template: `
<!-- ═════ Header ═════ -->
<div class="liv-header mb-4">
  <div>
    <h1 class="liv-title">Livraisons</h1>
    <p class="liv-subtitle">Suivez toutes vos expéditions en temps réel</p>
  </div>
  <div class="d-flex align-items-center gap-2 flex-wrap">
    <button class="liv-btn-primary" (click)="openEdit(null)">
      <i class="ri-add-line me-1"></i>Nouvelle livraison <i class="ri-arrow-down-s-line ms-1"></i>
    </button>
    <button class="liv-btn-secondary"><i class="ri-upload-2-line me-1"></i>Importer</button>
    <button class="liv-btn-secondary"><i class="ri-download-2-line me-1"></i>Exporter</button>
  </div>
</div>

<!-- ═════ KPI Cards ═════ -->
<div class="row g-3 mb-4">
  <div class="col-6 col-md-3">
    <div class="liv-kpi">
      <div class="liv-kpi-top">
        <span class="liv-kpi-icon" style="background:#efebfe;color:#6c5ce7"><i class="ri-truck-line"></i></span>
        <span class="liv-kpi-trend up">↗ +15%</span>
      </div>
      <div class="liv-kpi-label">TOTAL LIVRAISONS</div>
      <div class="liv-kpi-value">{{ items.length }}</div>
      <div class="liv-kpi-sub">ce mois</div>
      <svg class="liv-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
        <polyline points="0,25 15,20 30,22 45,15 60,18 80,10" fill="none" stroke="#6c5ce7" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="liv-kpi">
      <div class="liv-kpi-top">
        <span class="liv-kpi-icon" style="background:#fef3e2;color:#f7b84b"><i class="ri-archive-line"></i></span>
        <span class="liv-kpi-trend up">↗ +8%</span>
      </div>
      <div class="liv-kpi-label">À PRÉPARER</div>
      <div class="liv-kpi-value" style="color:#f7b84b">{{ preparingCount }}</div>
      <div class="liv-kpi-sub">ce mois</div>
      <svg class="liv-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
        <polyline points="0,15 15,20 30,12 45,22 60,16 80,24" fill="none" stroke="#f7b84b" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="liv-kpi">
      <div class="liv-kpi-top">
        <span class="liv-kpi-icon" style="background:#e8f4ff;color:#299cdb"><i class="ri-send-plane-line"></i></span>
        <span class="liv-kpi-trend up">↗ +12%</span>
      </div>
      <div class="liv-kpi-label">EN TRANSIT</div>
      <div class="liv-kpi-value" style="color:#299cdb">{{ transitCount }}</div>
      <div class="liv-kpi-sub">ce mois</div>
      <svg class="liv-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
        <polyline points="0,28 15,22 30,18 45,20 60,12 80,8" fill="none" stroke="#299cdb" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="liv-kpi">
      <div class="liv-kpi-top">
        <span class="liv-kpi-icon" style="background:#e0f9f5;color:#0ab39c"><i class="ri-check-double-line"></i></span>
        <span class="liv-kpi-trend up">↗ +20%</span>
      </div>
      <div class="liv-kpi-label">LIVRÉES</div>
      <div class="liv-kpi-value" style="color:#0ab39c">{{ deliveredCount }}</div>
      <div class="liv-kpi-sub">ce mois</div>
      <svg class="liv-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
        <polyline points="0,28 15,24 30,20 45,16 60,10 80,6" fill="none" stroke="#0ab39c" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>
</div>

<!-- ═════ Statut / Performance / Suivi ═════ -->
<div class="row g-3 mb-4">
  <!-- Donut -->
  <div class="col-lg-4">
    <div class="liv-card h-100">
      <div class="liv-card-header">
        <h6 class="liv-card-title mb-0">Statut des livraisons</h6>
      </div>
      <div class="liv-card-body">
        <div class="liv-donut-wrap">
          <div class="liv-donut" [style.background]="donutGradient">
            <div class="liv-donut-center">
              <div class="liv-donut-total">{{ items.length }}</div>
              <div class="liv-donut-label">Total</div>
            </div>
          </div>
          <div class="liv-legend">
            <div class="liv-legend-item">
              <span class="liv-legend-dot" style="background:#f7b84b"></span>
              <span class="liv-legend-label">À préparer</span>
              <span class="liv-legend-value">{{ preparingCount }} ({{ pct(preparingCount) }}%)</span>
            </div>
            <div class="liv-legend-item">
              <span class="liv-legend-dot" style="background:#299cdb"></span>
              <span class="liv-legend-label">En transit</span>
              <span class="liv-legend-value">{{ transitCount }} ({{ pct(transitCount) }}%)</span>
            </div>
            <div class="liv-legend-item">
              <span class="liv-legend-dot" style="background:#0ab39c"></span>
              <span class="liv-legend-label">Livrées</span>
              <span class="liv-legend-value">{{ deliveredCount }} ({{ pct(deliveredCount) }}%)</span>
            </div>
            <div class="liv-legend-item">
              <span class="liv-legend-dot" style="background:#f06548"></span>
              <span class="liv-legend-label">Annulées</span>
              <span class="liv-legend-value">{{ cancelledCount }} ({{ pct(cancelledCount) }}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Performance -->
  <div class="col-lg-4">
    <div class="liv-card h-100">
      <div class="liv-card-header">
        <h6 class="liv-card-title mb-0">Performance de livraison</h6>
        <span class="liv-card-tag">30 derniers jours <i class="ri-arrow-down-s-line"></i></span>
      </div>
      <div class="liv-card-body">
        <div class="liv-perf-row">
          <div class="d-flex justify-content-between mb-1">
            <span class="liv-perf-label">Livraisons à temps</span>
            <span class="liv-perf-value">{{ onTimeRate }}%</span>
          </div>
          <div class="liv-perf-bar-track">
            <div class="liv-perf-bar-fill" [style.width.%]="onTimeRate"></div>
          </div>
        </div>
        <div class="liv-perf-row plain">
          <span class="liv-perf-label">Délai moyen</span>
          <span class="liv-perf-value">{{ avgDelay }}</span>
        </div>
        <div class="liv-perf-row plain">
          <span class="liv-perf-label">Taux d'échec</span>
          <span class="liv-perf-value" [class.text-danger]="failureRate > 5">{{ failureRate }}%</span>
        </div>
        <div class="liv-perf-row plain">
          <span class="liv-perf-label">Satisfaction client</span>
          <span class="liv-perf-value liv-stars">
            <i class="ri-star-fill" *ngFor="let s of [1,2,3,4]; trackBy: trackByIndex"></i><i class="ri-star-half-fill"></i>
            <span class="ms-1">4.6/5</span>
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Prochaines livraisons (données réelles) -->
  <div class="col-lg-4">
    <div class="liv-card h-100">
      <div class="liv-card-header">
        <h6 class="liv-card-title mb-0">Prochaines livraisons</h6>
        <a class="liv-card-link" (click)="setFilter('shipped')">Voir toutes</a>
      </div>
      <div class="liv-card-body">
        <div *ngIf="upcomingDeliveries.length === 0" class="liv-track-empty">
          <i class="ri-truck-line fs-2 opacity-50"></i>
          <p class="mb-0 mt-2 fs-12">Aucune livraison en cours.</p>
        </div>
        <div class="liv-track-list">
          <div class="liv-track-item" *ngFor="let d of upcomingDeliveries; trackBy: trackByDeliveryId" (click)="openEdit(d)">
            <span class="liv-track-icon" [class]="'st-' + d.status">
              <i class="ri-truck-line" *ngIf="d.status !== 'Delivered'"></i>
              <i class="ri-check-line" *ngIf="d.status === 'Delivered'"></i>
            </span>
            <div class="liv-track-info">
              <div class="liv-track-title">
                #CMD-{{ d.idOrder }} <span *ngIf="d.trackingNumber" class="liv-track-code">{{ d.trackingNumber }}</span>
              </div>
              <div class="liv-track-sub">
                {{ d.clientName || '—' }}<span *ngIf="d.city"> · {{ d.city }}</span>
              </div>
            </div>
            <div class="text-end">
              <span class="liv-status-pill sm" [class]="'st-' + d.status">{{ statusLabel(d.status) }}</span>
              <div class="liv-track-eta">{{ formatDate(d.estimatedAt) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ═════ Table ═════ -->
<div class="liv-card">
  <div class="liv-toolbar">
    <div class="liv-tabs">
      <button [class.active]="filter===''"          (click)="setFilter('')">Toutes <span class="liv-tab-count">{{ items.length }}</span></button>
      <button [class.active]="filter==='preparing'"  (click)="setFilter('preparing')">À préparer <span class="liv-tab-count warn">{{ preparingCount }}</span></button>
      <button [class.active]="filter==='shipped'"    (click)="setFilter('shipped')">En transit <span class="liv-tab-count info">{{ transitCount }}</span></button>
      <button [class.active]="filter==='delivered'"  (click)="setFilter('delivered')">Livrées <span class="liv-tab-count ok">{{ deliveredCount }}</span></button>
      <button [class.active]="filter==='cancelled'"  (click)="setFilter('cancelled')">Annulées <span class="liv-tab-count danger">{{ cancelledCount }}</span></button>
    </div>
    <div class="d-flex align-items-center gap-2 flex-wrap">
      <div class="liv-search">
        <i class="ri-search-line liv-search-ic"></i>
        <input type="text" class="liv-search-input" placeholder="Commande, client, tracking…"
               [(ngModel)]="search" (input)="onSearchChange()" />
      </div>
      <select class="liv-select" [(ngModel)]="filter" (change)="setFilter(filter)">
        <option value="">Tous les statuts</option>
        <option value="preparing">À préparer</option>
        <option value="shipped">En transit</option>
        <option value="delivered">Livrées</option>
        <option value="cancelled">Annulées</option>
      </select>
      <button class="liv-filter-btn"><i class="ri-equalizer-3-line me-1"></i>Filtres</button>
      <button class="liv-filter-btn"><i class="ri-calendar-line me-1"></i>{{ dateRangeLabel }}</button>
    </div>
  </div>

  <div class="liv-table-header">
    <h6 class="mb-0 fw-semibold">Toutes les livraisons <span class="liv-count-badge">{{ totalItems }}</span></h6>
  </div>

  <div class="liv-card-body p-0">
    <div *ngIf="loading" class="liv-loading">
      <div class="spinner-border text-primary"></div>
      <p class="text-muted mt-2 fs-13 mb-0">Chargement des livraisons...</p>
    </div>

    <div *ngIf="!loading && error" class="liv-empty">
      <i class="ri-error-warning-line display-3 opacity-50 text-danger"></i>
      <p class="mt-2 mb-2 text-danger">{{ error }}</p>
      <button class="btn btn-sm btn-primary" (click)="load()">
        <i class="ri-refresh-line me-1"></i>Réessayer
      </button>
    </div>

    <div *ngIf="!loading && !error && paginated.length === 0" class="liv-empty">
      <i class="ri-truck-line display-3 opacity-50"></i>
      <p class="mt-2 mb-0">Aucune livraison ne correspond.</p>
    </div>

    <div *ngIf="!loading && !error && paginated.length > 0" class="table-responsive">
      <table class="liv-table table align-middle mb-0">
        <thead>
          <tr>
            <th class="ps-4">Tracking</th>
            <th>Commande</th>
            <th>Client</th>
            <th>Transporteur</th>
            <th>Statut</th>
            <th>Date d'expédition</th>
            <th>Date estimée</th>
            <th>Destination</th>
            <th class="text-end pe-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let d of paginated; trackBy: trackByDeliveryId">
            <td class="ps-4">
              <span class="liv-tracking" *ngIf="d.trackingNumber; else noTrack">{{ d.trackingNumber }}</span>
              <ng-template #noTrack><span class="text-muted">—</span></ng-template>
            </td>
            <td>
              <div class="fw-semibold fs-13">#CMD-{{ d.idOrder }}</div>
              <div class="fs-11 text-muted">{{ d.clientEmail || '—' }}</div>
              <div *ngIf="d.vendorNames.length" class="fs-11 mt-1">
                <span *ngIf="!d.multiVendor" class="text-muted">{{ d.vendorNames[0] }}</span>
                <span *ngIf="d.multiVendor" class="badge bg-warning-subtle text-warning" [title]="d.vendorNames.join(', ')">
                  <i class="ri-alert-line me-1"></i>{{ d.vendorNames.length }} vendeurs — colis séparés requis
                </span>
              </div>
            </td>
            <td>
              <div class="d-flex align-items-center gap-2">
                <div class="liv-client-avatar" [style.background]="d.clientColor">{{ d.clientInitials }}</div>
                <span class="fs-13">{{ d.clientName || '—' }}</span>
              </div>
            </td>
            <td>
              <span class="liv-transporter-pill" *ngIf="d.transportName; else noTransp"
                    [style.color]="transporterColor(d.transportName)"
                    [style.background]="transporterColor(d.transportName) + '18'">
                <i class="ri-truck-line me-1"></i>{{ d.transportName }}
              </span>
              <ng-template #noTransp><span class="badge bg-light text-muted fs-11">Non affecté</span></ng-template>
            </td>
            <td>
              <span class="liv-status-pill" [class]="'st-' + d.status">
                {{ statusLabel(d.status) }}
              </span>
            </td>
            <td class="fs-12 text-muted">{{ formatDate(d.shippedAt) }}</td>
            <td class="fs-12 text-muted">{{ formatDate(d.estimatedAt) }}</td>
            <td class="fs-12">
              <i class="ri-map-pin-line text-muted me-1"></i>{{ d.city || '—' }}<span *ngIf="d.city">, Tunisie</span>
            </td>
            <td class="text-end pe-4">
              <div class="d-flex gap-1 justify-content-end position-relative">
                <button class="liv-icon-btn" (click)="openEdit(d)"><i class="ri-eye-line"></i></button>
                <button class="liv-icon-btn" (click)="toggleMenu(d.idDelivery, $event)"><i class="ri-more-2-fill"></i></button>
                <div class="liv-menu" *ngIf="openMenuId === d.idDelivery" (click)="$event.stopPropagation()">
                  <button (click)="openEdit(d); closeMenu()"><i class="ri-edit-2-line me-2"></i>Gérer</button>
                  <button (click)="changeStatus(d, 'In Transit'); closeMenu()"><i class="ri-send-plane-line me-2"></i>Marquer expédiée</button>
                  <button (click)="changeStatus(d, 'Delivered'); closeMenu()"><i class="ri-check-double-line me-2"></i>Marquer livrée</button>
                  <button class="text-danger" (click)="changeStatus(d, 'Failed'); closeMenu()"><i class="ri-close-circle-line me-2"></i>Marquer échouée</button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div *ngIf="!loading && paginated.length > 0" class="liv-pagination">
    <div class="liv-pagination-info">
      Affichage de {{ pageStart }} à {{ pageEnd }} sur {{ totalItems }} livraisons
    </div>
    <div class="liv-pagination-controls">
      <button class="liv-page-btn" [disabled]="page === 1" (click)="goToPage(page - 1)"><i class="ri-arrow-left-s-line"></i></button>
      <ng-container *ngFor="let p of pageNumbers; trackBy: trackByIndex">
        <span *ngIf="p === '...'" class="liv-page-dots">…</span>
        <button *ngIf="p !== '...'" class="liv-page-btn" [class.active]="p === page" (click)="goToPage(+p)">{{ p }}</button>
      </ng-container>
      <button class="liv-page-btn" [disabled]="page === totalPages" (click)="goToPage(page + 1)"><i class="ri-arrow-right-s-line"></i></button>
      <select class="liv-select ms-2" [(ngModel)]="pageSize" (change)="changePageSize()">
        <option [ngValue]="5">5 / page</option>
        <option [ngValue]="10">10 / page</option>
        <option [ngValue]="25">25 / page</option>
        <option [ngValue]="50">50 / page</option>
      </select>
    </div>
  </div>
</div>

<!-- ═════ Modale édition ═════ -->
<div class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,.5)" *ngIf="editing !== undefined" (click)="closeEdit($event)">
  <div class="modal-dialog modal-lg modal-dialog-centered" (click)="$event.stopPropagation()">
    <div class="modal-content border-0 shadow-lg">
      <div class="modal-header bg-primary-subtle">
        <h5 class="modal-title fw-bold text-primary">
          <i class="ri-truck-line me-2"></i>
          {{ editing ? 'Livraison de la commande #CMD-' + editing.idOrder : 'Nouvelle livraison' }}
        </h5>
        <button type="button" class="btn-close" (click)="closeEdit()"></button>
      </div>
      <div class="modal-body">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label fs-12 fw-semibold">Transporteur</label>
            <select class="form-select form-select-sm" [(ngModel)]="form.idTransport" (change)="onTransportChange()">
              <option [ngValue]="null">— Aucun —</option>
              <option *ngFor="let t of transports; trackBy: trackByTransportId" [ngValue]="t.id">{{ t.name }} ({{ t.fee | number:'1.2-2' }} TND)</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label fs-12 fw-semibold">N° de tracking</label>
            <input type="text" class="form-control form-control-sm" [(ngModel)]="form.trackingNumber" />
          </div>
          <div class="col-md-8">
            <label class="form-label fs-12 fw-semibold">Adresse</label>
            <input type="text" class="form-control form-control-sm" [(ngModel)]="form.addressLine" />
          </div>
          <div class="col-md-4">
            <label class="form-label fs-12 fw-semibold">Téléphone</label>
            <input type="text" class="form-control form-control-sm" [(ngModel)]="form.phone" />
          </div>
          <div class="col-md-6">
            <label class="form-label fs-12 fw-semibold">Ville</label>
            <select class="form-select form-select-sm" [(ngModel)]="form.city">
              <option value="">— Sélectionner une ville —</option>
              <option *ngFor="let c of cities; trackBy: trackByCityId" [value]="c.title">{{ c.title }}</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label fs-12 fw-semibold">Code postal</label>
            <input type="text" class="form-control form-control-sm" [(ngModel)]="form.postalCode" />
          </div>
          <div class="col-md-3">
            <label class="form-label fs-12 fw-semibold">Frais (TND)</label>
            <input type="number" min="0" step="0.001" class="form-control form-control-sm" [(ngModel)]="form.deliveryFee" />
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-light" (click)="closeEdit()" [disabled]="saving">Annuler</button>
        <button class="btn btn-primary" (click)="saveEdit()" [disabled]="saving">
          <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
          <i class="ri-save-line me-1"></i> Enregistrer
        </button>
      </div>
    </div>
  </div>
</div>
`,
  styles: [`
    /* ═════ Header ═════ */
    .liv-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .liv-title { font-size: 1.7rem; font-weight: 800; color: #1a1f36; margin: 0 0 4px; }
    .liv-subtitle { color: #6b7280; font-size: 13px; margin: 0; }

    .liv-btn-primary {
      padding: 9px 18px; border: none; border-radius: 20px;
      background: linear-gradient(135deg, #7c6ef5, #405189);
      color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;
      transition: all .15s; display: inline-flex; align-items: center;
    }
    .liv-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(124,110,245,.4); }
    .liv-btn-secondary {
      padding: 8px 16px; border: 1px solid #e9ebec; border-radius: 20px;
      background: #fff; color: #374151; font-size: 13px; cursor: pointer; transition: all .15s;
      display: inline-flex; align-items: center;
    }
    .liv-btn-secondary:hover { background: #f8f9ff; border-color: #405189; color: #405189; }

    /* ═════ KPI ═════ */
    .liv-kpi {
      background: #fff; border-radius: 16px; padding: 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,.07); position: relative; overflow: hidden;
      transition: transform .15s, box-shadow .15s;
    }
    .liv-kpi:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,.12); }
    .liv-kpi-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .liv-kpi-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .liv-kpi-trend { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 20px; background: #dcfce7; color: #16a34a; }
    .liv-kpi-label { font-size: 10px; font-weight: 700; letter-spacing: .06em; color: #9298a8; text-transform: uppercase; margin-bottom: 4px; }
    .liv-kpi-value { font-size: 28px; font-weight: 800; color: #1a1f36; line-height: 1; margin-bottom: 4px; }
    .liv-kpi-sub { font-size: 11px; color: #9298a8; margin-bottom: 8px; }
    .liv-spark { width: 100%; height: 30px; display: block; }

    /* ═════ Card ═════ */
    .liv-card { background: #fff; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,.07); overflow: hidden; }
    .liv-card.h-100 { display: flex; flex-direction: column; }
    .liv-card.h-100 .liv-card-body { flex: 1; display: flex; flex-direction: column; }
    .liv-card-header {
      padding: 16px 20px 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px;
    }
    .liv-card-title { font-size: 14px; font-weight: 700; color: #1a1f36; }
    .liv-card-tag { font-size: 11px; color: #9298a8; cursor: pointer; }
    .liv-card-link { font-size: 12px; color: #405189; font-weight: 600; cursor: pointer; }
    .liv-card-body { padding: 4px 20px 20px; }

    /* ═════ Donut ═════ */
    .liv-donut-wrap { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
    .liv-donut {
      width: 130px; height: 130px; border-radius: 50%; position: relative; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .liv-donut-center {
      width: 84px; height: 84px; border-radius: 50%; background: #fff;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      box-shadow: inset 0 0 0 1px rgba(0,0,0,.03);
    }
    .liv-donut-total { font-size: 22px; font-weight: 800; color: #1a1f36; line-height: 1; }
    .liv-donut-label { font-size: 11px; color: #9298a8; margin-top: 2px; }
    .liv-legend { display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 140px; }
    .liv-legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .liv-legend-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .liv-legend-label { color: #6b7280; flex: 1; }
    .liv-legend-value { color: #1a1f36; font-weight: 600; }

    /* ═════ Performance ═════ */
    .liv-perf-row { margin-bottom: 14px; }
    .liv-perf-row.plain { display: flex; align-items: center; justify-content: space-between; }
    .liv-perf-label { font-size: 12px; color: #6b7280; }
    .liv-perf-value { font-size: 13px; font-weight: 700; color: #1a1f36; }
    .liv-perf-bar-track { height: 7px; border-radius: 20px; background: #eef0f5; overflow: hidden; }
    .liv-perf-bar-fill { height: 100%; border-radius: 20px; background: linear-gradient(90deg,#0ab39c,#0ab39c); }
    .liv-stars { color: #f7b84b; display: inline-flex; align-items: center; font-size: 12px; }
    .liv-stars span { color: #1a1f36; font-weight: 700; }

    /* ═════ Prochaines livraisons (données réelles) ═════ */
    .liv-track-empty { text-align: center; padding: 30px 10px; color: #9298a8; }
    .liv-track-list { display: flex; flex-direction: column; gap: 10px; }
    .liv-track-item {
      display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 12px;
      border: 1px solid #f0f0f5; cursor: pointer; transition: all .15s;
    }
    .liv-track-item:hover { background: #fafbff; border-color: #e9ebec; }
    .liv-track-icon {
      width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 15px;
      background: #fef3e2; color: #f7b84b;
    }
    .liv-track-icon.st-shipped   { background: #e8f4ff; color: #299cdb; }
    .liv-track-icon.st-delivered { background: #dcfce7; color: #16a34a; }
    .liv-track-info { flex: 1; min-width: 0; }
    .liv-track-title { font-size: 12.5px; font-weight: 700; color: #1a1f36; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .liv-track-code { font-weight: 600; color: #405189; margin-left: 4px; }
    .liv-track-sub { font-size: 11px; color: #9298a8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .liv-track-eta { font-size: 10.5px; color: #9298a8; margin-top: 3px; }
    .liv-status-pill.sm { padding: 3px 9px; font-size: 10px; }

    /* ═════ Toolbar / Tabs ═════ */
    .liv-toolbar { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid #f0f0f5; }
    .liv-tabs { display: flex; border: 1px solid #e9ebec; border-radius: 20px; overflow: hidden; background: #fafbff; flex-wrap: wrap; }
    .liv-tabs button {
      padding: 7px 14px; border: none; background: transparent; cursor: pointer;
      font-size: 12px; font-weight: 500; color: #6b7280; transition: all .15s;
      display: flex; align-items: center; gap: 6px;
    }
    .liv-tabs button.active { background: #405189; color: #fff; }
    .liv-tab-count { font-size: 11px; padding: 1px 6px; border-radius: 10px; background: rgba(255,255,255,.25); }
    .liv-tab-count.warn { background: #fef9e7; color: #f7b84b; }
    .liv-tab-count.info { background: #e8f4ff; color: #299cdb; }
    .liv-tab-count.ok { background: #dcfce7; color: #16a34a; }
    .liv-tab-count.danger { background: #fdeceb; color: #f06548; }
    .liv-tabs button.active .liv-tab-count { background: rgba(255,255,255,.25); color: #fff; }

    .liv-search { position: relative; }
    .liv-search-ic { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9298a8; font-size: 15px; }
    .liv-search-input {
      padding: 8px 14px 8px 36px; border: 1px solid #e9ebec; border-radius: 20px;
      font-size: 13px; outline: none; width: 200px; transition: border-color .15s; background: #fafbff;
    }
    .liv-search-input:focus { border-color: #405189; }
    .liv-select {
      border: 1px solid #e9ebec; border-radius: 20px; padding: 8px 12px;
      font-size: 12px; color: #374151; background: #fafbff; outline: none;
    }
    .liv-filter-btn {
      padding: 8px 14px; border: 1px solid #e9ebec; border-radius: 20px;
      background: #fff; color: #374151; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center;
      transition: all .15s;
    }
    .liv-filter-btn:hover { background: #f8f9ff; border-color: #405189; color: #405189; }

    .liv-table-header { padding: 14px 20px 0; }
    .liv-count-badge { background: #eef0ff; color: #405189; font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 20px; margin-left: 6px; }

    /* ═════ Table ═════ */
    .liv-table thead th {
      background: #fafbff; font-size: 11px; font-weight: 700; letter-spacing: .04em;
      text-transform: uppercase; color: #9298a8; border-bottom: 1px solid #f0f0f5; padding: 10px 12px;
    }
    .liv-table td { padding: 12px; border-bottom: 1px solid #f5f5fa; vertical-align: middle; }
    .liv-table tbody tr:hover { background: #fafbff; }
    .liv-tracking { color: #405189; font-weight: 700; font-size: 12px; }

    .liv-client-avatar {
      width: 30px; height: 30px; border-radius: 50%; color: #fff; font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }

    .liv-transporter-pill {
      display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 700;
    }

    .liv-status-pill { display: inline-flex; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .liv-status-pill.st-pending    { background: #fef9e7; color: #f7b84b; }
    .liv-status-pill.st-preparing  { background: #fef3e2; color: #f7b84b; }
    .liv-status-pill.st-shipped    { background: #e8f4ff; color: #299cdb; }
    .liv-status-pill.st-delivered  { background: #dcfce7; color: #16a34a; }
    .liv-status-pill.st-cancelled  { background: #fdeceb; color: #f06548; }

    .liv-icon-btn {
      width: 30px; height: 30px; border-radius: 8px; border: 1px solid #e9ebec; background: #fff;
      color: #6b7280; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
      transition: all .15s;
    }
    .liv-icon-btn:hover { background: #f8f9ff; border-color: #405189; color: #405189; }

    .liv-menu {
      position: absolute; top: 34px; right: 0; z-index: 20; min-width: 190px;
      background: #fff; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.16);
      padding: 6px; display: flex; flex-direction: column;
    }
    .liv-menu button {
      border: none; background: transparent; text-align: left; padding: 8px 10px; border-radius: 8px;
      font-size: 12.5px; color: #374151; display: flex; align-items: center; cursor: pointer;
    }
    .liv-menu button:hover { background: #f5f5fa; }

    .liv-loading, .liv-empty { text-align: center; padding: 56px 20px; color: #9298a8; }

    /* ═════ Pagination ═════ */
    .liv-pagination {
      padding: 14px 20px; display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 10px; border-top: 1px solid #f0f0f5;
    }
    .liv-pagination-info { font-size: 12px; color: #9298a8; }
    .liv-pagination-controls { display: flex; align-items: center; gap: 4px; }
    .liv-page-btn {
      min-width: 32px; height: 32px; padding: 0 8px; border: 1px solid #e9ebec; border-radius: 8px;
      background: #fff; color: #6b7280; font-size: 12px; font-weight: 600; cursor: pointer;
      transition: all .15s; display: inline-flex; align-items: center; justify-content: center;
    }
    .liv-page-btn:hover:not(:disabled):not(.active) { background: #f8f9ff; border-color: #405189; color: #405189; }
    .liv-page-btn.active { background: #405189; border-color: #405189; color: #fff; }
    .liv-page-btn:disabled { opacity: .4; cursor: not-allowed; }
    .liv-page-dots { padding: 0 4px; color: #9298a8; font-size: 12px; }

    /* ═════════════════════════════════════════════════
       Adaptation Dark Mode (préserve le même design)
       ═════════════════════════════════════════════════ */
    :host-context([data-bs-theme="dark"]) {
      .liv-title { color: var(--bs-emphasis-color); }
      .liv-subtitle { color: var(--bs-secondary-color); }

      .liv-btn-secondary {
        background: var(--bs-tertiary-bg);
        border-color: var(--bs-border-color);
        color: var(--bs-body-color);
      }
      .liv-btn-secondary:hover { background: var(--bs-secondary-bg); }

      .liv-kpi {
        background: var(--bs-card-bg);
        box-shadow: 0 2px 12px rgba(0, 0, 0, .35);
      }
      .liv-kpi:hover { box-shadow: 0 8px 24px rgba(0, 0, 0, .45); }
      .liv-kpi-label,
      .liv-kpi-sub { color: var(--bs-secondary-color); }
      .liv-kpi-value { color: var(--bs-emphasis-color); }
      .liv-kpi-icon[style*="#efebfe"] { background: rgba(108, 92, 231, .2) !important; }
      .liv-kpi-icon[style*="#fef3e2"] { background: rgba(247, 184, 75, .2) !important; }
      .liv-kpi-icon[style*="#e8f4ff"] { background: rgba(41, 156, 219, .2) !important; }
      .liv-kpi-icon[style*="#e0f9f5"] { background: rgba(10, 179, 156, .2) !important; }

      .liv-card {
        background: var(--bs-card-bg);
        box-shadow: 0 2px 12px rgba(0, 0, 0, .35);
      }
      .liv-card-title { color: var(--bs-emphasis-color); }
      .liv-card-tag,
      .liv-legend-label,
      .liv-perf-label,
      .liv-pagination-info,
      .liv-donut-label { color: var(--bs-secondary-color); }
      .liv-legend-value,
      .liv-perf-value,
      .liv-donut-total { color: var(--bs-emphasis-color); }
      .liv-donut-center { background: var(--bs-card-bg); box-shadow: inset 0 0 0 1px var(--bs-border-color); }
      .liv-perf-bar-track { background: var(--bs-tertiary-bg); }

      .liv-track-item { border-color: var(--bs-border-color); }
      .liv-track-item:hover { background: var(--bs-tertiary-bg); }
      .liv-track-title { color: var(--bs-emphasis-color); }
      .liv-track-sub,
      .liv-track-eta,
      .liv-track-empty { color: var(--bs-secondary-color); }

      .liv-toolbar,
      .liv-pagination { border-color: var(--bs-border-color); }
      .liv-tabs { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); }
      .liv-tabs button { color: var(--bs-secondary-color); }

      .liv-search-input,
      .liv-select,
      .liv-filter-btn {
        background: var(--bs-tertiary-bg);
        border-color: var(--bs-border-color);
        color: var(--bs-body-color);
      }
      .liv-filter-btn:hover { background: var(--bs-secondary-bg); }
      .liv-search-ic { color: var(--bs-secondary-color); }
      .liv-count-badge { background: rgba(64, 81, 137, .25); color: #a9b8e8; }

      .liv-table thead th {
        background: var(--bs-tertiary-bg);
        border-bottom-color: var(--bs-border-color);
        color: var(--bs-secondary-color);
      }
      .liv-table td { border-bottom-color: var(--bs-border-color); }
      .liv-table tbody tr:hover { background: var(--bs-tertiary-bg); }

      .liv-icon-btn {
        background: var(--bs-tertiary-bg);
        border-color: var(--bs-border-color);
        color: var(--bs-body-color);
      }
      .liv-icon-btn:hover { background: var(--bs-secondary-bg); }

      .liv-menu {
        background: var(--bs-card-bg);
        box-shadow: 0 8px 24px rgba(0, 0, 0, .5);
      }
      .liv-menu button { color: var(--bs-body-color); }
      .liv-menu button:hover { background: var(--bs-tertiary-bg); }

      .liv-page-btn {
        background: var(--bs-tertiary-bg);
        border-color: var(--bs-border-color);
        color: var(--bs-body-color);
      }
      .liv-page-btn:hover:not(:disabled):not(.active) { background: var(--bs-secondary-bg); }
      .liv-page-dots { color: var(--bs-secondary-color); }
    }
  `],
})
export class DeliveriesAdminComponent implements OnInit, OnDestroy {
  items:    DeliveryRow[] = [];
  search  = '';
  filter  = '';           // '' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
  loading = true;
  error: string | null = null;

  transports: TransportOpt[] = [];

  page = 1;
  pageSize = 5;

  totalItems = 0;
  private searchDebounce: any = null;

  // Maps construits à partir du chargement complet (dashboard), réutilisés
  // pour enrichir les lignes du tableau paginé sans refaire les 6 appels.
  private usersMap: Record<number, { name: string; email: string }> = {};
  private dealsMap: Record<number, string> = {};
  private ordersMap: Record<number, { idUser: number; idDeal: number }> = {};
  private orderVendorsMap: Record<number, number[]> = {};
  private transportsMap = new Map<number, string>();

  openMenuId: number | null = null;

  // undefined = modale fermée, null = création, DeliveryRow = édition
  editing: DeliveryRow | null | undefined = undefined;
  saving = false;
  form = {
    idTransport: null as number | null,
    trackingNumber: '',
    addressLine: '',
    city: '',
    postalCode: '',
    phone: '',
    deliveryFee: 0,
  };

  private avatarColors = ['#6c5ce7', '#0ab39c', '#f7b84b', '#f06548', '#299cdb', '#405189', '#e91e63'];
  private transporterColors = ['#405189', '#f7b84b', '#0ab39c', '#e91e63', '#299cdb', '#f06548'];

  private docClickListener = () => this.closeMenu();

  cities: { id: number; title: string }[] = [];

  constructor(private api: TijaraApiService, private deals: DealsService, private deliveries: DeliveriesService, private orders: OrdersService, private transportsApi: TransportsService, private usersVendors: UsersVendorsService, private catalogAdmin: CatalogAdminService, private payments: PaymentsService, private productsApi: ProductsService) {}

  trackByIndex(index: number): number { return index; }
  trackByDeliveryId(_i: number, d: DeliveryRow): number { return d.idDelivery; }
  trackByTransportId(_i: number, t: TransportOpt): number { return t.id; }
  trackByCityId(_i: number, c: { id: number; title: string }): number { return c.id; }

  private loadCities(): void {
    this.catalogAdmin.adminList('cities', { per_page: 200 }).subscribe({
      next: (res: any) => {
        const arr: any[] = res?.data || res || [];
        this.cities = arr
          .map((c: any) => ({
            id:     +(c.id_city ?? c.IdCity ?? c.id ?? 0),
            title:   c.title    ?? c.Title   ?? '',
            active: !!(c.active ?? c.Active  ?? true),
          }))
          .filter((c: any) => c.id > 0 && c.active)
          .sort((a: any, b: any) => a.title.localeCompare(b.title));
      },
      error: () => { this.cities = []; },
    });
  }

  ngOnInit(): void {
    this.load();
    this.loadCities();
    document.addEventListener('click', this.docClickListener);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.docClickListener);
  }

  // Chargement complet : sert uniquement aux KPI/graphiques du dashboard
  // (compteurs par statut, taux de retard, etc.) qui doivent porter sur
  // l'ensemble des livraisons, pas seulement la page affichée.
  load(): void {
    this.loading = true;
    this.error   = null;

    let failed = false;

    forkJoin({
      deliveries: this.deliveries.getDeliveries({ per_page: 200 }).pipe(catchError(() => { failed = true; return of({ data: [] }); })),
      transports: this.transportsApi.getTransports({ per_page: 200, Active: 1 }).pipe(catchError(() => { failed = true; return of({ data: [] }); })),
      orders:     this.orders.getAdminOrders({ per_page: 200 }).pipe(catchError(() => { failed = true; return of({ data: [] }); })),
      users:      this.usersVendors.getAdminAllUsers({ per_page: 200 }).pipe(catchError(() => { failed = true; return of({ data: [] }); })),
      deals:      this.deals.getDealsLookup().pipe(catchError(() => { failed = true; return of({ data: [] }); })),
      products:   this.productsApi.getAdminAllProducts({ per_page: 200 }).pipe(catchError(() => { failed = true; return of({ data: [] }); })),
      orderLines: this.orders.getOrderDetails({ per_page: 200 }).pipe(catchError(() => { failed = true; return of({ data: [] }); })),
    }).subscribe(({ deliveries, transports, orders, users, deals, products, orderLines }: any) => {
      if (failed) {
        this.error = 'Impossible de charger les livraisons. Vérifiez votre connexion ou réessayez.';
      }

      this.transports = (transports?.data || []).map((t: any) => ({
        id:   t.IdTransport,
        name: t.Name ?? 'Transport',
        fee: +(t.DeliveryFee ?? 0),
      }));
      this.transportsMap = new Map(this.transports.map((t: TransportOpt) => [t.id, t.name]));

      const usersMap: Record<number, { name: string; email: string }> = {};
      (users?.data || []).forEach((u: any) => {
        usersMap[u.IdUser] = {
          name: `${u.FirstName || ''} ${u.LastName || ''}`.trim() || u.Username || '—',
          email: u.Email || '',
        };
      });
      this.usersMap = usersMap;

      const dealsMap: Record<number, string> = {};
      (deals?.data || []).forEach((d: any) => { dealsMap[d.IdDeal] = d.titleDeal || '—'; });
      this.dealsMap = dealsMap;

      const ordersMap: Record<number, { idUser: number; idDeal: number }> = {};
      (orders?.data || []).forEach((o: any) => { ordersMap[o.IdOrder] = { idUser: o.IdUser, idDeal: o.IdDeal }; });
      this.ordersMap = ordersMap;

      // IdProduct -> vendeur (chaque produit appartient à un seul vendeur)
      const productsVendorMap: Record<number, number> = {};
      (products?.data || products || []).forEach((p: any) => { productsVendorMap[p.IdProduct] = +p.IdUser; });

      // IdOrder -> liste des vendeurs distincts impliqués dans cette commande.
      // Une commande peut regrouper des articles de plusieurs vendeurs : dans
      // ce cas il faut en principe un colis (une livraison) par vendeur.
      const orderVendorsMap: Record<number, number[]> = {};
      (orderLines?.data || []).forEach((line: any) => {
        const vId = productsVendorMap[line.IdProduct];
        if (!vId) return;
        if (!orderVendorsMap[line.IdOrder]) orderVendorsMap[line.IdOrder] = [];
        if (!orderVendorsMap[line.IdOrder].includes(vId)) orderVendorsMap[line.IdOrder].push(vId);
      });
      this.orderVendorsMap = orderVendorsMap;

      this.items = (deliveries?.data || []).map((x: any) => this.mapDelivery(x))
        .sort((a: DeliveryRow, b: DeliveryRow) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      this.recomputeStats();
      this.loadTable();
    });
  }

  private mapDelivery(x: any): DeliveryRow {
    const order  = this.ordersMap[x.IdOrder];
    const client = order ? this.usersMap[order.idUser] : undefined;
    const name   = client?.name || `Commande #${x.IdOrder}`;
    const hash   = name.split('').reduce((h: number, c: string) => h + c.charCodeAt(0), 0);
    const vendorIds = this.orderVendorsMap[x.IdOrder] || [];
    return {
      idDelivery:    x.IdDelivery,
      idOrder:       x.IdOrder,
      clientName:    name,
      clientEmail:   client?.email || '',
      dealTitle:     order ? (this.dealsMap[order.idDeal] || '—') : '—',
      vendorNames:   vendorIds.map(id => this.usersMap[id]?.name || `Vendeur #${id}`),
      multiVendor:   vendorIds.length > 1,
      idTransport:   x.IdTransport ?? null,
      transportName: x.IdTransport ? (this.transportsMap.get(x.IdTransport) || '—') : '—',
      trackingNumber:x.TrackingNumber ?? '',
      status:        x.Status ?? 'Pending',
      addressLine:   x.AddressLine ?? '',
      city:          x.City ?? '',
      postalCode:    x.PostalCode ?? '',
      phone:         x.Phone ?? '',
      deliveryFee:  +(x.DeliveryFee ?? 0),
      createdAt:     x.CreatedAt ?? null,
      shippedAt:     x.EstimatedAt ?? null,
      estimatedAt:   x.EstimatedAt ?? null,
      clientInitials: name.split(' ').map((w: string) => w[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || '—',
      clientColor:    this.avatarColors[hash % this.avatarColors.length],
    } as DeliveryRow;
  }

  // Table paginée/recherchée/filtrée côté backend — distincte du chargement
  // complet ci-dessus qui alimente uniquement les KPI/graphiques.
  private buildTableParams(): any {
    const params: any = { page: this.page, per_page: this.pageSize };
    if (this.search.trim()) params.search = this.search.trim();
    if (this.filter === 'preparing') params.Status = 'Pending';
    else if (this.filter === 'shipped') params.Status = 'In Transit';
    else if (this.filter === 'delivered') params.Status = 'Delivered';
    // 'cancelled' regroupe deux statuts (Failed/Returned) — non filtrable en un
    // seul paramètre backend, laissé en clair côté client pour ce cas précis.
    return params;
  }

  loadTable(): void {
    this.deliveries.getDeliveries(this.buildTableParams()).subscribe({
      next: (res: any) => {
        let rows: DeliveryRow[] = (res?.data || []).map((x: any) => this.mapDelivery(x));
        if (this.filter === 'cancelled') {
          rows = rows.filter(d => d.status === 'Failed' || d.status === 'Returned');
        }
        this.paginated  = rows;
        this.totalItems = res?.total        ?? rows.length;
        this.totalPages = res?.last_page    ?? 1;
        this.page       = res?.current_page ?? this.page;
        this.pageStart  = this.totalItems === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
        this.pageEnd    = Math.min(this.page * this.pageSize, this.totalItems);
        this.recomputePageNumbers();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onSearchChange(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.page = 1; this.loadTable(); }, 400);
  }

  // ── Compteurs par bucket ──
  preparingCount = 0;
  transitCount = 0;
  deliveredCount = 0;
  cancelledCount = 0;
  countOf(s: string): number { return this.items.filter(d => d.status === s).length; }

  pct(n: number): string {
    if (!this.items.length) return '0';
    return ((n / this.items.length) * 100).toFixed(1);
  }

  donutGradient = '';
  onTimeRate = 100;
  failureRate = 0;
  avgDelay = '—';
  upcomingDeliveries: DeliveryRow[] = [];
  dateRangeLabel = 'Toute la période';


  private recomputeStats(): void {
    this.preparingCount = this.items.filter(d => d.status === 'Pending').length;
    this.transitCount   = this.items.filter(d => d.status === 'In Transit').length;
    this.deliveredCount = this.items.filter(d => d.status === 'Delivered').length;
    this.cancelledCount = this.items.filter(d => d.status === 'Failed' || d.status === 'Returned').length;

    const total = this.items.length || 1;
    const segs: { color: string; count: number }[] = [
      { color: '#f7b84b', count: this.preparingCount },
      { color: '#299cdb', count: this.transitCount },
      { color: '#0ab39c', count: this.deliveredCount },
      { color: '#f06548', count: this.cancelledCount },
    ];
    let acc = 0;
    const stops: string[] = [];
    for (const s of segs) {
      const start = (acc / total) * 360;
      acc += s.count;
      const end = (acc / total) * 360;
      if (s.count > 0) stops.push(`${s.color} ${start}deg ${end}deg`);
    }
    this.donutGradient = !stops.length ? 'conic-gradient(#eef0f5 0deg 360deg)' : `conic-gradient(${stops.join(', ')})`;

    const finished = this.deliveredCount + this.cancelledCount;
    this.onTimeRate = !finished ? 100 : +((this.deliveredCount / finished) * 100).toFixed(1);
    this.failureRate = !this.items.length ? 0 : +((this.cancelledCount / this.items.length) * 100).toFixed(1);

    const delays = this.items
      .filter(d => d.status === 'Delivered' && d.shippedAt && d.estimatedAt)
      .map(d => {
        const diff = (new Date(d.estimatedAt as string).getTime() - new Date(d.shippedAt as string).getTime()) / 86400000;
        return isNaN(diff) ? null : diff;
      })
      .filter((v): v is number => v !== null);
    this.avgDelay = !delays.length ? '—' : `${(delays.reduce((a, b) => a + b, 0) / delays.length).toFixed(1)} jours`;

    // Vraies livraisons en cours (préparation/transit), triées par vraie date estimée.
    this.upcomingDeliveries = this.items
      .filter(d => d.status === 'Pending' || d.status === 'In Transit')
      .sort((a, b) => {
        const ta = a.estimatedAt ? new Date(a.estimatedAt).getTime() : Infinity;
        const tb = b.estimatedAt ? new Date(b.estimatedAt).getTime() : Infinity;
        return ta - tb;
      })
      .slice(0, 5);

    const dates = this.items.map(d => d.createdAt).filter(Boolean) as string[];
    if (!dates.length) {
      this.dateRangeLabel = 'Toute la période';
    } else {
      const min = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
      const max = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
      const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      this.dateRangeLabel = `${fmt(min)} - ${fmt(max)}`;
    }
  }

  // ── Filtrage / pagination (backend) ──
  setFilter(f: string): void { this.filter = f; this.page = 1; this.loadTable(); }

  totalPages = 1;
  paginated: DeliveryRow[] = [];
  pageStart = 0;
  pageEnd = 0;
  pageNumbers: (number | '...')[] = [];

  private recomputePageNumbers(): void {
    const total = this.totalPages, cur = this.page;
    if (total <= 7) {
      this.pageNumbers = Array.from({ length: total }, (_, i) => i + 1);
    } else {
      const pages: (number | '...')[] = [1];
      if (cur > 3) pages.push('...');
      for (let i = Math.max(2, cur); i <= Math.min(total - 1, cur + 2); i++) pages.push(i);
      if (cur < total - 2) pages.push('...');
      pages.push(total);
      this.pageNumbers = pages;
    }
  }
  goToPage(p: number): void { if (p >= 1 && p <= this.totalPages && p !== this.page) { this.page = p; this.loadTable(); } }
  changePageSize(): void { this.page = 1; this.loadTable(); }

  // ── Actions ligne ──
  toggleMenu(id: number, ev: Event): void {
    ev.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }
  closeMenu(): void { this.openMenuId = null; }

 
  changeStatus(d: DeliveryRow, newStatus: string): void {
    const old = d.status;
    d.status = newStatus;
    this.deliveries.updateDeliveryStatus(d.idDelivery, newStatus).subscribe({
      next: () => {
        this.load();
        if (newStatus === 'Delivered') {
          this.settleCashOnDeliveryPayment(d);
        }
      },
      error: () => { d.status = old; alert("Mise à jour impossible : cette route nécessite actuellement le rôle vendeur côté backend, pas admin."); },
    });
  }

  /**
   * Colis marqué livré -> si la commande a été payée en espèces à la
   * livraison (paiement "cod" non encore réglé), on l'encaisse
   * automatiquement via la route admin déjà existante POST /payments/{id}/complete.
   */
  private settleCashOnDeliveryPayment(d: DeliveryRow): void {
    if (!d.idOrder) return;
    this.payments.getAllPayments({ IdOrder: d.idOrder, Method: 'cod', per_page: 5 }).subscribe({
      next: (res: any) => {
        const rows: any[] = res?.data || res || [];
        const pending = rows.find((p: any) => (p.Status || p.status) !== 'paid');
        if (pending) {
          const id = pending.IdPayment ?? pending.id_payment ?? pending.id;
          if (id) this.payments.completePayment(id).subscribe({ error: () => {} });
        }
      },
      error: () => {},
    });
  }

  statusLabel(s: string): string {
    return s === 'Pending' ? 'En attente' : s === 'In Transit' ? 'En transit'
         : s === 'Delivered' ? 'Livrée' : s === 'Failed' ? 'Échouée'
         : s === 'Returned' ? 'Retournée' : s;
  }

  transporterColor(name: string): string {
    const hash = name.split('').reduce((h, c) => h + c.charCodeAt(0), 0);
    return this.transporterColors[hash % this.transporterColors.length];
  }

  // ── Modale ──
  openEdit(d: DeliveryRow | null): void {
    this.editing = d;
    this.form = d ? {
      idTransport:    d.idTransport,
      trackingNumber: d.trackingNumber,
      addressLine:    d.addressLine,
      city:           d.city,
      postalCode:     d.postalCode,
      phone:          d.phone,
      deliveryFee:    d.deliveryFee,
    } : {
      idTransport: null, trackingNumber: '', addressLine: '',
      city: '', postalCode: '', phone: '', deliveryFee: 0,
    };
  }
  closeEdit(_ev?: Event): void { this.editing = undefined; this.saving = false; }
  onTransportChange(): void {
    const t = this.transports.find(x => x.id === this.form.idTransport);
    if (t && (!this.form.deliveryFee || this.form.deliveryFee === 0)) this.form.deliveryFee = t.fee;
  }

  saveEdit(): void {
    if (!this.editing) { this.closeEdit(); return; } // création: à brancher sur l'API dédiée si besoin
    const d = this.editing;
    this.saving = true;
    this.deliveries.updateDelivery(d.idDelivery, {
      IdTransport:    this.form.idTransport,
      TrackingNumber: this.form.trackingNumber,
      AddressLine:    this.form.addressLine,
      City:           this.form.city,
      PostalCode:     this.form.postalCode,
      Phone:          this.form.phone,
      DeliveryFee:    +this.form.deliveryFee || 0,
    }).subscribe({
      next: () => { this.saving = false; this.closeEdit(); this.load(); },
      error: (err) => { this.saving = false; alert("Enregistrement impossible : cette route nécessite actuellement le rôle vendeur côté backend, pas admin."); },
    });
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}