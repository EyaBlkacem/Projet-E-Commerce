import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of, interval, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import {
  Chart, DoughnutController, ArcElement, Tooltip, Legend,
  BarController, BarElement, CategoryScale, LinearScale,
  LineController, LineElement, PointElement, Filler
} from 'chart.js';

Chart.register(
  DoughnutController, ArcElement, Tooltip, Legend,
  BarController, BarElement, CategoryScale, LinearScale,
  LineController, LineElement, PointElement, Filler
);

interface Kpi {
  label: string; sub: string; value: number; icon: string;
  color: string; link: string; isMoney?: boolean; trend: number;
  sparkData: number[];
}

@Component({
  selector: 'app-dashboard-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Tableau de bord" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<!-- ═════ Banner ═════ -->
<div class="card border-0 shadow-sm mb-4 overflow-hidden"
     style="background:linear-gradient(135deg,#405189 0%,#0ab39c 100%)">
  <div class="card-body text-white py-4">
    <div class="d-flex flex-wrap align-items-center gap-3">
      <div class="avatar-lg rounded-3 d-flex align-items-center justify-content-center"
           style="background:rgba(255,255,255,.18)">
        <i class="ri-shield-user-line fs-1"></i>
      </div>
      <div class="flex-grow-1">
        <h3 class="text-white mb-1">Bienvenue, Administrateur</h3>
        <p class="text-white-50 mb-0">{{ today }} — pilotez la marketplace en temps réel.</p>
      </div>
      <div class="d-flex align-items-center gap-3">
        <div class="btn-group" role="group">
          <button *ngFor="let p of periods; trackBy: trackByIndex" type="button" class="btn btn-sm"
                  [class.btn-light]="activePeriod === p.key"
                  [class.btn-outline-light]="activePeriod !== p.key"
                  (click)="setPeriod(p.key)">{{ p.label }}</button>
        </div>
        <div class="text-end">
          <div class="fs-12 text-white-50 d-flex align-items-center gap-1">
            <i class="ri-refresh-line" [class.spin]="loading"></i>
            Mis à jour {{ lastRefresh }}
          </div>
          <div class="fs-22 fw-bold">{{ currentYear }}</div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ═════ Loading bar ═════ -->
<div *ngIf="loading" class="progress mb-3" style="height:3px">
  <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary w-100"></div>
</div>

<!-- ═════ KPIs avec sparkline ═════ -->
<div class="row g-3 mb-4">
  <div *ngFor="let k of kpis; let i = index; trackBy: trackByIndex" class="col-6 col-md-4 col-xl-3">
    <a [routerLink]="k.link" class="text-decoration-none">
      <div class="card border-0 shadow-sm h-100 kpi-card overflow-hidden position-relative"
           style="border-radius:16px">

        <!-- Sparkline canvas en arrière-plan -->
        <div class="position-absolute bottom-0 end-0" style="width:120px;height:60px;opacity:0.6">
          <canvas [id]="'spark-' + i"></canvas>
        </div>

        <div class="card-body pb-2 pt-3 px-3 position-relative">
          <!-- Icône -->
          <div class="avatar-md rounded-3 d-flex align-items-center justify-content-center mb-2"
               [style.background]="k.color + '18'">
            <i class="fs-22" [class]="k.icon" [style.color]="k.color"></i>
          </div>

          <!-- Valeur -->
          <h2 class="fw-bold mb-0 mt-2" [style.color]="k.color">
            {{ k.value | number:'1.0-0' }}
            <span *ngIf="k.isMoney" class="fs-14 text-muted ms-1">TND</span>
          </h2>

          <!-- Label + sous-titre -->
          <div class="fw-semibold fs-14 text-dark mt-1">{{ k.label }}</div>
          <div class="fs-12 text-muted">{{ k.sub }}</div>

          <!-- Badge tendance -->
          <div class="mt-2 pb-1">
            <span class="badge rounded-pill px-2 py-1 fs-11 fw-semibold"
                  [class.bg-success-subtle]="k.trend >= 0"
                  [class.text-success]="k.trend >= 0"
                  [class.bg-danger-subtle]="k.trend < 0"
                  [class.text-danger]="k.trend < 0">
              <i [class]="k.trend >= 0 ? 'ri-arrow-up-line' : 'ri-arrow-down-line'"></i>
              {{ k.trend >= 0 ? '+' : '' }}{{ k.trend }}%
              <span class="fw-normal opacity-75">∧</span>
            </span>
          </div>
        </div>

        <!-- Barre colorée en bas -->
        <div style="height:3px" [style.background]="k.color + '55'"></div>
      </div>
    </a>
  </div>
</div>

<!-- ═════ Pending badges ═════ -->
<div class="row g-3 mb-4">
  <div *ngFor="let b of pendingBadges; trackBy: trackByIndex" class="col-md-4">
    <a [routerLink]="b.link" class="text-decoration-none">
      <div class="card border-0 shadow-sm h-100" [class]="'border-' + b.color + ' border-opacity-25'">
        <div class="card-body d-flex align-items-center gap-3">
          <div class="avatar-md rounded-circle d-flex align-items-center justify-content-center"
               [class]="'bg-' + b.color + '-subtle'">
            <i class="fs-22" [class]="b.icon + ' text-' + b.color"></i>
          </div>
          <div class="flex-grow-1">
            <h4 class="mb-0 fw-bold" [class]="'text-' + b.color">{{ b.value }}</h4>
            <p class="mb-0 fs-12 text-muted">{{ b.label }} en attente de validation</p>
          </div>
          <i class="ri-arrow-right-line fs-22 text-muted"></i>
        </div>
      </div>
    </a>
  </div>
</div>

<!-- ═════ Charts ═════ -->
<div class="row g-3 mb-4">
  <div class="col-xl-8">
    <div class="card border-0 shadow-sm h-100">
      <div class="card-header bg-transparent d-flex align-items-center py-3">
        <h6 class="mb-0 fw-semibold flex-grow-1">
          <i class="ri-bar-chart-2-line me-2 text-primary"></i>Commandes — {{ periodLabel }}
        </h6>
        <span class="badge bg-primary-subtle text-primary">Total : {{ ordersTotal | number }}</span>
      </div>
      <div class="card-body">
        <div *ngIf="ordersTotal === 0" class="text-center py-5">
          <div class="avatar-xl mx-auto mb-3 rounded-circle bg-primary-subtle d-flex align-items-center justify-content-center">
            <i class="ri-bar-chart-2-line fs-1 text-primary"></i>
          </div>
          <h6 class="text-muted">Aucune commande pour cette période</h6>
          <p class="text-muted fs-13 mb-0">Les données apparaîtront ici dès la première commande.</p>
        </div>
        <div *ngIf="ordersTotal > 0" style="height:260px;position:relative">
          <canvas #barCanvas></canvas>
        </div>
      </div>
    </div>
  </div>
  <div class="col-xl-4">
    <div class="card border-0 shadow-sm h-100">
      <div class="card-header bg-transparent d-flex align-items-center py-3">
        <h6 class="mb-0 fw-semibold flex-grow-1">
          <i class="ri-pie-chart-line me-2 text-info"></i>Répartition
        </h6>
        <span class="badge bg-light text-muted fs-11">
          {{ activePeriod === 'week' ? 'Semaine' : activePeriod === 'month' ? 'Mois' : 'Année' }}
        </span>
      </div>
      <div class="card-body d-flex flex-column align-items-center justify-content-center">
        <div *ngIf="statusList.length === 0" class="text-center py-4">
          <i class="ri-pie-chart-2-line fs-1 text-muted opacity-25"></i>
          <p class="text-muted fs-13 mt-2 mb-0">Aucune donnée.</p>
        </div>
        <div *ngIf="statusList.length > 0" class="w-100">
          <div class="position-relative mx-auto" style="width:200px;height:200px">
            <canvas #donutCanvas></canvas>
            <div class="position-absolute top-50 start-50 translate-middle text-center">
              <div class="fw-bold fs-20 lh-1">{{ donutTotal | number }}</div>
              <div class="fs-11 text-muted">Total</div>
            </div>
          </div>
          <div class="mt-4 d-flex flex-column gap-2 px-2">
            <div *ngFor="let s of statusList; trackBy: trackByIndex" class="d-flex justify-content-between align-items-center">
              <span class="d-flex align-items-center gap-2 fs-13">
                <span class="rounded-circle flex-shrink-0" [style.background]="s.color"
                      style="width:10px;height:10px;display:inline-block"></span>
                {{ s.label }}
              </span>
              <span class="fw-semibold fs-13">{{ s.value | number }}
                <span class="text-muted fw-normal">({{ s.pct }}%)</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ═════ Vendeurs à approuver + Commandes récentes ═════ -->
<div class="row g-3 mb-4">

  <!-- Vendeurs -->
  <div class="col-xl-5">
    <div class="card border-0 shadow-sm h-100">
      <div class="card-header bg-transparent d-flex align-items-center py-3">
        <div class="flex-grow-1">
          <div class="d-flex align-items-center gap-2">
            <i class="ri-user-star-line text-warning fs-18"></i>
            <h6 class="mb-0 fw-semibold">Vendeurs à approuver</h6>
            <span *ngIf="pendingVendors.length > 0"
                  class="badge rounded-pill bg-warning text-white ms-1">{{ pendingVendors.length }}</span>
          </div>
          <p class="mb-0 fs-12 text-muted ms-4 ps-1">En attente de validation</p>
        </div>
        <a routerLink="/admin/vendors"
           class="btn btn-sm btn-outline-secondary rounded-pill d-flex align-items-center gap-1">
          Voir tout <i class="ri-arrow-right-line"></i>
        </a>
      </div>
      <div class="card-body p-0">
        <div *ngIf="pendingVendors.length === 0" class="text-center py-5 px-3">
          <div class="avatar-lg mx-auto mb-3 rounded-circle bg-success-subtle d-flex align-items-center justify-content-center">
            <i class="ri-checkbox-circle-line fs-1 text-success"></i>
          </div>
          <h6 class="text-muted mb-1">Tout est validé !</h6>
          <p class="text-muted fs-13 mb-0">Aucun vendeur en attente d'approbation.</p>
        </div>
        <div *ngIf="pendingVendors.length > 0">
          <div *ngFor="let v of pendingVendors; let last = last; trackBy: trackByIndex"
               class="vendor-card px-3 pt-3" [class.border-bottom]="!last">
            <div class="d-flex align-items-center gap-3 mb-2">
              <div class="position-relative flex-shrink-0">
                <div class="avatar-md rounded-circle d-flex align-items-center justify-content-center fw-bold fs-15"
                     style="background:linear-gradient(135deg,#405189,#0ab39c);color:#fff">
                  {{ getInitials(v.name) }}
                </div>
                <span class="position-absolute bottom-0 end-0 rounded-circle bg-success dot-ring"
                      style="width:10px;height:10px"></span>
              </div>
              <div class="flex-grow-1 min-w-0">
                <div class="fw-semibold fs-14 text-truncate">{{ v.name }}</div>
                <div class="fs-12 text-muted text-truncate">{{ v.email }}</div>
                <div class="d-flex gap-1 mt-1">
                  <span class="badge bg-primary-subtle text-primary fs-10">
                    <i class="ri-store-2-line me-1"></i>Vendeur
                  </span>
                  <span class="badge bg-success-subtle text-success fs-10">
                    <i class="ri-shield-check-line me-1"></i>Nouveau
                  </span>
                </div>
              </div>
              <div class="d-flex flex-column align-items-end gap-2">
                <span class="badge bg-warning-subtle text-warning fs-10 d-flex align-items-center gap-1">
                  <i class="ri-calendar-line"></i>{{ v.date }}
                </span>
                <a [routerLink]="['/admin/vendor-detail', v.id]"
                   class="btn btn-sm btn-outline-primary rounded-circle"
                   style="width:32px;height:32px;padding:0;display:flex;align-items:center;justify-content:center">
                  <i class="ri-eye-line"></i>
                </a>
              </div>
            </div>
            <div class="rounded-2 p-3 mb-3 d-flex align-items-center gap-3 action-required-box">
              <div class="avatar-sm rounded-circle bg-warning d-flex align-items-center justify-content-center flex-shrink-0">
                <i class="ri-checkbox-circle-line text-white fs-16"></i>
              </div>
              <div class="flex-grow-1">
                <div class="fw-semibold fs-13 text-warning-emphasis">Action requise</div>
                <div class="fs-12 text-muted">Validez ce vendeur pour activer son compte sur la marketplace.</div>
              </div>
            </div>
            <div class="d-flex gap-2 pb-3">
              <button class="btn btn-outline-danger rounded-pill flex-fill fs-13 fw-semibold"
                      (click)="rejectVendor(v.id)">
                <i class="ri-close-line me-1"></i>Rejeter
              </button>
              <button class="btn fw-semibold rounded-pill flex-fill fs-13 text-white"
                      style="background:linear-gradient(135deg,#f7b84b,#f5a623)"
                      (click)="approveVendor(v.id)">
                <i class="ri-check-line me-1"></i>Valider
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Commandes récentes -->
  <div class="col-xl-7">
    <div class="card border-0 shadow-sm h-100 oc-card">
      <div class="card-body p-4">
        <div class="d-flex align-items-center gap-3 mb-3">
          <div class="oc-header-icon"><i class="ri-clipboard-line"></i></div>
          <div class="flex-grow-1">
            <h5 class="mb-0 fw-bold">Commandes récentes</h5>
            <p class="mb-0 fs-13 text-muted">Aperçu des dernières commandes passées sur la plateforme</p>
          </div>
          <a routerLink="/admin/orders" class="btn btn-sm btn-light oc-see-all d-flex align-items-center gap-1">
            Voir tout <i class="ri-arrow-right-line"></i>
          </a>
        </div>
        <div *ngIf="recentOrders.length === 0" class="text-center py-5">
          <i class="ri-shopping-bag-3-line fs-1 text-muted opacity-25"></i>
          <p class="text-muted fs-13 mt-2 mb-0">Aucune commande pour le moment.</p>
        </div>
        <div *ngIf="recentOrders.length > 0" class="table-responsive">
          <table class="table oc-table align-middle mb-0">
            <thead>
              <tr>
                <th>N°</th>
                <th><i class="ri-user-line me-1"></i>Client</th>
                <th><i class="ri-shopping-bag-line me-1"></i>Produit</th>
                <th><i class="ri-money-dollar-circle-line me-1"></i>Total</th>
                <th><i class="ri-flag-line me-1"></i>Statut</th>
                <th><i class="ri-calendar-line me-1"></i>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let o of pagedOrders; trackBy: trackByIndex">
                <td class="fw-bold text-primary fs-13">#{{ o.id }}</td>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <div class="oc-avatar"
                         [style.background]="getAvatarColor(o.client).bg"
                         [style.color]="getAvatarColor(o.client).fg">
                      {{ getInitials(o.client) }}
                    </div>
                    <span class="fs-13 fw-medium text-truncate" style="max-width:120px">{{ o.client }}</span>
                  </div>
                </td>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <div class="oc-thumb"><i class="ri-image-line"></i></div>
                    <span class="fs-12 text-muted text-truncate" style="max-width:110px">{{ o.product }}</span>
                  </div>
                </td>
                <td class="fs-13 fw-bold">{{ o.total | number:'1.0-0' }} TND</td>
                <td>
                  <span class="badge oc-status" [class]="getStatusClass(o.api_status)">
                    ● {{ getStatusLabel(o.api_status) }}
                  </span>
                </td>
                <td class="fs-12 text-muted">{{ o.date }}</td>
                <td class="text-end">
                  <a [routerLink]="['/admin/orders']" class="oc-chevron">
                    <i class="ri-arrow-right-s-line"></i>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div *ngIf="recentOrders.length > 0"
             class="d-flex align-items-center justify-content-between flex-wrap gap-3 mt-3 pt-3 oc-footer">
          <div class="d-flex align-items-center gap-2">
            <div class="oc-footer-icon"><i class="ri-file-list-3-line"></i></div>
            <div>
              <div class="fs-11 text-muted">Total commandes</div>
              <div class="d-flex align-items-center gap-2">
                <span class="fw-bold fs-16">{{ kpis[3].value | number }}</span>
                <span class="fs-11 fw-semibold"
                      [class.text-success]="(kpis[3].trend || 0) >= 0"
                      [class.text-danger]="(kpis[3].trend || 0) < 0">
                  <i [class]="(kpis[3].trend || 0) >= 0 ? 'ri-arrow-up-line' : 'ri-arrow-down-line'"></i>{{ kpis[3].trend }}%
                </span>
              </div>
              <div class="fs-10 text-muted">vs la période précédente</div>
            </div>
          </div>
          <div class="d-flex align-items-center gap-1">
            <button class="oc-page-btn" [disabled]="currentPage===1" (click)="goToPage(currentPage-1)">
              <i class="ri-arrow-left-s-line"></i>
            </button>
            <button *ngIf="pagerPages[0] > 1" class="oc-page-btn" (click)="goToPage(1)">1</button>
            <span *ngIf="pagerPages[0] > 2" class="px-1 text-muted fs-12">…</span>
            <button *ngFor="let p of pagerPages; trackBy: trackByIndex" class="oc-page-btn"
                    [class.oc-page-active]="p === currentPage" (click)="goToPage(p)">{{ p }}</button>
            <span *ngIf="pagerPages[pagerPages.length-1] < totalPages - 1" class="px-1 text-muted fs-12">…</span>
            <button *ngIf="pagerPages[pagerPages.length-1] < totalPages" class="oc-page-btn"
                    (click)="goToPage(totalPages)">{{ totalPages }}</button>
            <button class="oc-page-btn" [disabled]="currentPage===totalPages" (click)="goToPage(currentPage+1)">
              <i class="ri-arrow-right-s-line"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ═════ Top vendeurs ═════ -->
<div *ngIf="topVendors.length > 0" class="card border-0 shadow-sm mb-4">
  <div class="card-header bg-transparent py-3">
    <h6 class="mb-0 fw-semibold">
      <i class="ri-trophy-line me-2 text-warning"></i>Top vendeurs (chiffre d'affaires)
    </h6>
  </div>
  <div class="card-body">
    <div class="row g-3">
      <div *ngFor="let v of topVendors; let idx = index; trackBy: trackByIndex" class="col-md-6 col-xl-4">
        <div class="d-flex align-items-center gap-3 p-3 rounded"
             [class.tv-gold]="idx === 0" [class.tv-silver]="idx === 1" [class.tv-bronze]="idx > 1">
          <div class="position-relative">
            <div class="avatar-md rounded-circle d-flex align-items-center justify-content-center fw-bold"
                 [style.background]="idx === 0 ? '#f7b84b33' : '#40518933'"
                 [style.color]="idx === 0 ? '#f7b84b' : '#405189'">
              {{ getInitials(v.name) }}
            </div>
            <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill fs-10"
                  [style.background]="idx === 0 ? '#f7b84b' : (idx === 1 ? '#c0c0c0' : '#cd7f32')">
              #{{ idx + 1 }}
            </span>
          </div>
          <div class="flex-grow-1 min-w-0">
            <div class="fw-semibold fs-13 text-truncate">{{ v.name || '—' }}</div>
            <div class="fs-11 text-muted">{{ v.invoices }} facture(s)</div>
          </div>
          <div class="text-end">
            <div class="fw-bold text-success">{{ v.revenue | number:'1.0-0' }}</div>
            <div class="fs-10 text-muted">TND</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ═════ Activité récente ═════ -->
<div class="card border-0 shadow-sm">
  <div class="card-header bg-transparent d-flex align-items-center py-3">
    <div class="flex-grow-1">
      <div class="d-flex align-items-center gap-2">
        <div class="avatar-sm rounded-circle bg-primary-subtle d-flex align-items-center justify-content-center">
          <i class="ri-time-line text-primary fs-16"></i>
        </div>
        <div>
          <h6 class="mb-0 fw-semibold">Activité récente</h6>
          <p class="mb-0 fs-12 text-muted">Suivez les dernières actions sur votre marketplace.</p>
        </div>
      </div>
    </div>
    <div class="dropdown">
      <button class="btn btn-sm btn-light rounded-pill d-flex align-items-center gap-1"
              type="button" data-bs-toggle="dropdown">
        <i class="ri-time-line fs-13"></i> {{ activityPeriodLabel }} <i class="ri-arrow-down-s-line fs-13"></i>
      </button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><a class="dropdown-item fs-13" href="javascript:void(0)" (click)="activityPeriod='24h'; applyActivityPeriod()">Dernières 24h</a></li>
        <li><a class="dropdown-item fs-13" href="javascript:void(0)" (click)="activityPeriod='7d'; applyActivityPeriod()">7 derniers jours</a></li>
        <li><a class="dropdown-item fs-13" href="javascript:void(0)" (click)="activityPeriod='month'; applyActivityPeriod()">Ce mois</a></li>
      </ul>
    </div>
  </div>
  <div class="card-body px-4">
    <div *ngIf="activityTimeline.length === 0" class="text-center py-3">
      <p class="text-muted fs-13 mb-0"><i class="ri-time-line me-1"></i>Aucune activité récente.</p>
    </div>
    <div class="position-relative">
      <div class="position-absolute timeline-line" style="left:19px;top:0;bottom:0;width:2px;z-index:0"></div>
      <div *ngFor="let a of activityTimeline; trackBy: trackByIndex"
           class="d-flex align-items-start gap-3 mb-3 position-relative">
        <div class="flex-shrink-0 position-relative" style="z-index:1">
          <div class="rounded-circle d-flex align-items-center justify-content-center"
               [class]="'bg-' + a.color + '-subtle'" style="width:40px;height:40px">
            <i class="fs-16" [class]="a.icon + ' text-' + a.color"></i>
          </div>
          <span class="position-absolute rounded-circle dot-ring" [class]="'bg-' + a.color"
                style="width:10px;height:10px;bottom:-2px;right:-2px"></span>
        </div>
        <div class="flex-grow-1 card border-0 shadow-sm px-3 py-2 act-item-card">
          <div class="d-flex align-items-center justify-content-between">
            <p class="mb-0 fs-13">
              {{ getActivityPrefix(a) }}
              <span class="fw-semibold" [class]="'text-' + a.color">{{ getActivityName(a) }}</span>
            </p>
            <span class="badge rounded-pill fs-10 ms-2 flex-shrink-0"
                  [class]="'bg-' + a.color + '-subtle text-' + a.color">● {{ a.tag }}</span>
          </div>
          <div class="d-flex align-items-center gap-1 mt-1 fs-11 text-muted">
            <i class="ri-time-line"></i> {{ a.time }}
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="card-footer bg-transparent border-0 text-center pb-3">
    <a routerLink="/admin/orders" class="btn btn-light btn-sm rounded-pill px-4">
      <i class="ri-list-check me-1"></i>Voir toute l'activité
    </a>
  </div>
</div>

<button type="button" class="scroll-top-btn" (click)="scrollToTop()">
  <i class="ri-arrow-up-line"></i>
</button>
`,
  styles: [`
    .kpi-card { transition: transform .2s, box-shadow .2s; cursor: pointer; border-radius: 16px !important; }
    .kpi-card:hover { transform: translateY(-4px); box-shadow: 0 1rem 2rem rgba(0,0,0,.1) !important; }
    @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    .spin { animation: spin 1s linear infinite; }
    .vendor-card { transition: background .2s; }
    .vendor-card:hover { background: #fafbff; }

    /* ── Blocs auparavant en style inline (nécessaire pour l'override dark mode) ── */
    .action-required-box { background: linear-gradient(135deg,#fff8e7,#fff3d4); border: 1px solid #f7b84b33; }
    .act-item-card { background: #fafbff; }
    .tv-gold   { background: #fff8e7; }
    .tv-silver { background: #f0f4ff; }
    .tv-bronze { background: #f8f9fa; }
    .dot-ring  { border: 2px solid #fff; }
    .timeline-line { background: #f0f0f0; }

    /* ── Commandes récentes ── */
    .oc-header-icon {
      width:48px;height:48px;border-radius:14px;
      background:linear-gradient(135deg,#e9e5fd,#f2effe);
      display:flex;align-items:center;justify-content:center;color:#6c5ce7;font-size:22px;flex-shrink:0;
    }
    .oc-see-all { border-radius:10px;font-weight:600;font-size:13px;border:1px solid #eef0f5; }
    .oc-table thead th {
      font-size:11px;text-transform:uppercase;letter-spacing:.03em;
      color:#9298a8;font-weight:600;border-bottom:1px solid #eef0f5;
      padding-bottom:10px;white-space:nowrap;
    }
    .oc-table td { border-bottom:1px solid #f5f6f9;padding-top:12px;padding-bottom:12px;vertical-align:middle; }
    .oc-table tr:last-child td { border-bottom:none; }
    .oc-avatar {
      width:32px;height:32px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;
    }
    .oc-thumb {
      width:32px;height:32px;border-radius:8px;background:#f1f2f6;
      display:flex;align-items:center;justify-content:center;color:#b0b4c0;flex-shrink:0;font-size:14px;
    }
    .oc-status { border-radius:20px;font-weight:600;font-size:11px;padding:5px 10px; }
    .oc-chevron {
      width:30px;height:30px;border-radius:50%;border:1px solid #eef0f5;
      display:flex;align-items:center;justify-content:center;color:#9298a8;transition:.15s;
    }
    .oc-chevron:hover { background:#f2effe;color:#6c5ce7;border-color:#e9e5fd; }
    .oc-footer { border-top:1px solid #f5f6f9; }
    .oc-footer-icon {
      width:38px;height:38px;border-radius:10px;background:#eef0f5;
      display:flex;align-items:center;justify-content:center;color:#6c5ce7;flex-shrink:0;
    }
    .oc-page-btn {
      width:30px;height:30px;border-radius:8px;border:1px solid #eef0f5;background:#fff;
      color:#5b616e;font-size:12px;font-weight:600;
      display:flex;align-items:center;justify-content:center;transition:.15s;
    }
    .oc-page-btn:hover:not(:disabled) { background:#f2effe;color:#6c5ce7; }
    .oc-page-btn:disabled { opacity:.4;cursor:default; }
    .oc-page-active { background:#6c5ce7;border-color:#6c5ce7;color:#fff; }

    .scroll-top-btn {
      position:fixed;bottom:24px;right:24px;z-index:1000;
      width:46px;height:46px;border-radius:50%;
      background:linear-gradient(135deg,#7c6ff0,#6c5ce7);color:#fff;border:none;
      display:flex;align-items:center;justify-content:center;font-size:18px;
      box-shadow:0 6px 16px rgba(108,92,231,.35);transition:.2s;
    }
    .scroll-top-btn:hover { transform:translateY(-3px); }

  
    :host-context([data-bs-theme="dark"]) {
      .vendor-card:hover { background: var(--bs-tertiary-bg); }

      .action-required-box {
        background: linear-gradient(135deg, rgba(247,184,75,.16), rgba(247,184,75,.08));
        border-color: rgba(247,184,75,.35);
      }
      .act-item-card { background: var(--bs-tertiary-bg) !important; }
      .tv-gold   { background: rgba(247,184,75,.14); }
      .tv-silver { background: rgba(64,81,137,.18); }
      .tv-bronze { background: var(--bs-tertiary-bg); }
      .dot-ring  { border-color: var(--bs-card-bg); }
      .timeline-line { background: var(--bs-border-color); }

      .oc-header-icon { background: linear-gradient(135deg, rgba(108,92,231,.24), rgba(108,92,231,.12)); }
      .oc-see-all { border-color: var(--bs-border-color); }
      .oc-table thead th { color: var(--bs-secondary-color); border-bottom-color: var(--bs-border-color); }
      .oc-table td { border-bottom-color: var(--bs-border-color); }
      .oc-thumb { background: var(--bs-tertiary-bg); color: var(--bs-secondary-color); }
      .oc-chevron { border-color: var(--bs-border-color); color: var(--bs-secondary-color); }
      .oc-chevron:hover { background: rgba(108,92,231,.2); border-color: rgba(108,92,231,.4); }
      .oc-footer { border-top-color: var(--bs-border-color); }
      .oc-footer-icon { background: var(--bs-tertiary-bg); }
      .oc-page-btn { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); color: var(--bs-body-color); }
      .oc-page-btn:hover:not(:disabled) { background: rgba(108,92,231,.2); color: #b3a7f5; }
    }
  `]
})
export class DashboardAdminComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('donutCanvas') donutCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barCanvas')   barCanvasRef!:   ElementRef<HTMLCanvasElement>;

  private donutChart?: Chart<'doughnut', number[], string>;
  private barChart?:   Chart<'bar', number[], string>;
  private sparkCharts: Chart<'line', number[], string>[] = [];

  breadCrumbItems = [{ label: 'Admin' }, { label: 'Dashboard', active: true }];
  today        = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  currentYear  = new Date().getFullYear();
  currentMonth = new Date().getMonth();
  lastRefresh  = 'maintenant';
  loading      = false;

  periods = [
    { key: 'week',  label: 'Semaine' },
    { key: 'month', label: 'Mois'    },
    { key: 'year',  label: 'Année'   },
  ];
  activePeriod = 'year';

  periodLabel = '';
  private recomputePeriodLabel(): void {
    if (this.activePeriod === 'week')  { this.periodLabel = '7 derniers jours'; return; }
    if (this.activePeriod === 'month') { this.periodLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); return; }
    this.periodLabel = `Année ${this.currentYear}`;
  }

  kpis: Kpi[] = [
    { label: 'Utilisateurs',       sub: 'Total inscrits',         value: 0, icon: 'ri-user-3-line',              color: '#6c5ce7', link: '/admin/users',        trend: 0, sparkData: [] },
    { label: 'Vendeurs actifs',    sub: 'Vendeurs approuvés',     value: 0, icon: 'ri-store-2-line',             color: '#0ab39c', link: '/admin/vendors',      trend: 0, sparkData: [] },
    { label: 'Produits actifs',    sub: 'Produits en ligne (cumul total)', value: 0, icon: 'ri-box-3-line',               color: '#f7b84b', link: '/admin/products',     trend: 0, sparkData: [] },
    { label: 'Commandes',          sub: 'Total commandes',        value: 0, icon: 'ri-shopping-bag-3-line',      color: '#299cdb', link: '/admin/orders',       trend: 0, sparkData: [] },
    { label: 'Livraisons',         sub: 'En cours de livraison',  value: 0, icon: 'ri-truck-line',               color: '#a29bfe', link: '/admin/deliveries',   trend: 0, sparkData: [] },
    { label: 'Factures',           sub: 'Factures générées',      value: 0, icon: 'ri-file-text-line',           color: '#3577f1', link: '/admin/invoices',     trend: 0, sparkData: [] },
    { label: "Chiffre d'affaires", sub: "Revenus période",        value: 0, icon: 'ri-money-dollar-circle-line', color: '#00b894', link: '/admin/invoices', isMoney: true, trend: 0, sparkData: [] },
    { label: 'Réclamations',       sub: 'Tickets ouverts (cumul total)', value: 0, icon: 'ri-customer-service-2-line',  color: '#f06548', link: '/admin/reclamations', trend: 0, sparkData: [] },
  ];

  pendingBadges = [
    { label: 'Vendeurs', value: 0, icon: 'ri-store-2-line',   color: 'warning', link: '/admin/vendors'  },
    { label: 'Produits', value: 0, icon: 'ri-box-3-line',     color: 'primary', link: '/admin/products' },
    { label: 'Annonces', value: 0, icon: 'ri-megaphone-line', color: 'info',    link: '/admin/annonces' },
  ];

  monthlyData: { label: string; value: number }[] = [];
  ordersTotal = 0;
  donutTotal  = 0;

  statusList:       { key: string; label: string; color: string; value: number; pct: number }[] = [];
  recentOrders:     any[] = [];
  pendingVendors:   any[] = [];
  topVendors:       any[] = [];
  activityTimeline: any[] = [];

  pageSize    = 7;
  currentPage = 1;

  private refreshSub?: Subscription;
  private prevStats:   any = null;
  private viewReady        = false;

  private avatarPalette = [
    { bg: '#e9e5fd', fg: '#6c5ce7' },
    { bg: '#fef3e2', fg: '#f59e0b' },
    { bg: '#dcfce7', fg: '#16a34a' },
    { bg: '#fee2e2', fg: '#ef4444' },
    { bg: '#e0f2fe', fg: '#0284c7' },
    { bg: '#fae8ff', fg: '#a21caf' },
    { bg: '#fff7ed', fg: '#ea580c' },
  ];

  constructor(private api: TijaraApiService, private router: Router) {}

  ngOnInit(): void {
    this.recomputePeriodLabel();
    this.loadData();
    this.refreshSub = interval(60_000).subscribe(() => this.loadData(true));
  }

  trackByIndex(index: number): number { return index; }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.ordersTotal > 0)       setTimeout(() => this.renderBar(),    100);
    if (this.statusList.length > 0) setTimeout(() => this.renderDonut(),  100);
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.donutChart?.destroy();
    this.barChart?.destroy();
    this.sparkCharts.forEach(c => c.destroy());
  }

  setPeriod(key: string): void { this.activePeriod = key; this.recomputePeriodLabel(); this.loadData(); }



  private total(meta: any): number {
    if (!meta) return 0;
    if (typeof meta.total === 'number') return meta.total;
    if (Array.isArray(meta.data)) return meta.data.length;
    return 0;
  }

  // ✅ Bornes RÉELLES du filtre Semaine/Mois/Année — auparavant activePeriod
  // ne servait qu'à changer le libellé affiché (periodLabel), jamais
  // transmis aux requêtes : cliquer "Semaine" chargeait exactement les
  // mêmes chiffres que "Année". Corrigé : ces bornes sont maintenant
  // envoyées en paramètres aux routes qui supportent un filtre de date
  // côté backend.
  private periodRange(): { from: string; to: string } {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    let from: Date;
    if (this.activePeriod === 'week')       from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    else if (this.activePeriod === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
    else                                    from = new Date(now.getFullYear(), 0, 1);
    return { from: toStr(from), to: toStr(now) };
  }

  loadData(silent = false): void {
    if (!silent) this.loading = true;

    const year = this.currentYear;
    const pad = (n: number) => String(n).padStart(2, '0');
    const monthRanges = Array.from({ length: 12 }, (_, i) => {
      const from = `${year}-${pad(i + 1)}-01`;
      const to   = new Date(year, i + 1, 0); // dernier jour du mois
      return { from, to: `${year}-${pad(i + 1)}-${pad(to.getDate())}` };
    });
    const deliveryStatuses = ['Pending', 'In Transit', 'Delivered', 'Failed', 'Returned'];
    const { from: pFrom, to: pTo } = this.periodRange();

    forkJoin({
      usersMeta:           this.api.getAdminAllUsers({ per_page: 1, CreationDate_min: pFrom, CreationDate_max: pTo }).pipe(catchError(() => of(null))),
      vendorsMeta:         this.api.getAdminAllUsers({ per_page: 1, IdRole: 2, CreationDate_min: pFrom, CreationDate_max: pTo }).pipe(catchError(() => of(null))),
      // ⚠️ Products n'a AUCUNE colonne de date en base (public $timestamps =
      // false, pas de champ création) — impossible de le scoper par période
      // sans modifier le schéma/contrôleur backend. Reste donc en cumul
      // total quel que soit le filtre sélectionné, volontairement.
      productsMeta:        this.api.getAdminAllProducts({ per_page: 1 }).pipe(catchError(() => of(null))),
      pendingProductsMeta: this.api.getAdminAllProducts({ per_page: 1, Active: 0 }).pipe(catchError(() => of(null))),
      ordersMeta:          this.api.getAdminOrders({ per_page: 1, DateTimeCommand_min: pFrom, DateTimeCommand_max: pTo }).pipe(catchError(() => of(null))),
      deliveriesMeta:      this.api.getDeliveries({ per_page: 1, CreatedAt_min: pFrom, CreatedAt_max: pTo }).pipe(catchError(() => of(null))),
      // ⚠️ Reclamationscontroller::index ne supporte que ?Status=, aucun
      // filtre de date — reste en cumul total volontairement, même limite
      // que Products ci-dessus.
      reportsMeta:         this.api.getReclamations({ per_page: 1 }).pipe(catchError(() => of(null))),
      pendingAnnoncesMeta: this.api.getAdminAnnonces({ per_page: 1, Active: 0, DatePublication_min: pFrom, DatePublication_max: pTo }).pipe(catchError(() => of(null))),
      invoicesAll:         this.api.getInvoices({ from: pFrom, to: pTo }).pipe(catchError(() => of({ count: 0, data: [] } as any))),
      pendingVendorsRaw:   this.api.getPendingVendors().pipe(catchError(() => of(null))),
      ordersRaw:           this.api.getAdminOrders({ per_page: 200 }).pipe(catchError(() => of(null))),
      deliveryStatusCounts: forkJoin(
        deliveryStatuses.map(st => this.api.getDeliveries({ per_page: 1, Status: st }).pipe(catchError(() => of(null))))
      ),
      monthly: forkJoin(
        monthRanges.map(r => this.api.getAdminOrders({
          per_page: 1, DateTimeCommand_min: r.from, DateTimeCommand_max: r.to,
        }).pipe(catchError(() => of(null))))
      ),
    }).subscribe((res: any) => {
      this.applyRealStats(res);
      this.applyPending(res.pendingVendorsRaw?.data || []);
      this.applyOrders(res.ordersRaw?.data || []);
      this.buildActivityTimeline(this.reclamationsCount, res.pendingVendorsRaw?.data || [], res.ordersRaw?.data || []);
      this.loading     = false;
      this.lastRefresh = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      setTimeout(() => {
        this.renderBar();
        this.renderDonut();
        this.renderAllSparks();
      }, 150);
    });
  }

  private reclamationsCount = 0;


  private sparkHistory: number[][] = [[], [], [], [], [], [], [], []];
  private readonly SPARK_MAX_POINTS = 12;

  private applyRealStats(res: any): void {
    const usersCount           = this.total(res.usersMeta);
    const vendorsCount         = this.total(res.vendorsMeta);
    const productsCount        = this.total(res.productsMeta);
    const ordersCount          = this.total(res.ordersMeta);
    const deliveriesCount      = this.total(res.deliveriesMeta);
    const invoicesCount        = +(res.invoicesAll?.count ?? (res.invoicesAll?.data?.length ?? 0));
    const reportsCount         = this.total(res.reportsMeta);
    this.reclamationsCount     = reportsCount;

    const invoicesData: any[] = res.invoicesAll?.data || [];
    const revenue = invoicesData
      .filter((i: any) => (i.Status || '').toLowerCase() === 'paid')
      .reduce((sum: number, i: any) => sum + (+i.Total || 0), 0);

    const nv = {
      users: usersCount, vendors: vendorsCount, products: productsCount,
      orders: ordersCount, deliveries: deliveriesCount, invoices: invoicesCount,
      revenue, reclamations: reportsCount,
    };
    const prev  = this.prevStats;
    const trend = (cur: number, pk: string) => {
      if (!prev || !prev[pk]) return 0;
      return Math.round(((cur - prev[pk]) / prev[pk]) * 100);
    };

    this.kpis[0].value = nv.users;        this.kpis[0].trend = trend(nv.users,        'users');
    this.kpis[1].value = nv.vendors;      this.kpis[1].trend = trend(nv.vendors,      'vendors');
    this.kpis[2].value = nv.products;     this.kpis[2].trend = trend(nv.products,     'products');
    this.kpis[3].value = nv.orders;       this.kpis[3].trend = trend(nv.orders,       'orders');
    this.kpis[4].value = nv.deliveries;   this.kpis[4].trend = trend(nv.deliveries,   'deliveries');
    this.kpis[5].value = nv.invoices;     this.kpis[5].trend = trend(nv.invoices,     'invoices');
    this.kpis[6].value = nv.revenue;      this.kpis[6].trend = trend(nv.revenue,      'revenue');
    this.kpis[7].value = nv.reclamations; this.kpis[7].trend = trend(nv.reclamations, 'reclamations');
    this.prevStats = nv;

    // Un point réel par KPI, à chaque rafraîchissement — voir sparkHistory.
    this.kpis.forEach((k, i) => {
      this.sparkHistory[i].push(k.value);
      if (this.sparkHistory[i].length > this.SPARK_MAX_POINTS) this.sparkHistory[i].shift();
    });

    this.pendingBadges[0].value = this.total(res.pendingVendorsRaw);
    this.pendingBadges[1].value = this.total(res.pendingProductsMeta);
    this.pendingBadges[2].value = this.total(res.pendingAnnoncesMeta);

    // ── Graphique mensuel : comptage réel via DateTimeCommand_min/_max ──
    const monthLabels = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    const monthlyCounts: any[] = res.monthly || [];
    this.monthlyData = monthLabels.map((l, i) => ({ label: l, value: this.total(monthlyCounts[i]) }));
    this.ordersTotal = this.monthlyData.reduce((a, m) => a + m.value, 0);

    
    const statusMeta: any[] = res.deliveryStatusCounts || [];
    const statusDefs = [
      { key: 'Pending',     label: 'En attente', color: '#f7b84b' },
      { key: 'In Transit',  label: 'En transit', color: '#299cdb' },
      { key: 'Delivered',   label: 'Livrées',    color: '#0ab39c' },
      { key: 'Failed',      label: 'Échouées',   color: '#f06548' },
      { key: 'Returned',    label: 'Retournées', color: '#878a99' },
    ];
    const counts = statusDefs.map((d, i) => this.total(statusMeta[i]));
    const total  = counts.reduce((a, c) => a + c, 0);
    this.donutTotal = total;
    this.statusList = statusDefs
      .map((d, i) => ({ ...d, value: counts[i], pct: total > 0 ? Math.round((counts[i] / total) * 100) : 0 }))
      .filter(d => d.value > 0);

    
    const byVendor = new Map<number, { id: number; name: string; invoices: number; revenue: number }>();
    invoicesData.forEach((inv: any) => {
      const vId = inv.IdVendor;
      if (!vId) return;
      const vName = inv.vendor?.Username || `${inv.vendor?.FirstName || ''} ${inv.vendor?.LastName || ''}`.trim() || `Vendeur #${vId}`;
      const entry = byVendor.get(vId) || { id: vId, name: vName, invoices: 0, revenue: 0 };
      entry.invoices += 1;
      entry.revenue   += +(inv.Total || 0);
      byVendor.set(vId, entry);
    });
    this.topVendors = Array.from(byVendor.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  approveVendor(id: number): void {
    this.api.approveVendor(id).pipe(catchError(() => of(null))).subscribe(() => this.loadData());
  }
  rejectVendor(id: number): void {
    if (!confirm('Rejeter ce vendeur ?')) return;
    this.api.rejectVendor(id, 'Rejeté depuis le dashboard').pipe(catchError(() => of(null))).subscribe(() => this.loadData());
  }

  // ── Sparklines ───────────────────────────────────────────
  private renderAllSparks(): void {
    if (!this.viewReady) return;
    this.sparkCharts.forEach(c => c.destroy());
    this.sparkCharts = [];

    this.kpis.forEach((k, i) => {
      const canvas = document.getElementById(`spark-${i}`) as HTMLCanvasElement;
      if (!canvas) return;

      
      const data = this.sparkHistory[i].length > 0 ? this.sparkHistory[i] : [k.value];

      const chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: data.map((_, idx) => idx.toString()),
          datasets: [{
            data,
            borderColor: k.color,
            borderWidth: 2,
            fill: true,
            backgroundColor: k.color + '22',
            tension: 0.4,
            pointRadius: 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: {
            x: { display: false },
            y: { display: false }
          },
          animation: { duration: 800 }
        }
      });
      this.sparkCharts.push(chart);
    });
  }

  

  // ── Bar Chart ────────────────────────────────────────────
  private renderBar(): void {
    if (!this.viewReady || !this.barCanvasRef || this.ordersTotal === 0) return;
    const labels   = this.monthlyData.map(m => m.label);
    const values   = this.monthlyData.map(m => m.value);
    const bgColors = this.monthlyData.map((_, i) => i === this.currentMonth ? '#0ab39c' : '#0ab39c55');
    const hoverClr = this.monthlyData.map((_, i) => i === this.currentMonth ? '#099885' : '#0ab39c99');
    if (this.barChart) this.barChart.destroy();
    this.barChart = new Chart(this.barCanvasRef.nativeElement, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Commandes', data: values,
        backgroundColor: bgColors, hoverBackgroundColor: hoverClr,
        borderRadius: 6, borderSkipped: false }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#405189', titleColor: '#fff', bodyColor: '#fff',
            padding: 10, cornerRadius: 8,
            callbacks: {
              title: (items) => {
                const idx = items[0].dataIndex;
                const mn = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
                return idx < 12 ? `${mn[idx]} ${this.currentYear}` : this.monthlyData[idx].label;
              },
              label: (item) => ` ${item.parsed.y.toLocaleString('fr-FR')} commandes`,
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#878a99', font: { size: 12 } } },
          y: { beginAtZero: true, grid: { color: '#f0f0f0' },
               ticks: { color: '#878a99', font: { size: 11 },
                        callback: (val) => val.toLocaleString('fr-FR') } }
        }
      }
    });
  }

  // ── Donut Chart ──────────────────────────────────────────
  private renderDonut(): void {
    if (!this.viewReady || !this.donutCanvasRef) return;
    if (this.statusList.length === 0) { this.donutChart?.destroy(); this.donutChart = undefined; return; }
    if (this.donutChart) this.donutChart.destroy();
    this.donutChart = new Chart(this.donutCanvasRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.statusList.map(s => s.label),
        datasets: [{ data: this.statusList.map(s => s.value),
          backgroundColor: this.statusList.map(s => s.color),
          borderColor: this.statusList.map(() => '#fff'),
          borderWidth: 3, hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: {
            label: (ctx) => {
              const pct = this.statusList[ctx.dataIndex]?.pct ?? 0;
              return ` ${ctx.label} : ${ctx.parsed.toLocaleString('fr-FR')} (${pct}%)`;
            }
          }}
        }
      }
    });
  }

  private formatDate(dateStr: any): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
    } catch { return '—'; }
  }

  
  private applyPending(data: any[]): void {
    this.pendingVendors = (data || []).slice(0, 5).map(v => ({
      id:    v.IdUser,
      name:  `${v.FirstName || ''} ${v.LastName || ''}`.trim() || v.Username || v.Email,
      email: v.Email,
      date:  this.formatDate(v.CreationDate),
    }));
  }

  
  private applyOrders(data: any[]): void {
    this.recentOrders = (data || []).slice(0, 200).map(o => ({
      id:         o.IdOrder,
      client:     `Utilisateur #${o.IdUser ?? '—'}`,
      vendor:     '—',
      product:    o.IdDeal ? `Deal #${o.IdDeal}` : '—',
      image:      null,
      total:      0,
      api_status: o.Active ? 'active' : 'inactive',
      date:       this.formatDate(o.DateTimeCommand),
    }));
    this.currentPage = 1;
    this.recomputeOrdersPagination();
  }

  private buildActivityTimeline(reclamationsCount: number, pending: any[], orders: any[]): void {
    const timeline: any[] = [];
    const now = new Date();
    const fmt = (d: Date) => isNaN(d.getTime()) ? '—' : d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    (pending || []).forEach((v: any) => {
      const name = `${v.FirstName || ''} ${v.LastName || ''}`.trim() || v.Username || v.Email || '—';
      const t = v.CreationDate ? new Date(v.CreationDate) : now;
      timeline.push({ icon: 'ri-store-2-line', color: 'warning',
        text: `Nouveau vendeur en attente : ${name}`,
        time: fmt(t), rawTime: t, tag: 'Vendeur' });
    });
    (orders || []).forEach((o: any) => {
      const t = o.DateTimeCommand ? new Date(o.DateTimeCommand) : now;
      timeline.push({ icon: 'ri-shopping-bag-3-line', color: 'primary',
        text: `Commande #${o.IdOrder || '—'} reçue — utilisateur #${o.IdUser || '—'}`,
        time: fmt(t), rawTime: t, tag: 'Commande' });
    });
    const reclam = +(reclamationsCount || 0);
    if (reclam > 0) {
      timeline.push({ icon: 'ri-customer-service-2-line', color: 'danger',
        text: `${reclam} réclamation(s) au total nécessitent une attention.`,
        time: fmt(now), rawTime: now, tag: 'Réclamation' });
    }
    if (timeline.length === 0) {
      timeline.push({ icon: 'ri-shield-check-line', color: 'success',
        text: 'Système opérationnel — aucun incident signalé.', time: fmt(now), rawTime: now, tag: 'Système' });
    }
    this.activityTimelineAll = timeline.sort((a, b) => b.rawTime.getTime() - a.rawTime.getTime());
    this.applyActivityPeriod();
  }

  activityPeriod: '24h' | '7d' | 'month' = '24h';
  activityTimelineAll: any[] = [];

  activityPeriodLabel = 'Dernières 24h';

  applyActivityPeriod(): void {
    this.activityPeriodLabel = this.activityPeriod === '24h' ? 'Dernières 24h' : this.activityPeriod === '7d' ? '7 derniers jours' : 'Ce mois';
    const now = new Date();
    const cutoff = new Date(now);
    if (this.activityPeriod === '24h') cutoff.setDate(now.getDate() - 1);
    else if (this.activityPeriod === '7d') cutoff.setDate(now.getDate() - 7);
    else cutoff.setMonth(now.getMonth() - 1);
    let filtered = this.activityTimelineAll.filter(a => a.rawTime >= cutoff);
    // Si rien ne tombe dans la période choisie (données de démo anciennes),
    // on retombe sur tout plutôt que d'afficher un vide trompeur.
    if (filtered.length === 0) filtered = this.activityTimelineAll;
    this.activityTimeline = filtered.slice(0, 5);
  }

  // ── Pagination ───────────────────────────────────────────
  totalPages = 1;
  pagedOrders: any[] = [];
  pagerPages: number[] = [];

  private recomputeOrdersPagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.recentOrders.length / this.pageSize));
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedOrders = this.recentOrders.slice(start, start + this.pageSize);
    const total = this.totalPages;
    const cur   = Math.min(this.currentPage, total);
    let pstart = Math.max(1, cur - 1);
    let pend   = Math.min(total, pstart + 2);
    pstart = Math.max(1, pend - 2);
    const pages: number[] = [];
    for (let i = pstart; i <= pend; i++) pages.push(i);
    this.pagerPages = pages;
  }
  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.currentPage = p;
    this.recomputeOrdersPagination();
  }

  // ── Helpers ──────────────────────────────────────────────
  getAvatarColor(name: string): { bg: string; fg: string } {
    if (!name) return this.avatarPalette[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return this.avatarPalette[Math.abs(hash) % this.avatarPalette.length];
  }

  getStatusClass(status: string): string {
    const m: Record<string, string> = {
      pending:   'bg-warning-subtle text-warning',
      confirmed: 'bg-info-subtle text-info',
      shipped:   'bg-primary-subtle text-primary',
      delivered: 'bg-success-subtle text-success',
      cancelled: 'bg-danger-subtle text-danger',
    };
    return m[status] || 'bg-secondary-subtle text-secondary';
  }

  getStatusLabel(status: string): string {
    const m: Record<string, string> = {
      pending: 'En attente', confirmed: 'Confirmée', shipped: 'Expédiée',
      delivered: 'Livrée', cancelled: 'Annulée',
    };
    return m[status] || status;
  }

  getActivityPrefix(a: any): string {
    const text = a.text as string;
    const idx = text.search(/[:—]/);
    return idx !== -1 ? text.substring(0, idx).trim() + (text.includes(':') ? ' : ' : ' — ') : text;
  }

  getActivityName(a: any): string {
    const text = a.text as string;
    const idx = text.search(/[:—]/);
    return idx !== -1 ? text.substring(idx + 1).trim() : '';
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  scrollToTop(): void { window.scrollTo({ top: 0, behavior: 'smooth' }); }
  navigate(link: string): void { this.router.navigate([link]); }
}