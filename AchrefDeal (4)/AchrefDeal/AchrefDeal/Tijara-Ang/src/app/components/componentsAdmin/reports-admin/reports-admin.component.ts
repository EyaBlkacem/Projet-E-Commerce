import { Component, OnInit } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { DeliveriesService } from 'src/app/core/services/deliveries.service';
import { InvoicesService } from 'src/app/core/services/invoices.service';
import { OrdersService } from 'src/app/core/services/orders.service';
import { ProductsService } from 'src/app/core/services/products.service';
import { UsersVendorsService } from 'src/app/core/services/users-vendors.service';

interface KpiCard {
  key: string;
  label: string;
  value: string | number;
  icon: string;
  iconBg: string;    // fond pastel de l'icône
  iconColor: string; // couleur de l'icône + du sparkline
  spark: string;      // points du mini-graphique
  trendText: string | null;
  trendUp: boolean;
}

interface StatusStat {
  key: string;
  label: string;
  count: number;
  color: string; // classe Bootstrap: warning, info, success, danger
  hex: string;
  icon: string;
}

interface PaymentMethodRow {
  label: string;
  percent: number;
  amount: number;
  hex: string;
}

interface ActivityRow {
  icon: string;
  color: string;
  text: string;
  time: string;
}

@Component({
  selector: 'app-reports-admin',
  standalone: false,
  template: `
<div class="reports-page">

  <!-- ===== En-tête ===== -->
  <app-breadcrumbs title="Rapports & Analytics" [breadcrumbItems]="breadcrumbItems"></app-breadcrumbs>

  <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4 mt-n2">
    <p class="text-muted mb-0">Analysez la performance de votre boutique en temps réel</p>

    <div class="d-flex align-items-center gap-2 flex-wrap">
      <div class="rpt-date-range">
        <i class="ri-calendar-line text-muted ms-2 me-1"></i>
        <input type="date" class="rpt-date-input" [(ngModel)]="dateFrom" [max]="dateTo || undefined" />
        <span class="text-muted">–</span>
        <input type="date" class="rpt-date-input" [(ngModel)]="dateTo" [min]="dateFrom || undefined" />
        <button class="btn btn-primary btn-sm fw-semibold ms-1" (click)="applyDateRange()" [disabled]="loadingOverview">
          <span *ngIf="loadingOverview" class="spinner-border spinner-border-sm me-1"></span>Appliquer
        </button>
      </div>
      <button class="btn btn-light btn-sm fw-semibold" (click)="openFilters()">
        <i class="ri-filter-3-line me-1"></i>Filtres
      </button>
      <div class="btn-group">
        <button class="btn btn-primary btn-sm fw-semibold dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
          <i class="ri-download-2-line me-1"></i>Exporter
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><a class="dropdown-item" (click)="exportCSV()"><i class="ri-file-excel-2-line me-2"></i>Export CSV</a></li>
          <li><a class="dropdown-item" (click)="exportPDF()"><i class="ri-file-pdf-2-line me-2"></i>Export PDF</a></li>
        </ul>
      </div>
    </div>
  </div>

  <!-- ===== KPI cards ===== -->
  <div class="row g-3 mb-3">
    @for (k of kpis; track k.key) {
      <div class="col-6 col-lg-3">
        <div class="kpi-white-card">
          <div class="kpi-top">
            <span class="kpi-icon" [style.background]="k.iconBg" [style.color]="k.iconColor">
              <i [class]="k.icon"></i>
            </span>
            @if (k.trendText) {
              <span class="kpi-trend" [class.down]="!k.trendUp">
                <i [class]="k.trendUp ? 'ri-arrow-right-up-line' : 'ri-arrow-right-down-line'"></i>{{ k.trendText }}
              </span>
            }
          </div>
          <div class="kpi-label">{{ k.label }}</div>
          <div class="kpi-value">{{ k.value }}</div>
          <div class="kpi-sub">ce mois</div>
          <svg class="kpi-spark" viewBox="0 0 100 30" preserveAspectRatio="none">
            <polyline [attr.points]="k.spark" fill="none" [attr.stroke]="k.iconColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
    }
  </div>

  <div class="row g-3 mb-3">
    <!-- ===== Évolution des ventes ===== -->
    <div class="col-xl-8">
      <div class="card border-0 shadow-sm h-100">
        <div class="card-header bg-transparent d-flex align-items-center justify-content-between">
          <h6 class="mb-0 fw-semibold"><i class="ri-line-chart-line me-2 text-primary"></i>Évolution des ventes</h6>
          <span class="fs-12 text-muted">12 derniers mois <i class="ri-arrow-down-s-line"></i></span>
        </div>
        <div class="card-body d-flex flex-column">
          @if (salesByMonth.length === 0) {
            <p class="text-muted text-center py-5 mb-0">Aucune donnée de ventes.</p>
          } @else {
            <div class="d-flex flex-wrap gap-4 mb-4">
              <div>
                <div class="fs-20 fw-bold text-body">{{ totalRevenue | number:'1.0-0' }} TND</div>
                <div class="fs-12 text-muted">Revenu total</div>
              </div>
              <div>
                <div class="fs-20 fw-bold text-body">{{ totalOrdersPeriod | number:'1.0-0' }}</div>
                <div class="fs-12 text-muted">Commandes</div>
              </div>
              <div>
                <div class="fs-20 fw-bold text-body">{{ averageBasket | number:'1.0-0' }} TND</div>
                <div class="fs-12 text-muted">Panier moyen</div>
              </div>
            </div>

            <div class="rpt-chart-wrap flex-grow-1">
              <div class="rpt-chart-yaxis">
                @for (lbl of chartYLabels; track $index) {
                  <span>{{ lbl }}</span>
                }
              </div>
              <div class="rpt-chart-svg-wrap">
                <svg viewBox="0 0 760 200" preserveAspectRatio="none" class="rpt-chart-svg">
                  <defs>
                    <linearGradient id="rptSalesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#405189" stop-opacity="0.28"/>
                      <stop offset="100%" stop-color="#405189" stop-opacity="0"/>
                    </linearGradient>
                  </defs>
                  @for (lbl of chartYLabels; track $index) {
                    <line [attr.x1]="0" [attr.y1]="$index * 40" [attr.x2]="760" [attr.y2]="$index * 40"
                          stroke="var(--bs-border-color)" stroke-width="1" stroke-dasharray="4 4"/>
                  }
                  <path [attr.d]="salesAreaPath" fill="url(#rptSalesGrad)"/>
                  <path [attr.d]="salesLinePath" fill="none" stroke="#405189" stroke-width="2.5"/>
                  @for (p of salesPoints; track $index) {
                    <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3.5" fill="#405189" stroke="var(--bs-card-bg)" stroke-width="1.5">
                      <title>{{ monthLabel(p.month) }} — {{ p.revenue | number:'1.0-0' }} TND</title>
                    </circle>
                  }
                </svg>
              </div>
            </div>
            <div class="rpt-chart-xaxis">
              @for (m of salesByMonth; track m.month) {
                <span>{{ monthLabel(m.month) }}</span>
              }
            </div>
          }
        </div>
      </div>
    </div>

    <!-- ===== Colonne droite : aperçu rapide + top produits ===== -->
    <div class="col-xl-4 d-flex flex-column gap-3">
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-transparent">
          <h6 class="mb-0 fw-semibold"><i class="ri-flashlight-line me-2 text-primary"></i>Aperçu rapide</h6>
        </div>
        <div class="card-body py-3">
          <div class="d-flex justify-content-between">
            @for (s of statusBreakdown; track s.key) {
              <div class="rpt-quick-item">
                <span class="avatar-xs rounded-circle d-flex align-items-center justify-content-center mb-1"
                      [class]="'bg-' + s.color + '-subtle text-' + s.color">
                  <i [class]="s.icon + ' fs-13'"></i>
                </span>
                <div class="fs-10 text-muted">{{ s.label }}</div>
                <div class="fs-16 fw-bold" [class]="'text-' + s.color">{{ s.count }}</div>
              </div>
            }
          </div>
        </div>
      </div>

      <div class="card border-0 shadow-sm">
        <div class="card-header bg-transparent">
          <h6 class="mb-0 fw-semibold"><i class="ri-star-line me-2 text-warning"></i>Top 5 produits</h6>
        </div>
        <div class="card-body p-0">
          @if (topProducts.length === 0) {
            <p class="text-muted text-center py-4 mb-0">Aucune vente.</p>
          } @else {
            <ul class="list-group list-group-flush">
              @for (p of topProducts.slice(0, 5); track p.id; let i = $index) {
                <li class="list-group-item">
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <span class="rpt-rank">{{ i + 1 }}</span>
                    <div class="flex-grow-1 text-truncate">
                      <span class="fw-semibold fs-13">{{ p.title }}</span>
                    </div>
                    <span class="fs-12 text-muted flex-shrink-0">{{ p.price }} TND</span>
                  </div>
                  <div class="d-flex align-items-center gap-2">
                    <div class="progress flex-grow-1" style="height:6px">
                      <div class="progress-bar bg-primary" [style.width.%]="(p.sold / maxTopProductSold) * 100"></div>
                    </div>
                    <span class="fs-11 text-muted flex-shrink-0">{{ p.sold }} ventes</span>
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      </div>
    </div>
  </div>

  <!-- ===== Méthodes de paiement / Commandes par statut / Activité récente ===== -->
  <div class="row g-3 mb-3">
    <div class="col-md-6 col-xl-4">
      <div class="card border-0 shadow-sm h-100">
        <div class="card-header bg-transparent">
          <h6 class="mb-0 fw-semibold"><i class="ri-bank-card-2-line me-2 text-primary"></i>Méthodes de paiement</h6>
        </div>
        <div class="card-body">
          @if (paymentMethods.length === 0) {
            <p class="text-muted text-center py-4 mb-0">Aucune donnée.</p>
          } @else {
            <div class="d-flex align-items-center gap-4">
              <svg viewBox="0 0 100 100" class="rpt-donut">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bs-tertiary-bg)" stroke-width="14"/>
                @for (seg of paymentDonutSegments; track $index) {
                  <circle cx="50" cy="50" r="42" fill="none" [attr.stroke]="seg.color" stroke-width="14"
                          [attr.stroke-dasharray]="seg.dasharray" [attr.stroke-dashoffset]="seg.dashoffset"
                          transform="rotate(-90 50 50)"/>
                }
              </svg>
              <ul class="list-unstyled mb-0 flex-grow-1">
                @for (pm of paymentMethods; track pm.label) {
                  <li class="d-flex align-items-center gap-2 mb-2">
                    <span class="rpt-dot" [style.background]="pm.hex"></span>
                    <span class="fs-12 flex-grow-1">{{ pm.label }}</span>
                    <span class="fs-12 fw-semibold">{{ pm.percent }}%</span>
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      </div>
    </div>

    <div class="col-md-6 col-xl-4">
      <div class="card border-0 shadow-sm h-100">
        <div class="card-header bg-transparent">
          <h6 class="mb-0 fw-semibold"><i class="ri-pie-chart-2-line me-2 text-primary"></i>Commandes par statut</h6>
        </div>
        <div class="card-body">
          <div class="d-flex align-items-center gap-4">
            <div class="rpt-donut-wrap">
              <svg viewBox="0 0 100 100" class="rpt-donut">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bs-tertiary-bg)" stroke-width="14"/>
                @for (seg of statusDonutSegments; track $index) {
                  <circle cx="50" cy="50" r="42" fill="none" [attr.stroke]="seg.color" stroke-width="14"
                          [attr.stroke-dasharray]="seg.dasharray" [attr.stroke-dashoffset]="seg.dashoffset"
                          transform="rotate(-90 50 50)"/>
                }
              </svg>
              <div class="rpt-donut-center">
                <div class="fs-18 fw-bold">{{ totalOrdersStatus }}</div>
                <div class="fs-10 text-muted">Total</div>
              </div>
            </div>
            <ul class="list-unstyled mb-0 flex-grow-1">
              @for (s of statusBreakdown; track s.key) {
                <li class="d-flex align-items-center gap-2 mb-2">
                  <span class="rpt-dot" [style.background]="s.hex"></span>
                  <span class="fs-12 flex-grow-1">{{ s.label }}</span>
                  <span class="fs-12 fw-semibold">{{ s.count }} ({{ statusPercent(s.count) }}%)</span>
                </li>
              }
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="col-xl-4">
      <div class="card border-0 shadow-sm h-100">
        <div class="card-header bg-transparent">
          <h6 class="mb-0 fw-semibold"><i class="ri-pulse-line me-2 text-primary"></i>Activité récente</h6>
        </div>
        <div class="card-body">
          @if (recentActivity.length === 0) {
            <p class="text-muted text-center py-4 mb-0">Aucune activité récente.</p>
          } @else {
            <ul class="list-unstyled mb-0 rpt-activity-list">
              @for (a of recentActivity; track $index) {
                <li class="d-flex align-items-start gap-2 mb-3">
                  <span class="avatar-xs rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        [class]="'bg-' + a.color + '-subtle text-' + a.color">
                    <i [class]="a.icon + ' fs-13'"></i>
                  </span>
                  <div class="flex-grow-1">
                    <div class="fs-12">{{ a.text }}</div>
                    <div class="fs-10 text-muted">{{ a.time }}</div>
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      </div>
    </div>
  </div>

  <!-- ===== Meilleurs clients ===== -->
  <div class="card border-0 shadow-sm">
    <div class="card-header bg-transparent d-flex align-items-center justify-content-between">
      <h6 class="mb-0 fw-semibold"><i class="ri-user-star-line me-2 text-success"></i>Meilleurs clients</h6>
      <a href="javascript:void(0)" class="fs-13 fw-semibold text-primary text-decoration-none" (click)="viewAllCustomers()">
        Voir tous les clients <i class="ri-arrow-right-s-line"></i>
      </a>
    </div>
    <div class="card-body p-0">
      @if (topCustomers.length === 0) {
        <p class="text-muted text-center py-4 mb-0">Aucun client.</p>
      } @else {
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">#</th>
                <th>Client</th>
                <th>Email</th>
                <th class="text-center">Commandes</th>
                <th class="text-end">Dépensé (TND)</th>
                <th class="text-end pe-3">Dernière commande</th>
              </tr>
            </thead>
            <tbody>
              @for (c of pagedCustomers; track c.idUser; let i = $index) {
                <tr>
                  <td class="ps-3 fw-bold text-primary">#{{ (currentPage - 1) * pageSize + i + 1 }}</td>
                  <td>{{ c.name }}</td>
                  <td class="fs-12 text-muted">{{ c.email }}</td>
                  <td class="text-center"><span class="badge bg-primary-subtle text-primary">{{ c.orders }}</span></td>
                  <td class="text-end fw-bold text-success">{{ c.totalSpent | number:'1.2-2' }} TND</td>
                  <td class="text-end pe-3 fs-12 text-muted">{{ formatDate(c.lastOrderAt) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
    @if (topCustomers.length > 0) {
      <div class="card-footer bg-transparent d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
        <span class="text-muted fs-13">Affichage de {{ rangeStart }} à {{ rangeEnd }} sur {{ topCustomers.length }} clients</span>
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
          <option [ngValue]="5">5 / page</option>
          <option [ngValue]="10">10 / page</option>
          <option [ngValue]="25">25 / page</option>
        </select>
      </div>
    }
  </div>
</div>
`,
  styles: [`
.reports-page { padding-bottom: 1rem; }

/* ---- Animation au survol pour toutes les cartes ---- */
.reports-page .card,
.kpi-white-card {
  transition: transform .18s ease, box-shadow .18s ease;
}
.reports-page .card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 26px -8px rgba(0, 0, 0, .18) !important;
}
.kpi-white-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 28px -8px rgba(0, 0, 0, .16);
}

/* ---- KPI cards (fond blanc, icône pastel, badge de tendance) ---- */
.kpi-white-card {
  position: relative;
  background: var(--bs-card-bg);
  border-radius: 18px;
  padding: 20px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, .06);
}
.kpi-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.kpi-icon {
  width: 48px; height: 48px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px;
}
.kpi-trend {
  font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px;
  background: #dcfce7; color: #16a34a;
  display: inline-flex; align-items: center; gap: 2px; white-space: nowrap;
}
.kpi-trend.down { background: #fee2e2; color: #dc2626; }
.kpi-label { font-size: 11px; font-weight: 700; letter-spacing: .05em; color: var(--bs-secondary-color); text-transform: uppercase; margin-bottom: 6px; }
.kpi-value { font-size: 32px; font-weight: 800; color: var(--bs-emphasis-color); line-height: 1; margin-bottom: 4px; }
.kpi-sub { font-size: 12px; color: var(--bs-secondary-color); margin-bottom: 14px; }
.kpi-spark { width: 100%; height: 32px; display: block; }

/* ---- Aperçu rapide (ligne compacte) ---- */
.rpt-quick-item { display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1; }

/* ---- Date range ---- */
.rpt-date-range {
  display: flex; align-items: center; gap: 4px;
  border: 1px solid var(--bs-border-color); border-radius: 6px;
  padding: 3px 8px; background: var(--bs-card-bg);
}
.rpt-date-input {
  border: none; outline: none; font-size: 12.5px; color: var(--bs-body-color);
  background: transparent; max-width: 118px;
}

/* ---- Sales chart ---- */
.rpt-chart-wrap { display: flex; gap: 10px; min-height: 200px; }
.rpt-chart-yaxis {
  display: flex; flex-direction: column; justify-content: space-between;
  font-size: 11px; color: var(--bs-secondary-color); padding-bottom: 2px; text-align: right; min-width: 30px;
}
.rpt-chart-svg-wrap { flex: 1; min-width: 0; }
.rpt-chart-svg { width: 100%; height: 100%; min-height: 200px; display: block; }
.rpt-chart-xaxis {
  display: flex; justify-content: space-between; margin-left: 40px;
  font-size: 10.5px; color: var(--bs-secondary-color); margin-top: 6px;
}

/* ---- Top produits ---- */
.rpt-rank {
  width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0;
  background: var(--bs-tertiary-bg); color: var(--bs-secondary-color);
  font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}

/* ---- Donuts ---- */
.rpt-donut { width: 110px; height: 110px; flex-shrink: 0; }
.rpt-donut-wrap { position: relative; width: 110px; height: 110px; flex-shrink: 0; }
.rpt-donut-center {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center;
}
.rpt-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; display: inline-block; }

/* ---- Activité récente ---- */
.rpt-activity-list { max-height: 260px; overflow-y: auto; }

/* ═════════════════════════════════════════════════
   Adaptation Dark Mode (même logique que annonces-admin / invoices-admin)
   La majorité des éléments utilisent déjà les classes Bootstrap/Velzon
   (bg-*-subtle, text-*, var(--bs-*)) qui s'adaptent nativement au thème.
   Seules les couleurs pastel codées en dur ci-dessous ont besoin d'une
   surcharge explicite.
   ═════════════════════════════════════════════════ */
:host-context([data-bs-theme="dark"]) {
  .card { box-shadow: 0 2px 12px rgba(0, 0, 0, .35) !important; }
  .kpi-white-card { box-shadow: 0 2px 12px rgba(0, 0, 0, .35); }
  .kpi-white-card:hover { box-shadow: 0 14px 28px -8px rgba(0, 0, 0, .5); }
  .kpi-trend      { background: rgba(22, 163, 74, .18); color: #4ade80; }
  .kpi-trend.down { background: rgba(220, 38, 38, .18); color: #f87171; }
}
`],
})
export class ReportsAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Rapports & Analytics', active: true }];
  breadcrumbItems = this.breadCrumbItems; // alias conservé pour compatibilité

  overview: any = {};
  salesByMonth: any[] = [];
  topProducts: any[] = [];
  topCustomers: any[] = [];
  paymentMethods: PaymentMethodRow[] = [];
  recentActivity: ActivityRow[] = [];

  dateFrom: string | null = null;
  dateTo: string | null = null;
  loadingOverview = false;

  currentPage = 1;
  pageSize = 5;

  private statusColors: Record<string, string> = {
    warning: '#f7b84b',
    info: '#299cdb',
    success: '#0ab39c',
    danger: '#f06548',
  };
  private paymentPalette = ['#405189', '#0ab39c', '#f7b84b', '#f06548', '#8b7cf6'];

  maxRevenue = 1;
  chartYLabels: string[] = [];
  salesPoints: { x: number; y: number; month: string; revenue: number }[] = [];
  salesLinePath = '';
  salesAreaPath = '';
  totalRevenue = 0;
  totalOrdersPeriod = 0;
  averageBasket = 0;
  maxTopProductSold = 1;
  kpis: KpiCard[] = [];
  statusBreakdown: StatusStat[] = [];
  totalOrdersStatus = 0;
  statusDonutSegments: { color: string; dasharray: string; dashoffset: number }[] = [];
  paymentDonutSegments: { color: string; dasharray: string; dashoffset: number }[] = [];

 
  private recomputeCharts(): void {
    this.maxRevenue = Math.max(1, ...this.salesByMonth.map(m => +m.revenue || 0));

    const magnitude = Math.pow(10, Math.floor(Math.log10(this.maxRevenue || 1)));
    const niceMax = Math.ceil(this.maxRevenue / magnitude) * magnitude || 1000;

    const steps = 5;
    const labels: string[] = [];
    for (let i = steps; i >= 0; i--) {
      const v = (niceMax / steps) * i;
      labels.push(v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(0));
    }
    this.chartYLabels = labels;

    const data = this.salesByMonth;
    const w = 760, h = 200;
    this.salesPoints = !data.length ? [] : data.map((m, i) => ({
      x: data.length === 1 ? 0 : (i / (data.length - 1)) * w,
      y: h - ((+m.revenue || 0) / niceMax) * h,
      month: m.month,
      revenue: +m.revenue || 0,
    }));
    this.salesLinePath = this.salesPoints.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
    this.salesAreaPath = !this.salesPoints.length ? '' :
      `M0,${h} L` + this.salesPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L') + ` L${w},${h} Z`;

    this.totalRevenue      = this.overview.totalRevenue ?? this.salesByMonth.reduce((s, m) => s + (+m.revenue || 0), 0);
    this.totalOrdersPeriod = this.overview.totalOrders  ?? this.salesByMonth.reduce((s, m) => s + (+m.orders  || 0), 0);
    this.averageBasket     = this.totalOrdersPeriod > 0 ? this.totalRevenue / this.totalOrdersPeriod : 0;
    this.maxTopProductSold = Math.max(1, ...this.topProducts.slice(0, 5).map(p => +p.sold || 0));

    const o = this.overview;
    let revenueTrend: number | null = null;
    if (this.salesByMonth.length >= 2) {
      const prev = +this.salesByMonth[this.salesByMonth.length - 2].revenue || 0;
      const curr = +this.salesByMonth[this.salesByMonth.length - 1].revenue || 0;
      if (prev > 0) {
        const pct = +(((curr - prev) / prev) * 100).toFixed(1);
        revenueTrend = Math.abs(pct) > 300 || !isFinite(pct) ? null : pct;
      }
    }

    this.kpis = [
      {
        key: 'orders', label: 'Commandes', value: o.totalOrders ?? 0,
        icon: 'ri-shopping-bag-3-line', iconBg: '#ece9fe', iconColor: '#6249e8',
        spark: '0,28 15,24 30,26 45,16 60,18 75,8 100,4',
        trendText: o.ordersTrend != null ? `+${o.ordersTrend}%` : null,
        trendUp: (o.ordersTrend ?? 0) >= 0,
      },
      {
        key: 'revenue', label: 'Revenus (TND)', value: (o.totalRevenue ?? 0).toLocaleString(),
        icon: 'ri-money-dollar-circle-line', iconBg: '#e0f9f5', iconColor: '#0ab39c',
        spark: '0,26 15,22 30,24 45,14 60,20 75,10 100,6',
        trendText: revenueTrend != null ? `${revenueTrend > 0 ? '+' : ''}${revenueTrend}%` : null,
        trendUp: (revenueTrend ?? 0) >= 0,
      },
      {
        key: 'products', label: 'Produits', value: o.totalProducts ?? 0,
        icon: 'ri-box-3-line', iconBg: '#e8f2ff', iconColor: '#2b8fd6',
        spark: '0,24 15,20 30,22 45,12 60,16 75,6 100,10',
        trendText: o.newProducts != null ? `+${o.newProducts}` : null,
        trendUp: true,
      },
      {
        key: 'users', label: 'Utilisateurs', value: o.activeUsers ?? 0,
        icon: 'ri-group-line', iconBg: '#fff3e0', iconColor: '#f7a53b',
        spark: '0,10 15,18 30,14 45,22 60,16 75,24 100,20',
        trendText: o.usersTrend != null ? `+${o.usersTrend}%` : null,
        trendUp: (o.usersTrend ?? 0) >= 0,
      },
    ];

    this.statusBreakdown = [
      { key: 'pending',    label: 'En attente', count: +(o.pendingOrders ?? o.ordersPending ?? 0),       color: 'warning', hex: this.statusColors['warning'], icon: 'ri-time-line' },
      { key: 'processing', label: 'En cours',    count: +(o.processingOrders ?? o.ordersProcessing ?? 0), color: 'info',    hex: this.statusColors['info'],    icon: 'ri-shopping-cart-2-line' },
      { key: 'delivered',  label: 'Livrées',     count: +(o.deliveredOrders ?? o.ordersDelivered ?? 0),   color: 'success', hex: this.statusColors['success'], icon: 'ri-checkbox-circle-line' },
      { key: 'cancelled',  label: 'Annulées',    count: +(o.cancelledOrders ?? o.ordersCancelled ?? 0),   color: 'danger',  hex: this.statusColors['danger'],  icon: 'ri-close-circle-line' },
    ];
    this.totalOrdersStatus = this.statusBreakdown.reduce((s, x) => s + x.count, 0);

    const total = this.totalOrdersStatus;
    this.statusDonutSegments = this.donutSegments(
      this.statusBreakdown.map(s => ({ percent: total > 0 ? (s.count / total) * 100 : 0, hex: s.hex }))
    );
    this.paymentDonutSegments = this.donutSegments(this.paymentMethods.map(p => ({ percent: p.percent, hex: p.hex })));

    this.recomputePagination();
  }

  totalPages   = 1;
  rangeStart   = 0;
  rangeEnd     = 0;
  pagedCustomers: any[] = [];
  pageNumbers: number[] = [];

  private recomputePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.topCustomers.length / this.pageSize));
    this.rangeStart = this.topCustomers.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    this.rangeEnd   = Math.min(this.currentPage * this.pageSize, this.topCustomers.length);
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedCustomers = this.topCustomers.slice(start, start + this.pageSize);
    this.pageNumbers = Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  setPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.currentPage = p;
    this.recomputePagination();
  }
  changePageSize(size: number): void {
    this.pageSize = +size;
    this.currentPage = 1;
    this.recomputePagination();
  }

  statusPercent(count: number): number {
    const total = this.totalOrdersStatus;
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  private donutSegments(items: { percent: number; hex: string }[]): { color: string; dasharray: string; dashoffset: number }[] {
    const r = 42;
    const circ = 2 * Math.PI * r;
    let acc = 0;
    return items.map(it => {
      const len = (it.percent / 100) * circ;
      const seg = { color: it.hex, dasharray: `${len} ${circ - len}`, dashoffset: -acc };
      acc += len;
      return seg;
    });
  }

 

  private total(meta: any): number {
    if (!meta) return 0;
    if (typeof meta.total === 'number') return meta.total;
    if (Array.isArray(meta.data)) return meta.data.length;
    return 0;
  }

  constructor(private api: TijaraApiService, private deliveries: DeliveriesService, private invoices: InvoicesService, private orders: OrdersService, private products: ProductsService, private usersVendors: UsersVendorsService) {}

  ngOnInit(): void {
    const now = new Date();
    const year = now.getFullYear();
    const pad = (n: number) => String(n).padStart(2, '0');
    const monthStart = `${year}-${pad(now.getMonth() + 1)}-01`;
    const monthEnd   = `${year}-${pad(now.getMonth() + 1)}-${pad(new Date(year, now.getMonth() + 1, 0).getDate())}`;

    this.dateFrom = monthStart;
    this.dateTo   = monthEnd;

    this.loadOverview(monthStart, monthEnd);

    const anyApi = this.api as any;
    if (typeof anyApi.getPaymentMethods === 'function') {
      anyApi.getPaymentMethods().subscribe({
        next: (r: any[]) => {
          const rows = (r || []).map((x: any) => this.normalize(x));
          this.paymentMethods = rows.map((x: any, i: number) => ({
            label: x.label ?? x.method ?? '—',
            percent: +(x.percent ?? 0),
            amount: +(x.amount ?? 0),
            hex: this.paymentPalette[i % this.paymentPalette.length],
          }));
          this.paymentDonutSegments = this.donutSegments(this.paymentMethods.map(p => ({ percent: p.percent, hex: p.hex })));
        },
        error: () => { this.paymentMethods = []; this.paymentDonutSegments = []; },
      });
    }
    if (typeof anyApi.getRecentActivity === 'function') {
      anyApi.getRecentActivity(8).subscribe({
        next: (r: any[]) => {
          const rows = (r || []).map((x: any) => this.normalize(x));
          this.recentActivity = rows.map((x: any) => ({
            icon: x.icon ?? 'ri-notification-3-line',
            color: x.color ?? 'primary',
            text: x.text ?? x.message ?? '',
            time: x.time ?? x.timeAgo ?? '',
          }));
        },
        error: () => { this.recentActivity = []; },
      });
    }
  }

  /** Recharge les indicateurs du rapport pour la période sélectionnée (date début / date fin). */
  applyDateRange(): void {
    if (!this.dateFrom || !this.dateTo) return;
    if (this.dateFrom > this.dateTo) {
      // Bornes inversées par l'utilisateur : on les remet dans l'ordre.
      const tmp = this.dateFrom; this.dateFrom = this.dateTo; this.dateTo = tmp;
    }
    this.loadOverview(this.dateFrom, this.dateTo);
  }

  private loadOverview(periodStart: string, periodEnd: string): void {
    const deliveryStatuses = ['Pending', 'In Transit', 'Delivered', 'Failed', 'Returned'];
    this.loadingOverview = true;

    forkJoin({
      ordersThisMonthMeta: this.orders.getAdminOrders({ per_page: 1, DateTimeCommand_min: periodStart, DateTimeCommand_max: periodEnd }).pipe(catchError(() => of(null))),
      ordersTotalMeta:     this.orders.getAdminOrders({ per_page: 1 }).pipe(catchError(() => of(null))),
      productsMeta:        this.products.getAdminAllProducts({ per_page: 1, Active: 1 }).pipe(catchError(() => of(null))),
      usersThisMonthMeta:  this.usersVendors.getAdminAllUsers({ per_page: 1, CreationDate_min: periodStart, CreationDate_max: periodEnd }).pipe(catchError(() => of(null))),
      usersTotalMeta:      this.usersVendors.getAdminAllUsers({ per_page: 1 }).pipe(catchError(() => of(null))),
      invoicesAll:         this.invoices.getAdminInvoices({}).pipe(catchError(() => of({ count: 0, data: [] } as any))),
      deliveryStatusCounts: forkJoin(
        deliveryStatuses.map(st => this.deliveries.getDeliveries({ per_page: 1, Status: st }).pipe(catchError(() => of(null))))
      ),
    }).subscribe((res: any) => {
      this.loadingOverview = false;
      this.applyRealReports(res, periodStart, periodEnd, deliveryStatuses);
    });
  }

  private applyRealReports(res: any, monthStart: string, monthEnd: string, deliveryStatuses: string[]): void {
    const invoicesData: any[] = res.invoicesAll?.data || [];
    const paidInvoices = invoicesData.filter((i: any) => (i.Status || '').toLowerCase() === 'paid');
    const isInMonth = (dateStr: string) => {
      if (!dateStr) return false;
      const d = ('' + dateStr).slice(0, 10);
      return d >= monthStart && d <= monthEnd;
    };
    const revenueThisMonth = paidInvoices
      .filter((i: any) => isInMonth(i.IssuedAt))
      .reduce((s: number, i: any) => s + (+i.Total || 0), 0);

    const ordersThisMonth = this.total(res.ordersThisMonthMeta);
    const productsActive  = this.total(res.productsMeta);
    const usersThisMonth  = this.total(res.usersThisMonthMeta);

    // ── Statuts livraison réels, mappés sur les 4 catégories du widget
    // "Aperçu rapide" : Pending→En attente, In Transit→En cours,
    // Delivered→Livrées, Failed+Returned→Annulées. ──
    const statusMeta: any[] = res.deliveryStatusCounts || [];
    const counts: Record<string, number> = {};
    deliveryStatuses.forEach((st, i) => counts[st] = this.total(statusMeta[i]));

    this.overview = {
      totalOrders: ordersThisMonth,
      ordersTrend: null,
      totalRevenue: Math.round(revenueThisMonth),
      totalProducts: productsActive,
      newProducts: null,
      activeUsers: usersThisMonth,
      usersTrend: null,
      pendingOrders:    counts['Pending'] || 0,
      processingOrders: counts['In Transit'] || 0,
      deliveredOrders:  counts['Delivered'] || 0,
      cancelledOrders:  (counts['Failed'] || 0) + (counts['Returned'] || 0),
    };

   
    const year = +monthStart.slice(0, 4);
    const monthlyRevenue = Array(12).fill(0);
    const monthlyOrders  = Array(12).fill(0);
    invoicesData.forEach((inv: any) => {
      const d = new Date(inv.IssuedAt);
      if (isNaN(d.getTime()) || d.getFullYear() !== year) return;
      const mIdx = d.getMonth();
      monthlyOrders[mIdx] += 1;
      if ((inv.Status || '').toLowerCase() === 'paid') monthlyRevenue[mIdx] += (+inv.Total || 0);
    });
    this.salesByMonth = Array.from({ length: 12 }, (_, i) => ({
      month: `${year}-${String(i + 1).padStart(2, '0')}`,
      revenue: Math.round(monthlyRevenue[i]),
      orders: monthlyOrders[i],
    }));


    const productAgg = new Map<number, { id: number; title: string; price: number; sold: number }>();
    invoicesData.forEach((inv: any) => {
      const details = inv.order?.details || [];
      details.forEach((d: any) => {
        const prod = d.product;
        const id = prod?.IdProduct ?? d.IdProduct;
        if (!id) return;
        const entry = productAgg.get(id) || {
          id, title: prod?.TitleProduct || `Produit #${id}`,
          price: +(prod?.PriceProduct ?? d.UnitPrice ?? 0), sold: 0,
        };
        entry.sold += +(d.Quantity || 0);
        productAgg.set(id, entry);
      });
    });
    this.topProducts = Array.from(productAgg.values()).sort((a, b) => b.sold - a.sold).slice(0, 10);


 
    const customerAgg = new Map<number, { id: number; name: string; email: string; orders: Set<number>; totalSpent: number; lastOrderAt: string }>();
    invoicesData.forEach((inv: any) => {
      const uid = inv.IdUser;
      if (!uid) return;
      const u = inv.user;
      const entry = customerAgg.get(uid) || {
        id: uid,
        name: u ? (`${u.FirstName || ''} ${u.LastName || ''}`.trim() || u.Username || u.Email || `Utilisateur #${uid}`) : `Utilisateur #${uid}`,
        email: u?.Email || '',
        orders: new Set<number>(),
        totalSpent: 0,
        lastOrderAt: inv.IssuedAt,
      };
      entry.orders.add(inv.IdOrder);
      entry.totalSpent += (+inv.Total || 0);
      if (new Date(inv.IssuedAt) > new Date(entry.lastOrderAt)) entry.lastOrderAt = inv.IssuedAt;
      customerAgg.set(uid, entry);
    });
    this.topCustomers = Array.from(customerAgg.values())
      .map(c => ({ id: c.id, name: c.name, email: c.email, orders: c.orders.size, totalSpent: c.totalSpent, lastOrderAt: c.lastOrderAt }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 50);
    this.currentPage = 1;
    this.recomputeCharts();
  }

  monthLabel(m: string): string {
    if (!m) return '';
    const match = /^(\d{4})-?(\d{2})$/.exec(m);
    if (!match) return m;
    const d = new Date(+match[1], +match[2] - 1, 1);
    const label = d.toLocaleDateString('fr-FR', { month: 'short' });
    return label.charAt(0).toUpperCase() + label.slice(1).replace('.', '');
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  openFilters(): void { alert('Fonctionnalité à venir : filtres avancés.'); }
  exportPDF(): void { alert('Fonctionnalité à venir : export PDF.'); }

  exportCSV(): void {
    const header = 'Client,Email,Commandes,Dépensé (TND),Dernière commande\n';
    const rows = this.topCustomers.map(c =>
      [`"${c.name}"`, c.email, c.orders, c.totalSpent, this.formatDate(c.lastOrderAt)].join(',')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `rapport-clients-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  viewAllCustomers(): void { alert('Fonctionnalité à venir : liste complète des clients.'); }

  private normalize(o: any): any {
    if (!o) return {};
    const out: any = { ...o };
    for (const k of Object.keys(o)) {
      const camelP = k.charAt(0).toLowerCase() + k.slice(1);
      if (!(camelP in out)) out[camelP] = o[k];
      if (k.includes('_')) {
        const camelS = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        if (!(camelS in out)) out[camelS] = o[k];
      }
    }
    return out;
  }
}