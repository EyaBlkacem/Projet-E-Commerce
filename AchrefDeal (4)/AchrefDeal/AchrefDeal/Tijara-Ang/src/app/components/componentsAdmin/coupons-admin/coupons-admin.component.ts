import { Component, OnInit } from '@angular/core';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { CatalogAdminService } from 'src/app/core/services/catalog-admin.service';

interface CouponRow {
  id: number;
  title: string;
  description: string;
  price: number;
  dateStart: string;
  dateEnd: string;
  numberOfCoupon: number;
  used: number;
  active: boolean;
}

@Component({
  selector: 'app-coupons-admin',
  standalone: false,
  template: `
<div class="coupons-page">

  <!-- Header -->
  <div class="page-header d-flex align-items-start justify-content-between mb-4">
    <div class="d-flex align-items-center gap-3">
      <div class="header-icon"><i class="ri-coupon-2-fill"></i></div>
      <div>
        <h4 class="mb-1 fw-bold">Coupons</h4>
        <p class="text-muted mb-0 fs-13">Créez, gérez et suivez les performances de vos coupons.</p>
      </div>
    </div>
    <div class="breadcrumb-mini fs-13 text-muted">
      Dashboard <i class="ri-arrow-right-s-line"></i> <span class="fw-semibold text-dark">Coupons</span>
    </div>
  </div>

  <!-- KPI cards -->
  <div class="row g-3 mb-4">
    <div class="col-6 col-lg-3">
      <div class="stat-card stat-red">
        <div class="d-flex align-items-start justify-content-between">
          <div class="stat-icon"><i class="ri-coupon-2-fill"></i></div>
          <i class="ri-more-2-fill stat-menu"></i>
        </div>
        <div class="stat-label">TOTAL COUPONS</div>
        <div class="stat-value">{{ totalItems }}</div>
        <div class="stat-sub">Tous les coupons créés</div>
        <svg class="stat-spark" viewBox="0 0 100 30" preserveAspectRatio="none">
          <polyline points="0,25 15,22 30,24 45,15 60,18 75,8 100,4" fill="none" stroke="#f06548" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
    <div class="col-6 col-lg-3">
      <div class="stat-card stat-green">
        <div class="d-flex align-items-start justify-content-between">
          <div class="stat-icon"><i class="ri-checkbox-circle-fill"></i></div>
          <i class="ri-more-2-fill stat-menu"></i>
        </div>
        <div class="stat-label">ACTIFS</div>
        <div class="stat-value">{{ activeCount }}</div>
        <div class="stat-sub">Coupons actifs</div>
        <svg class="stat-spark" viewBox="0 0 100 30" preserveAspectRatio="none">
          <polyline points="0,20 15,24 30,16 45,19 60,10 75,13 100,5" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
    <div class="col-6 col-lg-3">
      <div class="stat-card stat-blue">
        <div class="d-flex align-items-start justify-content-between">
          <div class="stat-icon"><i class="ri-bar-chart-2-fill"></i></div>
          <i class="ri-more-2-fill stat-menu"></i>
        </div>
        <div class="stat-label">UTILISATIONS</div>
        <div class="stat-value">{{ totalUsed }}</div>
        <div class="stat-sub">Total des utilisations</div>
        <svg class="stat-spark" viewBox="0 0 100 30" preserveAspectRatio="none">
          <polyline points="0,26 15,20 30,23 45,17 60,19 75,10 100,7" fill="none" stroke="#299cdb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
    <div class="col-6 col-lg-3">
      <div class="stat-card stat-orange">
        <div class="d-flex align-items-start justify-content-between">
          <div class="stat-icon"><i class="ri-time-fill"></i></div>
          <i class="ri-more-2-fill stat-menu"></i>
        </div>
        <div class="stat-label">EXPIRÉS</div>
        <div class="stat-value">{{ expiredCount }}</div>
        <div class="stat-sub">Coupons expirés</div>
        <svg class="stat-spark" viewBox="0 0 100 30" preserveAspectRatio="none">
          <polyline points="0,10 15,18 30,12 45,20 60,14 75,22 100,6" fill="none" stroke="#f7a53b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  </div>

  <!-- List card -->
  <div class="list-card">
    <div class="list-header d-flex flex-wrap align-items-center gap-3">
      <div class="header-icon header-icon-sm"><i class="ri-coupon-2-fill"></i></div>
      <div class="flex-grow-1">
        <div class="d-flex align-items-center gap-2">
          <h6 class="mb-0 fw-bold">Liste des coupons</h6>
          <span class="count-pill">{{ totalItems }}</span>
        </div>
        <p class="text-muted fs-12 mb-0">Retrouvez et gérez tous vos coupons.</p>
      </div>

      <div class="search-box">
        <i class="ri-search-line"></i>
        <input type="text" placeholder="Titre, description…" [(ngModel)]="search" (input)="onSearchChange()" />
        @if (search) {
          <button type="button" class="search-clear" (click)="clearSearch()" title="Effacer">
            <i class="ri-close-line"></i>
          </button>
        }
      </div>

      <button class="btn-filter"><i class="ri-filter-3-line"></i> Filtres</button>
      <button class="btn-primary-solid" (click)="openAdd()"><i class="ri-add-line"></i> Nouveau coupon</button>
    </div>

    <div class="list-body">
      @if (loading) {
        <div class="text-center py-5"><div class="spinner-border" style="color:#7c5cff"></div></div>
      } @else if (items.length === 0) {
        <div class="empty-state text-center py-5">
          <div class="empty-illustration mx-auto mb-3">
            <svg viewBox="0 0 220 180" width="150" height="130">
              <ellipse cx="110" cy="140" rx="55" ry="10" fill="#ede9fe"/>
              <circle cx="35" cy="55" r="4" fill="#c4b5fd"/>
              <circle cx="185" cy="70" r="5" fill="#ddd6fe"/>
              <circle cx="45" cy="105" r="3" fill="#a78bfa"/>
              <circle cx="175" cy="35" r="3" fill="#f9c5d1"/>
              <path d="M165 120 q10 10 8 22" fill="none" stroke="#c4b5fd" stroke-width="3" stroke-linecap="round"/>
              <circle cx="175" cy="145" r="3" fill="#c4b5fd"/>
              <g transform="translate(65,55) rotate(-8)">
                <rect x="0" y="0" width="90" height="52" rx="10" fill="#8b5cf6"/>
                <rect x="0" y="0" width="90" height="52" rx="10" fill="url(#g1)"/>
                <circle cx="0" cy="26" r="8" fill="#faf9ff"/>
                <circle cx="90" cy="26" r="8" fill="#faf9ff"/>
                <line x1="45" y1="10" x2="45" y2="42" stroke="#faf9ff" stroke-width="2" stroke-dasharray="4 3"/>
                <text x="22" y="32" font-size="14" fill="#faf9ff" font-family="Arial" font-weight="bold">%</text>
              </g>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#a78bfa"/>
                  <stop offset="1" stop-color="#7c3aed"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h6 class="fw-bold mb-1">Aucun coupon pour le moment</h6>
          <p class="text-muted fs-13 mb-3">Commencez par créer votre premier coupon.</p>
          <button class="btn-primary-solid mx-auto" (click)="openAdd()"><i class="ri-add-line"></i> Créer le premier coupon</button>
        </div>
      } @else {
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th class="ps-3">Titre</th>
                <th class="text-end">Prix</th>
                <th class="text-center">Stock / Utilisés</th>
                <th>Validité</th>
                <th class="text-center">Statut</th>
                <th class="text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (c of items; track c.id) {
                <tr>
                  <td class="ps-3">
                    <div class="fs-13 fw-semibold">{{ c.title || '—' }}</div>
                    <div class="fs-11 text-muted text-truncate" style="max-width:280px">{{ c.description || '' }}</div>
                  </td>
                  <td class="text-end fw-semibold" style="color:#16a34a">{{ c.price | number:'1.2-2' }} TND</td>
                  <td class="text-center">
                    <div class="d-flex flex-column align-items-center gap-1">
                      <span class="fs-12 fw-semibold">{{ c.used }} / {{ c.numberOfCoupon || '∞' }}</span>
                      @if (c.numberOfCoupon > 0) {
                        <div class="mini-progress"><div class="mini-progress-bar" [style.width.%]="usagePercent(c)"></div></div>
                      }
                    </div>
                  </td>
                  <td class="fs-12">
                    <div>Du {{ formatDate(c.dateStart) }}</div>
                    <div class="text-muted">au {{ formatDate(c.dateEnd) }}</div>
                  </td>
                  <td class="text-center">
                    @if (isExpired(c)) { <span class="badge-status badge-expired">Expiré</span> }
                    @else if (c.active) { <span class="badge-status badge-active">Actif</span> }
                    @else { <span class="badge-status badge-inactive">Inactif</span> }
                  </td>
                  <td class="text-end pe-3">
                    <div class="d-flex justify-content-end gap-2">
                      <button class="btn-ghost" (click)="openEdit(c)" title="Modifier"><i class="ri-edit-2-line"></i></button>
                      <button class="btn-ghost" (click)="toggleActive(c)" [title]="c.active ? 'Désactiver' : 'Activer'">
                        <i [class]="c.active ? 'ri-pause-circle-line' : 'ri-play-circle-line'"></i>
                      </button>
                      <button class="btn-ghost btn-ghost-danger" (click)="remove(c)" title="Supprimer"><i class="ri-delete-bin-line"></i></button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination numérique : la page demandée est envoyée au backend, pas de découpage côté Angular -->
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-3 coupons-pagination-bar">
          <span class="fs-12 text-muted">
            Page {{ currentPage }} / {{ lastPage }} — {{ totalItems }} coupon(s)
          </span>
          <nav>
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" [class.disabled]="currentPage <= 1">
                <button class="page-link" (click)="goToPage(currentPage - 1)">
                  <i class="ri-arrow-left-s-line"></i>
                </button>
              </li>
              @for (p of getPageNumbers(); track $index) {
                @if (p === '...') {
                  <li class="page-item disabled"><span class="page-link">…</span></li>
                } @else {
                  <li class="page-item" [class.active]="p === currentPage">
                    <button class="page-link" (click)="goToPage(asNumber(p))">{{ p }}</button>
                  </li>
                }
              }
              <li class="page-item" [class.disabled]="currentPage >= lastPage">
                <button class="page-link" (click)="goToPage(currentPage + 1)">
                  <i class="ri-arrow-right-s-line"></i>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      }
    </div>
  </div>
</div>

@if (showForm) {
  <div class="modal fade show d-block" tabindex="-1" style="background:rgba(15,10,35,.45)" (click)="cancel($event)">
    <div class="modal-dialog modal-lg modal-dialog-centered" (click)="$event.stopPropagation()">
      <div class="modal-content border-0 shadow-lg coupon-modal">
        <div class="modal-header">
          <h5 class="modal-title fw-bold">
            <i class="ri-coupon-2-fill me-2" style="color:#8b5cf6"></i>{{ editingId ? 'Modifier le coupon' : 'Nouveau coupon' }}
          </h5>
          <button type="button" class="btn-close" (click)="cancel()"></button>
        </div>
        <div class="modal-body">
          @if (saveError) {
            <div class="alert alert-danger fs-13"><i class="ri-error-warning-line me-2"></i>{{ saveError }}</div>
          }
          <div class="row g-3">
            <div class="col-md-8">
              <label class="form-label fs-12 fw-semibold">Titre *</label>
              <input class="form-control form-control-sm" [(ngModel)]="form.title" placeholder="Ex : Coupon -20%" />
            </div>
            <div class="col-md-4">
              <label class="form-label fs-12 fw-semibold">Prix (TND)</label>
              <input type="number" min="0" step="0.01" class="form-control form-control-sm" [(ngModel)]="form.price" />
            </div>
            <div class="col-12">
              <label class="form-label fs-12 fw-semibold">Description</label>
              <textarea class="form-control form-control-sm" rows="2" [(ngModel)]="form.description"></textarea>
            </div>
            <div class="col-md-4">
              <label class="form-label fs-12 fw-semibold">Date début</label>
              <input type="date" class="form-control form-control-sm" [(ngModel)]="form.dateStart" />
            </div>
            <div class="col-md-4">
              <label class="form-label fs-12 fw-semibold">Date fin</label>
              <input type="date" class="form-control form-control-sm" [(ngModel)]="form.dateEnd" />
            </div>
            <div class="col-md-4">
              <label class="form-label fs-12 fw-semibold">Nombre total</label>
              <input type="number" min="0" class="form-control form-control-sm" [(ngModel)]="form.numberOfCoupon" />
            </div>
            <div class="col-12">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="coupon-active" [(ngModel)]="form.active" />
                <label class="form-check-label fs-13" for="coupon-active">Actif</label>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost-text" (click)="cancel()" [disabled]="saving">Annuler</button>
          <button class="btn-primary-solid" (click)="save()" [disabled]="saving">
            @if (saving) { <span class="spinner-border spinner-border-sm me-1"></span> }
            <i class="ri-save-line me-1"></i> Enregistrer
          </button>
        </div>
      </div>
    </div>
  </div>
}
`,
  styles: [`
    .coupons-page { font-family: inherit; }

    .header-icon {
      width: 52px; height: 52px; border-radius: 14px;
      background: linear-gradient(135deg,#ede9fe,#ddd6fe);
      display:flex; align-items:center; justify-content:center;
      color:#7c3aed; font-size:24px;
    }
    .header-icon-sm { width:40px; height:40px; border-radius:12px; font-size:18px; }
    .breadcrumb-mini i { vertical-align: middle; }

    /* KPI cards */
    .stat-card {
      position:relative; overflow:hidden; border-radius:18px; padding:18px 20px;
      box-shadow: 0 2px 10px rgba(20,10,50,.05);
      border: 1px solid rgba(0,0,0,.03);
      min-height: 112px;
    }
    .stat-red    { background: linear-gradient(135deg,#fff8f7,#fdeceb); }
    .stat-green  { background: linear-gradient(135deg,#f6fdf9,#e9f9ef); }
    .stat-blue   { background: linear-gradient(135deg,#f5fafd,#e7f3fc); }
    .stat-orange { background: linear-gradient(135deg,#fffaf5,#fff1e3); }

    .stat-icon {
      width:40px; height:40px; border-radius:12px;
      display:flex; align-items:center; justify-content:center; font-size:18px;
      background: rgba(255,255,255,.7);
    }
    .stat-red    .stat-icon { color:#f06548; }
    .stat-green  .stat-icon { color:#16a34a; }
    .stat-blue   .stat-icon { color:#299cdb; }
    .stat-orange .stat-icon { color:#f7a53b; }

    .stat-menu { color:#c9c3db; font-size:18px; }
    .stat-label { font-size:11px; font-weight:700; letter-spacing:.05em; color:#9a93b3; margin-top:12px; }
    .stat-red    .stat-label { color:#e8735d; }
    .stat-green  .stat-label { color:#4f9d72; }
    .stat-blue   .stat-label { color:#4fa1c9; }
    .stat-orange .stat-label { color:#d98a4a; }
    .stat-value { font-size:26px; font-weight:800; margin-top:2px; }
    .stat-red    .stat-value { color:#f06548; }
    .stat-green  .stat-value { color:#16a34a; }
    .stat-blue   .stat-value { color:#299cdb; }
    .stat-orange .stat-value { color:#f7a53b; }
    .stat-sub { font-size:11.5px; color:#9a93b3; margin-top:2px; }
    .stat-spark { width:100%; height:24px; margin-top:6px; }

    /* List card */
    .list-card { background:#fff; border-radius:18px; box-shadow: 0 2px 10px rgba(20,10,50,.05); border:1px solid rgba(0,0,0,.03); }
    .list-header { padding:18px 20px; border-bottom:1px solid #f1eefc; }
    .count-pill { background:#f1edff; color:#7c3aed; font-size:12px; font-weight:700; padding:2px 10px; border-radius:999px; }

    .search-box {
      display:flex; align-items:center; gap:6px; background:#f7f6fb; border:1px solid #eeebf7;
      border-radius:10px; padding:6px 12px; min-width:220px; color:#a8a2bf; font-size:13px;
    }
    .search-box input { border:none; background:transparent; outline:none; font-size:13px; width:100%; color:#333; }
    .search-clear { background:transparent; border:none; color:#a8a2bf; display:flex; align-items:center; padding:0; }
    .search-clear:hover { color:#6b6483; }

    .btn-filter {
      display:flex; align-items:center; gap:6px; background:#fff; border:1px solid #e7e3f4; color:#6b6483;
      border-radius:10px; padding:8px 14px; font-size:13px; font-weight:600;
    }
    .btn-primary-solid {
      display:flex; align-items:center; gap:6px; background:#7c5cff; border:none; color:#fff;
      border-radius:10px; padding:9px 16px; font-size:13px; font-weight:700;
      box-shadow: 0 4px 12px rgba(124,92,255,.35);
    }
    .btn-primary-solid:hover { background:#6a49f2; }
    .btn-ghost-text { background:transparent; border:none; color:#6b6483; font-size:13px; font-weight:600; padding:9px 14px; }

    .list-body { min-height: 260px; }
    .empty-illustration { width:150px; height:130px; }

    /* Table */
    .table thead th { background:#faf9ff; color:#8a8399; font-size:11px; text-transform:uppercase; letter-spacing:.04em; border-bottom:1px solid #f1eefc; font-weight:700; }
    .table td { border-color:#f5f3fb; vertical-align:middle; }

    .mini-progress { width:80px; height:5px; background:#f1eefc; border-radius:99px; overflow:hidden; }
    .mini-progress-bar { height:100%; background:#16a34a; border-radius:99px; }

    .badge-status { font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px; }
    .badge-active   { background:#e9f9ef; color:#16a34a; }
    .badge-inactive { background:#f1eefc; color:#9a93b3; }
    .badge-expired  { background:#fff1de; color:#f7a53b; }

    .btn-ghost { background:#f7f6fb; border:none; border-radius:8px; padding:6px 9px; font-size:13px; color:#6b6483; display:inline-flex; align-items:center; justify-content:center; }
    .btn-ghost-danger { color:#ef4444; }

    .coupon-modal .modal-header { background:#faf9ff; border-bottom:1px solid #f1eefc; }

    /* Pagination */
    .coupons-pagination-bar { border-top: 1px solid #f1eefc; }
    .coupons-pagination-bar .page-link {
      color:#6b6483; border-color:#eeebf7; font-size:13px;
    }
    .coupons-pagination-bar .page-item.active .page-link {
      background:#7c5cff; border-color:#7c5cff; color:#fff;
    }
    .coupons-pagination-bar .page-item.disabled .page-link {
      color:#c9c3db; background:#faf9ff;
    }

    /* ═════════════════════════════════════════════════
       Adaptation Dark Mode (même logique que factures-admin / annonces-admin)
       ═════════════════════════════════════════════════ */
    :host-context([data-bs-theme="dark"]) {
      .header-icon {
        background: rgba(139, 92, 246, .18);
        color: #a78bfa;
      }

      .breadcrumb-mini, .breadcrumb-mini .text-muted { color: var(--bs-secondary-color) !important; }
      .breadcrumb-mini .text-dark { color: var(--bs-emphasis-color) !important; }

      /* Cartes KPI */
      .stat-card {
        border-color: var(--bs-border-color);
        box-shadow: 0 3px 10px -4px rgba(0,0,0,.3);
      }
      .stat-red    { background: linear-gradient(135deg, var(--bs-card-bg), rgba(240,101,72,.08)); }
      .stat-green  { background: linear-gradient(135deg, var(--bs-card-bg), rgba(22,163,74,.08)); }
      .stat-blue   { background: linear-gradient(135deg, var(--bs-card-bg), rgba(41,156,219,.08)); }
      .stat-orange { background: linear-gradient(135deg, var(--bs-card-bg), rgba(247,165,59,.08)); }

      .stat-icon { background: rgba(255,255,255,.06); }
      .stat-red    .stat-icon { color:#f47a63; }
      .stat-green  .stat-icon { color:#34d399; }
      .stat-blue   .stat-icon { color:#5db8ea; }
      .stat-orange .stat-icon { color:#fb923c; }

      .stat-menu { color: var(--bs-secondary-color); }
      .stat-label { color: var(--bs-secondary-color); }
      .stat-red    .stat-label { color:#f47a63; }
      .stat-green  .stat-label { color:#34d399; }
      .stat-blue   .stat-label { color:#5db8ea; }
      .stat-orange .stat-label { color:#fb923c; }
      .stat-value { color: var(--bs-emphasis-color); }
      .stat-red    .stat-value { color:#f47a63; }
      .stat-green  .stat-value { color:#34d399; }
      .stat-blue   .stat-value { color:#5db8ea; }
      .stat-orange .stat-value { color:#fb923c; }
      .stat-sub { color: var(--bs-secondary-color); }

      /* Carte liste */
      .list-card { background: var(--bs-card-bg); border-color: var(--bs-border-color); box-shadow: 0 2px 12px rgba(0,0,0,.35); }
      .list-header { border-color: var(--bs-border-color); }
      .header-icon-sm { background: rgba(139,92,246,.18); color:#a78bfa; }
      .count-pill { background: rgba(139,92,246,.18); color:#a78bfa; }

      .search-box { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); color: var(--bs-secondary-color); }
      .search-box input { color: var(--bs-body-color); }
      .search-box input::placeholder { color: var(--bs-secondary-color); }
      .search-clear { color: var(--bs-secondary-color); }

      .btn-filter { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); color: var(--bs-body-color); }
      .btn-filter:hover { background: var(--bs-secondary-bg); }
      .btn-ghost-text { color: var(--bs-body-color); }

      /* Table */
      .table thead th { background: var(--bs-tertiary-bg); color: var(--bs-secondary-color); border-color: var(--bs-border-color); }
      .table td { border-color: var(--bs-border-color); color: var(--bs-body-color); }
      .table-hover > tbody > tr:hover > * { background-color: var(--bs-tertiary-bg); }

      .mini-progress { background: var(--bs-tertiary-bg); }
      .badge-active   { background: rgba(22,163,74,.18); color:#34d399; }
      .badge-inactive { background: var(--bs-tertiary-bg); color: var(--bs-secondary-color); }
      .badge-expired  { background: rgba(247,165,59,.18); color:#fb923c; }

      .btn-ghost { background: var(--bs-tertiary-bg); color: var(--bs-body-color); }
      .btn-ghost:hover { background: var(--bs-secondary-bg); }
      .btn-ghost-danger { color:#f87171; }

      /* Pagination */
      .coupons-pagination-bar { border-color: var(--bs-border-color); }
      .coupons-pagination-bar .page-link {
        background: var(--bs-tertiary-bg); color: var(--bs-body-color); border-color: var(--bs-border-color);
      }
      .coupons-pagination-bar .page-item.active .page-link {
        background:#7c5cff; border-color:#7c5cff; color:#fff;
      }
      .coupons-pagination-bar .page-item.disabled .page-link {
        color: var(--bs-secondary-color); background: var(--bs-tertiary-bg);
      }

      /* Modal */
      .coupon-modal { background: var(--bs-card-bg); }
      .coupon-modal .modal-header { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); }
      .coupon-modal .modal-footer { border-color: var(--bs-border-color); }
      .form-control, .form-select {
        background-color: var(--bs-tertiary-bg);
        border-color: var(--bs-border-color);
        color: var(--bs-body-color);
      }
      .form-control::placeholder { color: var(--bs-secondary-color); }
      .form-control:focus, .form-select:focus { background-color: var(--bs-tertiary-bg); }

      .empty-illustration { opacity: .92; }
      .empty-state .text-muted { color: var(--bs-secondary-color) !important; }
    }
  `],
})
export class CouponsAdminComponent implements OnInit {
  items: CouponRow[] = [];
  search = '';
  loading = true;
  private searchDebounce: any = null;

  // Pagination 100% backend
  currentPage = 1;
  perPage     = 10;
  totalItems  = 0;
  lastPage    = 1;

  showForm = false;
  saving   = false;
  saveError = '';
  editingId: number | null = null;
  form = { title: '', description: '', price: 0, dateStart: '', dateEnd: '', numberOfCoupon: 0, active: true };

  // KPI agrégés sur l'ensemble des coupons (toutes pages), pas seulement la page affichée
  activeCount = 0;
  expiredCount = 0;
  totalUsed = 0;

  constructor(private api: TijaraApiService, private catalogAdmin: CatalogAdminService) {}

  ngOnInit(): void {
    this.load();
    this.loadStats();
  }

  private buildParams(): any {
    const params: any = { page: this.currentPage, per_page: this.perPage };
    if (this.search.trim()) params.search = this.search.trim();
    return params;
  }

  private mapCoupon(c: any): CouponRow {
    return {
      id:             +(c.id_coupon ?? c.IdCoupon ?? c.id ?? 0),
      title:           c.title         ?? c.Title         ?? '',
      description:     c.description   ?? c.Description   ?? '',
      price:          +(c.price        ?? c.Price        ?? 0),
      dateStart:       this.toDateInput(c.date_start ?? c.DateStart),
      dateEnd:         this.toDateInput(c.date_end   ?? c.DateEnd),
      numberOfCoupon:+(c.number_of_coupon ?? c.NumberOfCoupon ?? 0),
      used:           +(c.used         ?? c.Used         ?? 0),
      active:       !!(c.active        ?? c.Active        ?? true),
    };
  }

  load(): void {
    this.loading = true;
    this.catalogAdmin.adminList('coupons', this.buildParams()).subscribe({
      next: (res: any) => {
        const data: any[] = res?.data || [];
        this.items       = data.map((c: any) => this.mapCoupon(c));
        this.totalItems  = res?.total        ?? this.items.length;
        this.lastPage    = res?.last_page    ?? 1;
        this.currentPage = res?.current_page ?? this.currentPage;
        this.loading = false;
      },
      error: () => { this.loading = false; alert('Chargement impossible.'); }
    });
  }

  /**
   * Les KPI (Actifs / Expirés / Utilisations) ont besoin de l'ensemble des coupons,
   * pas seulement de la page affichée. Comme le backend ne fournit pas d'endpoint
   * d'agrégation, on parcourt toutes les pages (par lots de 50, le max autorisé par
   * CouponsController) puis on calcule les totaux côté client. Plafonné à 20 pages
   * (1000 coupons) par sécurité anti-boucle.
   */
  private loadStats(): void {
    this.fetchAllForStats(1, []);
  }

  private fetchAllForStats(page: number, acc: CouponRow[]): void {
    this.catalogAdmin.adminList('coupons', { page, per_page: 50 }).subscribe({
      next: (res: any) => {
        const data: any[] = res?.data || [];
        const combined = acc.concat(data.map((c: any) => this.mapCoupon(c)));
        const lastPage = res?.last_page ?? 1;
        if (page < lastPage && page < 20) {
          this.fetchAllForStats(page + 1, combined);
        } else {
          this.activeCount  = combined.filter(c => c.active && !this.isExpired(c)).length;
          this.expiredCount = combined.filter(c => this.isExpired(c)).length;
          this.totalUsed    = combined.reduce((s, c) => s + (+c.used || 0), 0);
        }
      },
      error: () => { /* KPI secondaires : on échoue silencieusement */ }
    });
  }

  onSearchChange(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.currentPage = 1;
      this.load();
    }, 400);
  }

  clearSearch(): void {
    this.search = '';
    this.currentPage = 1;
    this.load();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.lastPage || page === this.currentPage) return;
    this.currentPage = page;
    this.load();
  }

  /** Génère la liste des numéros de page à afficher, avec ellipses ("...") pour les longues listes. */
  getPageNumbers(): (number | string)[] {
    const total = this.lastPage;
    const current = this.currentPage;

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

  isExpired(c: CouponRow): boolean {
    if (!c.dateEnd) return false;
    const dt = new Date(c.dateEnd);
    return !isNaN(dt.getTime()) && dt < new Date();
  }
  usagePercent(c: CouponRow): number {
    return c.numberOfCoupon > 0 ? Math.min(100, Math.round((c.used / c.numberOfCoupon) * 100)) : 0;
  }

  openAdd(): void {
    this.editingId = null; this.saveError = '';
    this.form = { title: '', description: '', price: 0, dateStart: '', dateEnd: '', numberOfCoupon: 0, active: true };
    this.showForm = true;
  }
  openEdit(c: CouponRow): void {
    this.editingId = c.id; this.saveError = '';
    this.form = { title: c.title, description: c.description, price: c.price,
      dateStart: c.dateStart, dateEnd: c.dateEnd, numberOfCoupon: c.numberOfCoupon, active: c.active };
    this.showForm = true;
  }
  cancel(_ev?: Event): void { this.showForm = false; this.saving = false; this.saveError = ''; }

  save(): void {
    if (!this.form.title.trim()) { this.saveError = 'Le titre est requis.'; return; }
    this.saving = true; this.saveError = '';
    const payload = {
      Title: this.form.title, Description: this.form.description, Price: +this.form.price || 0,
      DateStart: this.form.dateStart || null, DateEnd: this.form.dateEnd || null,
      NumberOfCoupon: +this.form.numberOfCoupon || 0, Used: 0, Active: this.form.active,
    };
    const op = this.editingId
      ? this.catalogAdmin.adminUpdate('coupons', this.editingId, payload)
      : this.catalogAdmin.adminCreate('coupons', payload);
    op.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); this.loadStats(); },
      error: (err) => { this.saving = false; this.saveError = err?.error?.message || 'Erreur d\'enregistrement.'; },
    });
  }

  toggleActive(c: CouponRow): void {
    this.catalogAdmin.adminUpdate('coupons', c.id, {
      Title: c.title, Description: c.description, Price: c.price,
      DateStart: c.dateStart || null, DateEnd: c.dateEnd || null,
      NumberOfCoupon: c.numberOfCoupon, Used: c.used, Active: !c.active,
    }).subscribe({
      next: () => { c.active = !c.active; this.loadStats(); },
      error: () => alert('Action impossible.'),
    });
  }
  remove(c: CouponRow): void {
    if (!confirm(`Supprimer le coupon "${c.title}" ?`)) return;
    this.catalogAdmin.adminDelete('coupons', c.id).subscribe({
      next: () => { this.load(); this.loadStats(); },
      error: () => alert('Suppression impossible.'),
    });
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
  }
  private toDateInput(d: any): string {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
  }
}
