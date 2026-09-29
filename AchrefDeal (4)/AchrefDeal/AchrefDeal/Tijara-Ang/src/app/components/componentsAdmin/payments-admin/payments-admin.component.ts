import { Component, OnInit } from '@angular/core';
import { EMPTY, Observable, forkJoin } from 'rxjs';
import { expand, reduce } from 'rxjs/operators';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { PaymentsService } from 'src/app/core/services/payments.service';
import { OrdersService } from 'src/app/core/services/orders.service';

interface PaymentRow {
  idPayment: number;
  idOrder: number | undefined;
  amount: number;
  method: string;
  status: string;
  reference: string;
  transactionId: string;
  createdAt: string;
  email: string;
  userName: string;
  vendorNames: string;
  colisDelivered: number;
  colisTotal: number;
}

interface ChartBucket {
  label: string;
  paid: number;
  refunded: number;
  count: number;
}

@Component({
  selector: 'app-payments-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Paiements" [breadcrumbItems]="breadcrumbItems"></app-breadcrumbs>

<!-- ═════ KPI Cards avec sparklines ═════ -->
<div class="row g-3 mb-4">
  <div class="col-md-4">
    <div class="pay-kpi pay-kpi-success">
      <div class="pay-kpi-icon"><i class="ri-money-dollar-circle-line"></i></div>
      <div class="pay-kpi-body">
        <h3 class="pay-kpi-value">{{ totalPaid | number:'1.2-2' }} TND</h3>
        <p class="pay-kpi-label">Total encaissé</p>
        <span class="pay-kpi-trend" [class.down]="paidTrendPct < 0">
          <i [class]="paidTrendPct >= 0 ? 'ri-arrow-up-line' : 'ri-arrow-down-line'"></i>
          {{ paidTrendPct }}% ce mois
        </span>
      </div>
      <svg class="pay-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
        <polyline [attr.points]="paidSparkPoints" fill="none" stroke="#0ab39c" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>
  <div class="col-md-4">
    <div class="pay-kpi pay-kpi-primary">
      <div class="pay-kpi-icon"><i class="ri-bank-card-line"></i></div>
      <div class="pay-kpi-body">
        <h3 class="pay-kpi-value">{{ items.length }}</h3>
        <p class="pay-kpi-label">Transactions</p>
        <span class="pay-kpi-trend" [class.down]="countTrendPct < 0">
          <i [class]="countTrendPct >= 0 ? 'ri-arrow-up-line' : 'ri-arrow-down-line'"></i>
          {{ countTrendPct }}% ce mois
        </span>
      </div>
      <svg class="pay-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
        <polyline [attr.points]="countSparkPoints" fill="none" stroke="#6c5ce7" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>
  <div class="col-md-4">
    <div class="pay-kpi pay-kpi-danger">
      <div class="pay-kpi-icon"><i class="ri-refund-line"></i></div>
      <div class="pay-kpi-body">
        <h3 class="pay-kpi-value">{{ refundCount }}</h3>
        <p class="pay-kpi-label">Remboursements</p>
        <span class="pay-kpi-trend" [class.down]="refundTrendPct < 0">
          <i [class]="refundTrendPct >= 0 ? 'ri-arrow-up-line' : 'ri-arrow-down-line'"></i>
          {{ refundTrendPct }}% ce mois
        </span>
      </div>
      <svg class="pay-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
        <polyline [attr.points]="refundSparkPoints" fill="none" stroke="#f06548" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>
</div>

<!-- ═════ Aperçu + Méthodes ═════ -->
<div class="row g-3 mb-4">
  <div class="col-lg-8">
    <div class="pay-panel h-100">
      <div class="pay-panel-header">
        <h6 class="pay-panel-title">Aperçu des paiements</h6>
        <span class="pay-range-pill"><i class="ri-calendar-2-line me-1"></i>30 derniers jours</span>
      </div>
      <div class="pay-chart-wrap">
        <div class="pay-chart-legend">
          <div class="pay-legend-item">
            <span class="pay-legend-dot" style="background:#0ab39c"></span>
            <div>
              <div class="pay-legend-label">Encaissements</div>
              <div class="pay-legend-value">{{ totalPaid | number:'1.2-2' }} TND</div>
              <div class="pay-legend-pct">{{ paidTrendPct }}%</div>
            </div>
          </div>
          <div class="pay-legend-item">
            <span class="pay-legend-dot" style="background:#f06548"></span>
            <div>
              <div class="pay-legend-label">Remboursements</div>
              <div class="pay-legend-value">{{ refundedAmount | number:'1.2-2' }} TND</div>
              <div class="pay-legend-pct">{{ refundTrendPct }}%</div>
            </div>
          </div>
          <div class="pay-legend-item">
            <span class="pay-legend-dot" style="background:#6c5ce7"></span>
            <div>
              <div class="pay-legend-label">Transactions</div>
              <div class="pay-legend-value">{{ items.length }}</div>
              <div class="pay-legend-pct">{{ countTrendPct }}%</div>
            </div>
          </div>
        </div>
        <div class="pay-chart-area">
          <svg viewBox="0 0 600 180" preserveAspectRatio="none" class="pay-line-chart">
            <line *ngFor="let g of [0,1,2,3]; trackBy: trackByIndex" [attr.x1]="0" [attr.y1]="20 + g*35" [attr.x2]="600" [attr.y2]="20 + g*35" class="pay-grid-line"/>
            <polyline [attr.points]="paidLinePoints" fill="none" stroke="#0ab39c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline [attr.points]="refundedLinePoints" fill="none" stroke="#f06548" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline [attr.points]="countLinePoints" fill="none" stroke="#6c5ce7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div class="pay-chart-xaxis">
            <span *ngFor="let l of chartLabels; trackBy: trackByIndex">{{ l }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="col-lg-4">
    <div class="pay-panel h-100">
      <div class="pay-panel-header">
        <h6 class="pay-panel-title">Méthodes de paiement</h6>
      </div>
      <div class="pay-donut-wrap">
        <div class="pay-donut" [style.background]="donutGradient">
          <div class="pay-donut-center">
            <div class="pay-donut-total">{{ items.length }}</div>
            <div class="pay-donut-sub">paiements</div>
          </div>
        </div>
      </div>
      <div class="pay-method-list">
        <div class="pay-method-row" *ngFor="let m of methodStats; trackBy: trackByIndex">
          <span class="pay-legend-dot" [style.background]="m.color"></span>
          <span class="pay-method-label">{{ m.label }}</span>
          <span class="pay-method-pct">{{ m.percent }}%</span>
          <span class="pay-method-amount">{{ m.amount | number:'1.2-2' }} TND</span>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ═════ Historique + Statut / Activité ═════ -->
<div class="row g-3">
  <div class="col-lg-8">
    <div class="pay-panel p-0">
      <div class="pay-panel-header pay-panel-header-table">
        <h6 class="pay-panel-title mb-0">
          Historique des paiements
          <span class="pay-count-badge">{{ totalItems }}</span>
        </h6>
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <div class="pay-search">
            <i class="ri-search-line pay-search-ic"></i>
            <input type="text" class="pay-search-input" placeholder="Référence, client, vendeur, commande…"
                   [(ngModel)]="search" (input)="onSearchChange()" />
          </div>
          <div class="pay-filter-group">
            <button [class.active]="filter===''"         (click)="setFilter('')">Tous</button>
            <button [class.active]="filter==='paid'"     (click)="setFilter('paid')">Payés</button>
            <button [class.active]="filter==='pending'"  (click)="setFilter('pending')">En attente</button>
            <button [class.active]="filter==='refunded'" (click)="setFilter('refunded')">Remboursés</button>
          </div>
        </div>
      </div>

      <div class="pay-table-body">
        @if (loading) {
          <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
        } @else if (rows.length === 0) {
          <div class="text-center py-5">
            <div class="pay-empty-icon"><i class="ri-inbox-line"></i></div>
            <h6 class="fw-semibold mb-1">Aucun paiement trouvé</h6>
            <p class="text-muted fs-13 mb-3">Aucun paiement ne correspond à vos critères.</p>
            <button class="pay-btn-clear" (click)="search=''; setFilter('')">
              <i class="ri-filter-off-line me-1"></i>Effacer les filtres
            </button>
          </div>
        } @else {
          <table class="table table-hover align-middle mb-0 pay-table">
            <thead>
              <tr>
                <th class="ps-4">Référence</th>
                <th>Client</th>
                <th>Vendeur</th>
                <th>Commande</th>
                <th>Méthode</th>
                <th class="text-end">Montant</th>
                <th class="text-center">Statut</th>
                <th>Date</th>
                <th class="text-center">Colis livrés</th>
                <th class="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (p of rows; track p.idPayment) {
                <tr>
                  <td class="ps-4">
                    <div class="fw-semibold text-primary fs-13">{{ p.reference }}</div>
                    <div class="fs-11 text-muted">{{ p.transactionId }}</div>
                  </td>
                  <td class="fs-13">{{ p.userName }}<br><span class="fs-11 text-muted">{{ p.email }}</span></td>
                  <td class="fs-13">{{ p.vendorNames }}</td>
                  <td class="fs-13">{{ p.idOrder ? '#' + p.idOrder : '—' }}</td>
                  <td class="fs-13">
                    <span class="badge bg-info-subtle text-info">{{ methodLabel(p.method) }}</span>
                  </td>
                  <td class="text-end fw-bold text-success">{{ p.amount | number:'1.2-2' }} TND</td>
                  <td class="text-center">
                    <span class="badge rounded-pill" [class]="statusClass(p.status)">{{ statusLabel(p.status) }}</span>
                  </td>
                  <td class="fs-12 text-muted">{{ formatDate(p.createdAt) }}</td>
                  <td class="text-center">
                    @if (p.colisTotal > 0) {
                      <span class="badge" [class]="p.colisDelivered === p.colisTotal ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'">
                        {{ p.colisDelivered }} / {{ p.colisTotal }}
                      </span>
                    } @else {
                      <span class="text-muted">—</span>
                    }
                  </td>
                  <td class="text-end pe-4">
                    @if (p.status === 'paid') {
                      <button class="btn btn-sm btn-outline-danger" (click)="refund(p)">
                        <i class="ri-refund-line"></i>
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>

          <!-- Pagination numérique : la page demandée est envoyée au backend -->
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-top">
            <span class="fs-12 text-muted">Page {{ page }} / {{ totalPages }} — {{ totalItems }} paiement(s)</span>
            <nav>
              <ul class="pagination pagination-sm mb-0">
                <li class="page-item" [class.disabled]="page <= 1">
                  <button class="page-link" (click)="goToPage(page - 1)"><i class="ri-arrow-left-s-line"></i></button>
                </li>
                @for (pn of getPageNumbers(); track $index) {
                  @if (pn === '...') {
                    <li class="page-item disabled"><span class="page-link">…</span></li>
                  } @else {
                    <li class="page-item" [class.active]="pn === page">
                      <button class="page-link" (click)="goToPage(asNumber(pn))">{{ pn }}</button>
                    </li>
                  }
                }
                <li class="page-item" [class.disabled]="page >= totalPages">
                  <button class="page-link" (click)="goToPage(page + 1)"><i class="ri-arrow-right-s-line"></i></button>
                </li>
              </ul>
            </nav>
          </div>
        }
      </div>
    </div>
  </div>

  <div class="col-lg-4">
    <div class="pay-panel mb-3">
      <div class="pay-panel-header">
        <h6 class="pay-panel-title">Statut des paiements</h6>
      </div>
      <div class="pay-status-grid">
        <div class="pay-status-box" *ngFor="let s of statusCounts; trackBy: trackByIndex" [style.background]="s.bg">
          <div class="pay-status-icon" [style.color]="s.color"><i [class]="s.icon"></i></div>
          <div class="pay-status-count" [style.color]="s.color">{{ s.count }}</div>
          <div class="pay-status-label">{{ s.label }}</div>
        </div>
      </div>
    </div>

    <div class="pay-panel">
      <div class="pay-panel-header">
        <h6 class="pay-panel-title">Activité récente</h6>
      </div>
      <div class="pay-activity-list">
        @for (a of recentActivity; track a.text) {
          <div class="pay-activity-item">
            <span class="pay-activity-dot" [style.background]="a.color + '22'" [style.color]="a.color">
              <i [class]="a.icon"></i>
            </span>
            <div class="pay-activity-text">{{ a.text }}</div>
            <span class="pay-activity-time">{{ a.time }}</span>
          </div>
        } @empty {
          <div class="pay-activity-item pay-activity-empty">
            <span class="pay-activity-dot" style="background:#e0f9f5;color:#0ab39c"><i class="ri-bank-card-line"></i></span>
            <div class="pay-activity-text">Aucun paiement aujourd'hui</div>
            <span class="pay-activity-time">—</span>
          </div>
          <div class="pay-activity-item pay-activity-empty">
            <span class="pay-activity-dot" style="background:#fef9e7;color:#f7b84b"><i class="ri-refund-line"></i></span>
            <div class="pay-activity-text">Aucun remboursement</div>
            <span class="pay-activity-time">—</span>
          </div>
          <div class="pay-activity-item pay-activity-empty">
            <span class="pay-activity-dot" style="background:#fde8f0;color:#e91e63"><i class="ri-exchange-line"></i></span>
            <div class="pay-activity-text">Aucune transaction</div>
            <span class="pay-activity-time">—</span>
          </div>
          <div class="pay-activity-item pay-activity-empty">
            <span class="pay-activity-dot" style="background:#eee9fd;color:#6c5ce7"><i class="ri-pulse-line"></i></span>
            <div class="pay-activity-text">Aucune activité</div>
            <span class="pay-activity-time">—</span>
          </div>
        }
      </div>
    </div>
  </div>
</div>
`,
  styles: [`
    /* ═════ KPI Cards ═════ */
    .pay-kpi {
      position: relative; display: flex; align-items: flex-start; gap: 14px;
      background: #fff; border-radius: 16px; padding: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,.05); overflow: hidden; height: 100%;
    }
    .pay-kpi-success { background: linear-gradient(160deg, #e6faf6 0%, #ffffff 60%); }
    .pay-kpi-primary { background: linear-gradient(160deg, #eeecfd 0%, #ffffff 60%); }
    .pay-kpi-danger  { background: linear-gradient(160deg, #fdeceb 0%, #ffffff 60%); }

    .pay-kpi-icon {
      width: 46px; height: 46px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 22px;
    }
    .pay-kpi-success .pay-kpi-icon { background: #d4f5ef; color: #0ab39c; }
    .pay-kpi-primary .pay-kpi-icon { background: #e0dcfc; color: #6c5ce7; }
    .pay-kpi-danger  .pay-kpi-icon { background: #fbdcd8; color: #f06548; }

    .pay-kpi-body { flex: 1; min-width: 0; }
    .pay-kpi-value { font-size: 22px; font-weight: 800; color: #1a1f36; margin-bottom: 2px; }
    .pay-kpi-label { font-size: 12.5px; color: #9298a8; margin-bottom: 6px; }
    .pay-kpi-trend { font-size: 11.5px; font-weight: 700; color: #0ab39c; display: inline-flex; align-items: center; gap: 2px; }
    .pay-kpi-trend.down { color: #f06548; }

    .pay-spark { position: absolute; right: 14px; top: 18px; width: 76px; height: 28px; opacity: .8; }

    /* ═════ Panels ═════ */
    .pay-panel {
      background: #fff; border-radius: 16px; padding: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,.05);
    }
    .pay-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
    .pay-panel-header-table { padding: 18px 20px 14px; margin-bottom: 0; border-bottom: 1px solid #f0f0f5; }
    .pay-panel-title { font-size: 15px; font-weight: 700; color: #1a1f36; margin: 0; }
    .pay-count-badge {
      background: #eeecfd; color: #6c5ce7; font-size: 11px; font-weight: 700;
      border-radius: 20px; padding: 2px 9px; margin-left: 8px;
    }
    .pay-range-pill {
      font-size: 12px; font-weight: 600; color: #6b7280; background: #f8f9ff;
      border: 1px solid #eef0f5; border-radius: 20px; padding: 5px 12px;
    }

    /* ═════ Line chart ═════ */
    .pay-chart-wrap { display: flex; gap: 20px; }
    .pay-chart-legend { display: flex; flex-direction: column; gap: 18px; min-width: 150px; flex-shrink: 0; }
    .pay-legend-item { display: flex; align-items: flex-start; gap: 8px; }
    .pay-legend-dot { width: 9px; height: 9px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
    .pay-legend-label { font-size: 11.5px; color: #9298a8; }
    .pay-legend-value { font-size: 15px; font-weight: 700; color: #1a1f36; }
    .pay-legend-pct { font-size: 11px; font-weight: 600; color: #0ab39c; }

    .pay-chart-area { flex: 1; min-width: 0; }
    .pay-line-chart { width: 100%; height: 160px; }
    .pay-grid-line { stroke: #f0f1f5; stroke-width: 1; }
    .pay-chart-xaxis { display: flex; justify-content: space-between; font-size: 11px; color: #9298a8; margin-top: 6px; }

    /* ═════ Donut ═════ */
    .pay-donut-wrap { display: flex; justify-content: center; margin-bottom: 18px; }
    .pay-donut {
      width: 140px; height: 140px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
    }
    .pay-donut-center {
      width: 96px; height: 96px; border-radius: 50%; background: #fff;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      box-shadow: inset 0 0 0 1px #f0f0f5;
    }
    .pay-donut-total { font-size: 18px; font-weight: 800; color: #1a1f36; }
    .pay-donut-sub { font-size: 10px; color: #9298a8; }

    .pay-method-list { display: flex; flex-direction: column; gap: 12px; }
    .pay-method-row { display: flex; align-items: center; gap: 8px; font-size: 12.5px; }
    .pay-method-label { color: #4b5563; flex: 1; }
    .pay-method-pct { color: #1a1f36; font-weight: 700; width: 34px; text-align: right; }
    .pay-method-amount { color: #9298a8; width: 92px; text-align: right; font-size: 11.5px; }

    /* ═════ Search / filtres (historique) ═════ */
    .pay-search { position: relative; }
    .pay-search-ic { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #9298a8; font-size: 14px; }
    .pay-search-input {
      border: 1px solid #e9ebec; border-radius: 8px; padding: 6px 10px 6px 30px;
      font-size: 12.5px; width: 220px; background: #fafbff; outline: none;
    }
    .pay-search-input:focus { border-color: #6c5ce7; background: #fff; }

    .pay-filter-group { display: flex; background: #f8f9ff; border: 1px solid #eef0f5; border-radius: 8px; padding: 3px; }
    .pay-filter-group button {
      border: none; background: transparent; padding: 5px 11px; border-radius: 6px;
      font-size: 12px; font-weight: 600; color: #6b7280; cursor: pointer; transition: all .15s;
    }
    .pay-filter-group button.active { background: #6c5ce7; color: #fff; }

    .pay-table-body { min-height: 120px; }
    .pay-table thead th {
      font-size: 11px; text-transform: uppercase; letter-spacing: .04em; font-weight: 700;
      color: #9298a8; background: #f8f9ff; border-bottom: 1px solid #eef0f5; padding: 12px 10px;
    }
    .pay-table td { padding: 13px 10px; border-bottom: 1px solid #f5f6f9; }
    .pay-table tbody tr:hover { background: #fafbff; }

    .pay-empty-icon {
      width: 64px; height: 64px; border-radius: 16px; background: #eeecfd; color: #6c5ce7;
      display: flex; align-items: center; justify-content: center; font-size: 26px;
      margin: 0 auto 14px;
    }
    .pay-btn-clear {
      border: 1px solid #e9ebec; background: #fff; color: #4b5563; font-size: 12.5px; font-weight: 600;
      border-radius: 8px; padding: 7px 14px; cursor: pointer; transition: all .15s;
    }
    .pay-btn-clear:hover { border-color: #6c5ce7; color: #6c5ce7; }

    /* ═════ Statut grid ═════ */
    .pay-status-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .pay-status-box { border-radius: 12px; padding: 14px 10px; text-align: center; }
    .pay-status-icon { font-size: 20px; margin-bottom: 6px; }
    .pay-status-count { font-size: 18px; font-weight: 800; }
    .pay-status-label { font-size: 11px; color: #6b7280; margin-top: 2px; }

    /* ═════ Activité récente ═════ */
    .pay-activity-list { display: flex; flex-direction: column; gap: 14px; }
    .pay-activity-item { display: flex; align-items: center; gap: 10px; }
    .pay-activity-dot {
      width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 14px;
    }
    .pay-activity-text { flex: 1; font-size: 12.5px; color: #4b5563; }
    .pay-activity-time { font-size: 11px; color: #9298a8; }

    
    :host-context([data-bs-theme="dark"]) {
      .pay-kpi-success { background: linear-gradient(160deg, rgba(10,179,156,.14) 0%, var(--bs-card-bg) 65%); }
      .pay-kpi-primary { background: linear-gradient(160deg, rgba(108,92,231,.16) 0%, var(--bs-card-bg) 65%); }
      .pay-kpi-danger  { background: linear-gradient(160deg, rgba(240,101,72,.14) 0%, var(--bs-card-bg) 65%); }
      .pay-kpi { box-shadow: 0 2px 12px rgba(0,0,0,.35); }

      .pay-kpi-success .pay-kpi-icon { background: rgba(10,179,156,.22); color: #4bd8c0; }
      .pay-kpi-primary .pay-kpi-icon { background: rgba(108,92,231,.24); color: #b3a8fb; }
      .pay-kpi-danger  .pay-kpi-icon { background: rgba(240,101,72,.22); color: #f5a08f; }

      .pay-kpi-value { color: var(--bs-emphasis-color); }
      .pay-kpi-label { color: var(--bs-secondary-color); }

      .pay-panel { background: var(--bs-card-bg); box-shadow: 0 2px 12px rgba(0,0,0,.35); }
      .pay-panel-title { color: var(--bs-emphasis-color); }
      .pay-panel-header-table { border-bottom-color: var(--bs-border-color); }
      .pay-count-badge { background: rgba(108,92,231,.22); color: #b3a8fb; }
      .pay-range-pill { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); color: var(--bs-secondary-color); }

      .pay-legend-label { color: var(--bs-secondary-color); }
      .pay-legend-value { color: var(--bs-emphasis-color); }
      .pay-grid-line { stroke: var(--bs-border-color); }
      .pay-chart-xaxis { color: var(--bs-secondary-color); }

      .pay-donut-center { background: var(--bs-card-bg); box-shadow: inset 0 0 0 1px var(--bs-border-color); }
      .pay-donut-total { color: var(--bs-emphasis-color); }
      .pay-donut-sub { color: var(--bs-secondary-color); }
      .pay-method-label { color: var(--bs-body-color); }
      .pay-method-pct { color: var(--bs-emphasis-color); }
      .pay-method-amount { color: var(--bs-secondary-color); }

      .pay-search-input { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); color: var(--bs-body-color); }
      .pay-search-ic { color: var(--bs-secondary-color); }
      .pay-filter-group { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); }
      .pay-filter-group button { color: var(--bs-secondary-color); }
      .pay-filter-group button.active { background: #6c5ce7; color: #fff; }

      .pay-table thead th { background: var(--bs-tertiary-bg); border-bottom-color: var(--bs-border-color); color: var(--bs-secondary-color); }
      .pay-table td { border-bottom-color: var(--bs-border-color); }
      .pay-table tbody tr:hover { background: var(--bs-tertiary-bg); }

      .pay-empty-icon { background: rgba(108,92,231,.2); color: #b3a8fb; }
      .pay-btn-clear { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); color: var(--bs-body-color); }
      .pay-btn-clear:hover { border-color: #6c5ce7; color: #b3a8fb; }

      .pay-status-label { color: var(--bs-secondary-color); }
      .pay-activity-text { color: var(--bs-body-color); }
      .pay-activity-time { color: var(--bs-secondary-color); }
    }
  `],
})
export class PaymentsAdminComponent implements OnInit {
  breadcrumbItems = [{ label: 'Admin', active: false }, { label: 'Paiements', active: true }];

  items: PaymentRow[] = [];
  rows: PaymentRow[] = [];
  private colisByOrder: Record<number, { delivered: number; total: number }> = {};

  page = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 1;
  private searchDebounce: any = null;
  loading = true;
  filter = '';
  search = '';

  totalPaid       = 0;
  refundCount     = 0;
  refundedAmount  = 0;
  pendingCount    = 0;
  failedCount     = 0;
  paidCount       = 0;
  chartBuckets: ChartBucket[]   = [];
  chartLabels: string[]         = [];
  paidLinePoints     = '';
  refundedLinePoints = '';
  countLinePoints    = '';
  paidSparkPoints    = '';
  countSparkPoints   = '';
  refundSparkPoints  = '';
  paidTrendPct    = 0;
  countTrendPct   = 0;
  refundTrendPct  = 0;
  methodStats: { key: string; label: string; icon: string; color: string; amount: number; percent: number }[] = [];
  donutGradient = '';
  statusCounts: { key: string; label: string; icon: string; color: string; bg: string; count: number }[] = [];
  recentActivity: { icon: string; color: string; text: string; time: string }[] = [];

 
  private recomputeStats(): void {
    this.totalPaid      = this.items.filter(p => p.status === 'paid').reduce((s, p) => s + (+p.amount || 0), 0);
    this.refundCount    = this.items.filter(p => p.status === 'refunded').length;
    this.refundedAmount = this.items.filter(p => p.status === 'refunded').reduce((s, p) => s + (+p.amount || 0), 0);
    this.pendingCount   = this.items.filter(p => p.status === 'pending').length;
    this.failedCount    = this.items.filter(p => p.status === 'failed').length;
    this.paidCount      = this.items.filter(p => p.status === 'paid').length;

    // 5 tranches hebdomadaires sur les ~35 derniers jours.
    const buckets: ChartBucket[] = [];
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const end = new Date(now); end.setDate(now.getDate() - i * 7);
      const start = new Date(end); start.setDate(end.getDate() - 6);
      const label = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`;
      const inRange = this.items.filter(p => {
        const d = new Date(p.createdAt);
        return !isNaN(d.getTime()) && d >= start && d <= end;
      });
      buckets.push({
        label,
        paid: inRange.filter(p => p.status === 'paid').reduce((s, p) => s + (+p.amount || 0), 0),
        refunded: inRange.filter(p => p.status === 'refunded').reduce((s, p) => s + (+p.amount || 0), 0),
        count: inRange.length,
      });
    }
    this.chartBuckets = buckets;
    this.chartLabels  = buckets.map(b => b.label);

    this.paidLinePoints     = this.buildPolyline(buckets.map(b => b.paid), 600, 160);
    this.refundedLinePoints = this.buildPolyline(buckets.map(b => b.refunded), 600, 160);
    this.countLinePoints    = this.buildPolyline(buckets.map(b => b.count), 600, 160);

    this.paidSparkPoints   = this.buildPolyline(buckets.map(b => b.paid), 80, 30, 4);
    this.countSparkPoints  = this.buildPolyline(buckets.map(b => b.count), 80, 30, 4);
    this.refundSparkPoints = this.buildPolyline(buckets.map(b => b.refunded), 80, 30, 4);

    this.paidTrendPct   = this.trendPct(buckets.map(b => b.paid));
    this.countTrendPct  = this.trendPct(buckets.map(b => b.count));
    this.refundTrendPct = this.trendPct(buckets.map(b => b.refunded));

    const paidItems = this.items.filter(p => p.status === 'paid');
    const totalAmt = paidItems.reduce((s, p) => s + (+p.amount || 0), 0);
    const known = this.methodGroups.filter(g => g.key !== 'other').flatMap(g => g.match);
    this.methodStats = this.methodGroups.map(g => {
      const matching = g.key === 'other'
        ? paidItems.filter(p => !known.includes((p.method || '').toLowerCase()))
        : paidItems.filter(p => g.match.includes((p.method || '').toLowerCase()));
      const amount = matching.reduce((s, p) => s + (+p.amount || 0), 0);
      const percent = totalAmt > 0 ? Math.round((amount / totalAmt) * 100) : 0;
      return { key: g.key, label: g.label, icon: g.icon, color: g.color, amount, percent };
    });

    const totalPct = this.methodStats.reduce((s, m) => s + m.percent, 0);
    if (totalPct === 0) {
      this.donutGradient = `conic-gradient(var(--bs-tertiary-bg, #eef0f5) 0deg 360deg)`;
    } else {
      let cumulative = 0;
      const stops: string[] = [];
      this.methodStats.forEach(m => {
        if (m.percent <= 0) return;
        const deg = (m.percent / totalPct) * 360;
        stops.push(`${m.color} ${cumulative}deg ${cumulative + deg}deg`);
        cumulative += deg;
      });
      if (cumulative < 360) stops.push(`var(--bs-tertiary-bg, #eef0f5) ${cumulative}deg 360deg`);
      this.donutGradient = `conic-gradient(${stops.join(', ')})`;
    }

    this.statusCounts = [
      { key: 'paid',     label: 'Payés',       icon: 'ri-checkbox-circle-fill', color: '#0ab39c', bg: '#e0f9f5', count: this.paidCount },
      { key: 'pending',  label: 'En attente',  icon: 'ri-time-fill',            color: '#f7b84b', bg: '#fef9e7', count: this.pendingCount },
      { key: 'refunded', label: 'Remboursés',  icon: 'ri-refund-line',          color: '#f06548', bg: '#fde8e4', count: this.refundCount },
      { key: 'failed',   label: 'Échoués',     icon: 'ri-close-circle-fill',    color: '#e91e63', bg: '#fde8f0', count: this.failedCount },
    ];

    const sorted = [...this.items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    this.recentActivity = sorted.slice(0, 4).map(p => {
      const amount = (+p.amount || 0).toFixed(2);
      const ref = p.reference || ('#' + p.idPayment);
      const meta: Record<string, { icon: string; color: string; text: string }> = {
        paid:     { icon: 'ri-checkbox-circle-fill', color: '#0ab39c', text: `Paiement reçu de ${p.userName || 'client'} — ${amount} TND` },
        pending:  { icon: 'ri-time-fill',             color: '#f7b84b', text: `Paiement en attente — ${ref}` },
        refunded: { icon: 'ri-refund-line',           color: '#f06548', text: `Remboursement effectué — ${amount} TND` },
        failed:   { icon: 'ri-close-circle-fill',     color: '#e91e63', text: `Échec du paiement — ${ref}` },
      };
      const m = meta[p.status] || { icon: 'ri-bank-card-line', color: '#405189', text: ref };
      return { icon: m.icon, color: m.color, text: m.text, time: this.formatDate(p.createdAt) };
    });
  }

  private trendPct(values: number[]): number {
    const prev = values[values.length - 2] || 0;
    const curr = values[values.length - 1] || 0;
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  }

  private buildPolyline(values: number[], width: number, height: number, pad = 10): string {
    if (!values.length) return '';
    const max = Math.max(1, ...values);
    const stepX = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
    return values
      .map((v, i) => {
        const x = pad + i * stepX;
        const y = height - pad - (v / max) * (height - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  private methodGroups = [
    { key: 'card',     label: 'Carte bancaire',        icon: 'ri-bank-card-line', color: '#0ab39c', match: ['card'] },
    { key: 'cod',      label: 'Espèces à la livraison', icon: 'ri-truck-line',     color: '#6c5ce7', match: ['cod'] },
    { key: 'transfer', label: 'Virement bancaire',      icon: 'ri-bank-line',      color: '#f7b84b', match: ['transfer', 'virement', 'bank'] },
    { key: 'other',    label: 'Autres',                 icon: 'ri-more-line',      color: '#f06595', match: [] as string[] },
  ];

  constructor(private api: TijaraApiService, private payments: PaymentsService, private ordersApi: OrdersService) {}

  trackByIndex(index: number): number { return index; }

  ngOnInit(): void { this.load(); }

  private fetchAllPayments(): Observable<any[]> {
    const PAGE_SIZE = 50;
    const SAFETY_MAX_PAGES = 200;
    const fetchPage = (page: number) =>
      this.payments.getAllPayments({ per_page: PAGE_SIZE, page });
    return fetchPage(1).pipe(
      expand((res: any) => {
        const current = Number(res?.current_page ?? 1);
        const last    = Number(res?.last_page ?? current);
        if (current >= last || current >= SAFETY_MAX_PAGES) return EMPTY;
        return fetchPage(current + 1);
      }),
      reduce((acc: any[], res: any) => acc.concat(res?.data || []), [] as any[])
    );
  }

  private fetchAllOrderDetails(): Observable<any[]> {
    const PAGE_SIZE = 50;
    const SAFETY_MAX_PAGES = 200;
    const fetchPage = (page: number) =>
      this.ordersApi.getOrderDetails({ per_page: PAGE_SIZE, page });
    return fetchPage(1).pipe(
      expand((res: any) => {
        const current = Number(res?.current_page ?? 1);
        const last    = Number(res?.last_page ?? current);
        if (current >= last || current >= SAFETY_MAX_PAGES) return EMPTY;
        return fetchPage(current + 1);
      }),
      reduce((acc: any[], res: any) => acc.concat(res?.data || []), [] as any[])
    );
  }

  private mapRow(p: any): PaymentRow {
    const idOrder = p.id_order ?? p.idOrder ?? p.IdOrder;
    const colis = idOrder ? this.colisByOrder[idOrder] : undefined;
    const u = p.user ?? null;
    const vendorNames: string[] = Array.isArray(p.vendor_names) ? p.vendor_names : [];
    return {
      idPayment:     p.id_payment     ?? p.idPayment     ?? p.IdPayment ?? 0,
      idOrder,
      amount:       +(p.amount        ?? p.Amount        ?? 0),
      method:        p.method         ?? p.Method        ?? '',
      status:        p.status         ?? p.Status        ?? 'pending',
      reference:     p.reference      ?? p.Reference     ?? '',
      transactionId: p.transaction_id ?? p.transactionId ?? p.TransactionId ?? '',
      createdAt:     p.created_at     ?? p.createdAt     ?? p.CreatedAt,
      email:         p.email          ?? p.Email         ?? u?.Email ?? '',
      userName:      p.user_name      ?? p.userName      ?? p.UserName
                       ?? (u ? `${u.FirstName || ''} ${u.LastName || ''}`.trim() : '') ?? '',
      vendorNames:   vendorNames.length ? vendorNames.join(', ') : '—',
      colisDelivered: colis?.delivered ?? 0,
      colisTotal:     colis?.total ?? 0,
    };
  }

  load(): void {
    this.loading = true;
    forkJoin({
      payments: this.fetchAllPayments(),
      orderDetails: this.fetchAllOrderDetails(),
    }).subscribe({
      next: ({ payments, orderDetails }) => {
        const colisByOrder: Record<number, { delivered: number; total: number }> = {};
        (orderDetails || []).forEach((d: any) => {
          const orderId = d.IdOrder ?? d.idOrder;
          if (!orderId) return;
          if (!colisByOrder[orderId]) colisByOrder[orderId] = { delivered: 0, total: 0 };
          colisByOrder[orderId].total++;
          if ((d.Status || d.status) === 'delivered') colisByOrder[orderId].delivered++;
        });
        this.colisByOrder = colisByOrder;

        this.items = (payments || []).map((p: any) => this.mapRow(p));
        this.recomputeStats();
        this.loadTable();
      },
      error: () => { this.items = []; this.loading = false; }
    });
  }

  // Historique paginé, filtré/recherché côté backend — distinct des KPI/
  // graphiques ci-dessus qui portent sur l'ensemble des paiements.
  private buildTableParams(): any {
    const params: any = { page: this.page, per_page: this.pageSize };
    if (this.search.trim()) params.search = this.search.trim();
    if (this.filter) params.Status = this.filter;
    return params;
  }

  loadTable(): void {
    this.payments.getAllPayments(this.buildTableParams()).subscribe({
      next: (res: any) => {
        this.rows       = (res?.data || []).map((p: any) => this.mapRow(p));
        this.totalItems = res?.total        ?? this.rows.length;
        this.totalPages = res?.last_page    ?? 1;
        this.page       = res?.current_page ?? this.page;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onSearchChange(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.page = 1; this.loadTable(); }, 400);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
    this.loadTable();
  }

  /** Génère la liste des numéros de page à afficher, avec ellipses ("...") pour les longues listes. */
  getPageNumbers(): (number | string)[] {
    const total = this.totalPages;
    const current = this.page;
    if (total <= 1) return [1];
    const delta = 1;
    const range: (number | string)[] = [];
    const left = Math.max(2, current - delta);
    const right = Math.min(total - 1, current + delta);
    range.push(1);
    if (left > 2) range.push('...');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < total - 1) range.push('...');
    if (total > 1) range.push(total);
    return range;
  }

  asNumber(p: number | string): number {
    return typeof p === 'number' ? p : parseInt(p, 10);
  }

  setFilter(f: string): void { this.filter = f; this.page = 1; this.loadTable(); }

  refund(p: PaymentRow): void {
    if (!confirm(`Rembourser ${p.amount} TND ?`)) return;
    this.payments.refundPayment(p.idPayment).subscribe({ next: () => this.load() });
  }

  methodLabel(m: string): string {
    return m === 'card' ? 'Carte' : m === 'cod' ? 'À la livraison' : m === 'wallet' ? 'Portefeuille' : m;
  }
  statusLabel(s: string): string {
    return s === 'paid' ? 'Payé' : s === 'pending' ? 'En attente' : s === 'refunded' ? 'Remboursé' : s === 'failed' ? 'Échoué' : s;
  }
  statusClass(s: string): string {
    return s === 'paid' ? 'bg-success-subtle text-success'
         : s === 'refunded' ? 'bg-danger-subtle text-danger'
         : s === 'failed' ? 'bg-danger-subtle text-danger'
         : 'bg-warning-subtle text-warning';
  }
  formatDate(d: string): string {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }
}