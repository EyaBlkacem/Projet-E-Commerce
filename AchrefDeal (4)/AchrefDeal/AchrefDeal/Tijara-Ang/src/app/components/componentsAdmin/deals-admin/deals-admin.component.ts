import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { CategoriesService } from 'src/app/core/services/categories.service';
import { DealsService } from 'src/app/core/services/deals.service';

interface DealRow {
  id: number;
  title: string;
  description: string;
  price: string;
  discount: number;
  image: string;
  category: string;
  vendorName: string;
  shopName: string;
  vendorAvatar: string;
  isActive: boolean;
  date: string | null;
  quantity: number;
}

interface CategoryStat {
  name: string;
  count: number;
  percent: number;
  color: string;
  bg: string;
  icon: string;
  gradient: string;
}

@Component({
  selector: 'app-deals-admin',
  standalone: false,
  template: `
<div class="deals-admin">

  <!-- ===== Top header ===== -->
  <div class="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-3">
    <div>
      <h4 class="mb-0 fw-bold">Deals & promotions</h4>
      <p class="text-muted mb-0 fs-13">Gérez vos deals et suivez leurs performances</p>
    </div>
    <button class="btn btn-primary d-flex align-items-center gap-1">
      <i class="ri-add-line"></i> Nouveau deal
    </button>
  </div>

  <!-- ===== Stat cards ===== -->
  <div class="row g-3 mb-3">
    <div class="col-6 col-md-3">
      <div class="card border-0 shadow-sm h-100 stat-card overflow-hidden">
        <div class="card-body pb-4">
          <div class="d-flex align-items-center gap-3 mb-2">
            <div class="avatar-md rounded-3 bg-purple-subtle d-flex align-items-center justify-content-center">
              <i class="ri-price-tag-3-line fs-22 text-purple"></i>
            </div>
            <div>
              <h3 class="mb-0 fw-bold">{{ statTotal }}</h3>
              <p class="mb-0 fs-12 text-muted">Total deals</p>
            </div>
          </div>
          <span class="fs-11 fw-semibold text-success"><i class="ri-arrow-up-line"></i> 12% ce mois</span>
        </div>
        <svg class="spark" viewBox="0 0 200 50" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#7c5cfc" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#7c5cfc" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,38 C20,20 35,42 55,30 C75,18 90,36 110,26 C130,16 150,34 170,22 C185,14 195,26 200,18 L200,50 L0,50 Z" fill="url(#gradPurple)"/>
          <path d="M0,38 C20,20 35,42 55,30 C75,18 90,36 110,26 C130,16 150,34 170,22 C185,14 195,26 200,18" fill="none" stroke="#7c5cfc" stroke-width="2"/>
        </svg>
      </div>
    </div>

    <div class="col-6 col-md-3">
      <div class="card border-0 shadow-sm h-100 stat-card overflow-hidden">
        <div class="card-body pb-4">
          <div class="d-flex align-items-center gap-3 mb-2">
            <div class="avatar-md rounded-3 bg-success-subtle d-flex align-items-center justify-content-center">
              <i class="ri-checkbox-circle-line fs-22 text-success"></i>
            </div>
            <div>
              <h3 class="mb-0 fw-bold">{{ statActive }}</h3>
              <p class="mb-0 fs-12 text-muted">Deals actifs</p>
            </div>
          </div>
          <span class="fs-11 fw-semibold text-success"><i class="ri-arrow-up-line"></i> 8% ce mois</span>
        </div>
        <svg class="spark" viewBox="0 0 200 50" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0ab39c" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#0ab39c" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,30 C20,40 35,16 55,28 C75,40 90,20 110,24 C130,28 150,12 170,20 C185,26 195,22 200,30 L200,50 L0,50 Z" fill="url(#gradGreen)"/>
          <path d="M0,30 C20,40 35,16 55,28 C75,40 90,20 110,24 C130,28 150,12 170,20 C185,26 195,22 200,30" fill="none" stroke="#0ab39c" stroke-width="2"/>
          <circle cx="150" cy="12" r="3.5" fill="#0ab39c" />
        </svg>
      </div>
    </div>

    <div class="col-6 col-md-3">
      <div class="card border-0 shadow-sm h-100 stat-card overflow-hidden">
        <div class="card-body pb-4">
          <div class="d-flex align-items-center gap-3 mb-2">
            <div class="avatar-md rounded-3 bg-warning-subtle d-flex align-items-center justify-content-center">
              <i class="ri-time-line fs-22 text-warning"></i>
            </div>
            <div>
              <h3 class="mb-0 fw-bold">{{ statPending }}</h3>
              <p class="mb-0 fs-12 text-muted">En attente</p>
            </div>
          </div>
          <span class="fs-11 fw-semibold text-muted"><i class="ri-subtract-line"></i> 0% ce mois</span>
        </div>
        <svg class="spark" viewBox="0 0 200 50" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#f7b84b" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#f7b84b" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,32 C20,26 35,38 55,30 C75,22 90,34 110,28 C130,22 150,32 170,26 C185,22 195,28 200,24 L200,50 L0,50 Z" fill="url(#gradOrange)"/>
          <path d="M0,32 C20,26 35,38 55,30 C75,22 90,34 110,28 C130,22 150,32 170,26 C185,22 195,28 200,24" fill="none" stroke="#f7b84b" stroke-width="2"/>
        </svg>
      </div>
    </div>

    <div class="col-6 col-md-3">
      <div class="card border-0 shadow-sm h-100 stat-card overflow-hidden">
        <div class="card-body pb-4">
          <div class="d-flex align-items-center gap-3 mb-2">
            <div class="avatar-md rounded-3 bg-info-subtle d-flex align-items-center justify-content-center">
              <i class="ri-percent-line fs-22 text-info"></i>
            </div>
            <div>
              <h3 class="mb-0 fw-bold">{{ avgDiscount | number:'1.0-0' }}%</h3>
              <p class="mb-0 fs-12 text-muted">Réduction moyenne</p>
            </div>
          </div>
          <span class="fs-11 fw-semibold text-success"><i class="ri-arrow-up-line"></i> 2% ce mois</span>
        </div>
        <svg class="spark" viewBox="0 0 200 50" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#299cdb" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#299cdb" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,26 C20,34 35,20 55,26 C75,32 90,18 110,22 C130,26 150,14 170,20 C185,24 195,16 200,20 L200,50 L0,50 Z" fill="url(#gradBlue)"/>
          <path d="M0,26 C20,34 35,20 55,26 C75,32 90,18 110,22 C130,26 150,14 170,20 C185,24 195,16 200,20" fill="none" stroke="#299cdb" stroke-width="2"/>
        </svg>
      </div>
    </div>
  </div>

  <!-- ===== Main content ===== -->
  <div class="row g-3">
    <!-- Table -->
    <div class="col-lg-8">
      <div class="card border-0 shadow-sm" id="deals-table-card">
        <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2 py-2">
          <h6 class="mb-0 fw-semibold flex-grow-1">
            Tous les deals
            <span class="badge bg-danger-subtle text-danger ms-2">{{ totalItems }}</span>
          </h6>
          <div class="input-group input-group-sm" style="max-width:200px">
            <span class="input-group-text bg-white border-end-0"><i class="ri-search-line"></i></span>
            <input type="text" class="form-control border-start-0" placeholder="Rechercher…"
                   [(ngModel)]="search" (input)="onSearchChange()" />
          </div>
          <button class="btn btn-light btn-sm d-flex align-items-center gap-1">
            <i class="ri-filter-3-line"></i> Filtres
          </button>
          <button class="btn btn-light btn-sm"><i class="ri-fullscreen-line"></i></button>
          <button class="btn btn-light btn-sm"><i class="ri-equalizer-line"></i></button>
        </div>

        <div class="card-body p-0">
          @if (loading) {
            <div class="text-center py-5"><div class="spinner-border text-danger"></div></div>
          } @else if (items.length === 0) {
            <div class="text-center py-5">
              <i class="ri-flashlight-line display-3 text-muted opacity-50"></i>
              <p class="text-muted mt-2 mb-0">Aucun deal ne correspond.</p>
            </div>
          } @else {
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th class="ps-3 text-uppercase fs-11 text-muted">Deal</th>
                    <th class="text-uppercase fs-11 text-muted">Vendeur</th>
                    <th class="text-uppercase fs-11 text-muted">Catégorie</th>
                    <th class="text-uppercase fs-11 text-muted">Prix</th>
                    <th class="text-center text-uppercase fs-11 text-muted">Réduction</th>
                    <th class="text-center text-uppercase fs-11 text-muted">Stock</th>
                    <th class="text-center text-uppercase fs-11 text-muted">Statut</th>
                    <th class="text-end pe-3 text-uppercase fs-11 text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (d of items; track d.id) {
                    <tr>
                      <td class="ps-3">
                        <div class="d-flex align-items-center gap-2">
                          @if (d.image) {
                            <img [src]="d.image" alt="" class="rounded" width="40" height="40"
                                 style="object-fit:cover" (error)="d.image=''" />
                          } @else {
                            <div class="rounded bg-danger-subtle text-danger
                                        d-flex align-items-center justify-content-center"
                                 style="width:40px;height:40px">
                              <i class="ri-flashlight-line fs-18"></i>
                            </div>
                          }
                          <div>
                            <div class="fs-13 fw-semibold text-truncate" style="max-width:180px">{{ d.title }}</div>
                            <div class="fs-11 text-muted">ID #{{ d.id }} · {{ formatDate(d.date) }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="fs-12">
                        <div class="d-flex align-items-center gap-2">
                          <img [src]="d.vendorAvatar" class="rounded-circle" width="28" height="28" alt="" />
                          <div>
                            <div class="fw-semibold">{{ d.vendorName || '—' }}</div>
                            @if (d.shopName) { <div class="text-muted">{{ d.shopName }}</div> }
                          </div>
                        </div>
                      </td>
                      <td class="fs-12 text-muted">{{ d.category || '—' }}</td>
                      <td class="fw-semibold fs-13">{{ d.price }} TND</td>
                      <td class="text-center">
                        @if (d.discount > 0) {
                          <span class="badge bg-danger">-{{ d.discount }}%</span>
                        } @else {
                          <span class="text-muted">—</span>
                        }
                      </td>
                      <td class="text-center fs-12">
                        @if (d.quantity > 0) {
                          <span class="badge bg-success-subtle text-success">{{ d.quantity }}</span>
                        } @else {
                          <span class="badge bg-secondary-subtle text-secondary">∞</span>
                        }
                      </td>
                      <td class="text-center">
                        @if (d.isActive) {
                          <span class="badge bg-success-subtle text-success">Actif</span>
                        } @else {
                          <span class="badge bg-warning-subtle text-warning">En attente</span>
                        }
                      </td>
                      <td class="text-end pe-3">
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-light" (click)="openView(d)" title="Aperçu">
                            <i class="ri-eye-line text-muted"></i>
                          </button>
                          <button class="btn btn-light" (click)="goToDetail(d.id)" title="Modifier">
                            <i class="ri-pencil-line text-primary"></i>
                          </button>
                          <button class="btn btn-light" (click)="toggleActive(d)" [title]="d.isActive ? 'Désactiver' : 'Activer'">
                            <i [class]="d.isActive ? 'ri-pause-circle-line text-warning' : 'ri-play-circle-line text-success'"></i>
                          </button>
                          <button class="btn btn-light" (click)="remove(d)" title="Supprimer">
                            <i class="ri-delete-bin-line text-danger"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="d-flex align-items-center justify-content-between px-3 py-3 border-top">
              <div class="d-flex align-items-center gap-2 fs-12 text-muted">
                <select class="form-select form-select-sm" style="width:auto" [(ngModel)]="pageSize" (change)="changePageSize()">
                  <option [ngValue]="10">10</option>
                  <option [ngValue]="20">20</option>
                  <option [ngValue]="50">50</option>
                </select>
                par page
              </div>
              <div class="d-flex align-items-center gap-1">
                <button class="btn btn-light btn-sm" [disabled]="page === 1" (click)="goToPage(page - 1)">
                  <i class="ri-arrow-left-s-line"></i>
                </button>
                @for (p of pageNumbers; track p) {
                  <button class="btn btn-sm" [class.btn-danger]="p === page" [class.btn-light]="p !== page"
                          (click)="goToPage(p)">{{ p }}</button>
                }
                <button class="btn btn-light btn-sm" [disabled]="page === totalPages" (click)="goToPage(page + 1)">
                  <i class="ri-arrow-right-s-line"></i>
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Sidebar -->
    <div class="col-lg-4">
      <div class="d-flex flex-column gap-2">

        <!-- Donut summary -->
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <h6 class="fw-semibold mb-2">Aperçu rapide</h6>
            <div class="d-flex align-items-center gap-3">
              <div class="donut" [style.background]="donutGradient">
                <div class="donut-hole">
                  <div class="fw-bold fs-18">{{ statTotal }}</div>
                  <div class="fs-11 text-muted">Total</div>
                </div>
              </div>
              <div class="flex-grow-1 d-flex flex-column gap-2">
                <div class="d-flex align-items-center justify-content-between fs-12">
                  <span><i class="ri-circle-fill text-success fs-10 me-1"></i>Actifs</span>
                  <span class="fw-semibold">{{ statActive }} ({{ pct(statActive) }}%)</span>
                </div>
                <div class="d-flex align-items-center justify-content-between fs-12">
                  <span><i class="ri-circle-fill text-warning fs-10 me-1"></i>En attente</span>
                  <span class="fw-semibold">{{ statPending }} ({{ pct(statPending) }}%)</span>
                </div>
                <div class="d-flex align-items-center justify-content-between fs-12">
                  <span><i class="ri-circle-fill text-danger fs-10 me-1"></i>Expirés</span>
                  <span class="fw-semibold">0 (0%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top categories -->
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h6 class="fw-semibold mb-0">Top catégories</h6>
              <select class="form-select form-select-sm" style="width:auto" [(ngModel)]="categoryPeriod" (change)="recomputeDashboardStats()">
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
              </select>
            </div>
            <div class="d-flex flex-column gap-2">
              @if (categoryStatsIsFallback) {
                <p class="text-muted fs-11 mb-1 fst-italic">Aucun deal sur cette période — affichage de tous les deals.</p>
              }
              @for (c of categoryStats; track c.name) {
                <div class="category-row">
                  <div class="d-flex align-items-center gap-2">
                    <div class="cat-icon" [style.background]="c.bg">
                      <i [class]="c.icon" [style.color]="c.color"></i>
                    </div>
                    <span class="fw-semibold fs-13">{{ c.name }}</span>
                    <span class="fs-12 text-muted">{{ c.count }} deals</span>
                    <span class="fw-bold fs-13 ms-auto">{{ c.percent }}%</span>
                  </div>
                  <div class="progress mt-1">
                    <div class="progress-bar" [style.width.%]="c.percent" [style.background]="c.gradient"></div>
                  </div>
                </div>
              }
              @if (categoryStats.length === 0) {
                <p class="text-muted fs-12 mb-0">Aucune donnée.</p>
              }
            </div>
          </div>
        </div>

        <!-- Recent activity -->
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <h6 class="fw-semibold mb-2">Activité récente</h6>
            <div class="d-flex flex-column gap-2">
              @for (a of recentActivity; track a.id) {
                <div class="d-flex align-items-start gap-2">
                  <div class="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                       style="width:32px;height:32px">
                    <i [class]="a.icon + ' fs-15'"></i>
                  </div>
                  <div>
                    <div class="fs-12 fw-semibold">{{ a.label }}</div>
                    <div class="fs-12 text-muted">{{ a.title }}</div>
                    <div class="fs-11 text-muted">{{ a.time }}</div>
                  </div>
                </div>
              }
              @if (recentActivity.length === 0) {
                <p class="text-muted fs-12 mb-0">Aucune activité récente.</p>
              }
            </div>
            <a href="javascript:void(0)" (click)="scrollToDealsTable()" class="fs-12 fw-semibold text-danger d-inline-flex align-items-center gap-1 mt-2">
              Voir toute l'activité <i class="ri-arrow-right-line"></i>
            </a>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- ===== Modal : Aperçu (View) ===== -->
  @if (selectedDeal) {
    <div class="modal-backdrop-custom" (click)="closeView()"></div>
    <div class="modal d-block" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Détails du deal</h5>
            <button type="button" class="btn-close" (click)="closeView()"></button>
          </div>
          <div class="modal-body">
            <div class="d-flex align-items-center gap-3 mb-3">
              @if (selectedDeal.image) {
                <img [src]="selectedDeal.image" class="rounded view-thumb" alt="" />
              } @else {
                <div class="rounded bg-danger-subtle text-danger d-flex align-items-center justify-content-center view-thumb-fallback">
                  <i class="ri-flashlight-line fs-24"></i>
                </div>
              }
              <div>
                <h5 class="mb-0 fw-bold">{{ selectedDeal.title }}</h5>
                <span class="fs-12 text-muted">ID #{{ selectedDeal.id }} · {{ formatDate(selectedDeal.date) }}</span>
              </div>
            </div>

            <p class="fs-13 text-muted" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">{{ selectedDeal.description || 'Aucune description.' }}</p>

            <div class="row g-3 fs-13">
              <div class="col-6">
                <span class="text-muted fs-11 text-uppercase d-block">Prix</span>
                <span class="fw-semibold">{{ selectedDeal.price }} TND</span>
              </div>
              <div class="col-6">
                <span class="text-muted fs-11 text-uppercase d-block">Statut</span>
                @if (selectedDeal.isActive) {
                  <span class="badge bg-success-subtle text-success">Actif</span>
                } @else {
                  <span class="badge bg-warning-subtle text-warning">En attente</span>
                }
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light btn-sm" (click)="closeView()">Fermer</button>
            <button type="button" class="btn btn-primary btn-sm" (click)="goToDetail(selectedDeal.id); closeView()">
              <i class="ri-arrow-right-line me-1"></i>Voir tout / Modifier
            </button>
          </div>
        </div>
      </div>
    </div>
  }

</div>
`,
  styles: [`
    .deals-admin { font-family: inherit; }

    .bg-purple-subtle { background-color: rgba(124, 92, 252, .12); }
    .text-purple { color: #7c5cfc; }

    .stat-card { position: relative; }
    .stat-card .spark { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 44px; display: block; }

    .category-row .cat-icon {
      width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 14px;
    }
    .category-row .progress { height: 5px; border-radius: 999px; background-color: #eef0f4; }
    .category-row .progress-bar { border-radius: 999px; }
    .progress { border-radius: 999px; background-color: #eef0f4; }
    .progress-bar { border-radius: 999px; }

    .donut {
      width: 92px; height: 92px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .donut-hole {
      width: 66px; height: 66px; border-radius: 50%; background: #fff;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }

    /* ===== Modales View / Edit ===== */
    .modal-backdrop-custom {
      position: fixed; inset: 0; background: rgba(0, 0, 0, .5); z-index: 1055;
    }
    .modal.d-block { z-index: 1060; }
    .view-thumb { width: 72px; height: 72px; object-fit: cover; flex-shrink: 0; }
    .view-thumb-fallback { width: 72px; height: 72px; flex-shrink: 0; }

    /* ===== Adaptation Dark Mode ===== */
    [data-bs-theme="dark"] {
      .input-group-text.bg-white,
      .bg-white {
        background-color: var(--bs-tertiary-bg) !important;
        border-color: var(--bs-border-color) !important;
        color: var(--bs-body-color);
      }
      .table > thead.table-light,
      .table-light {
        --bs-table-bg: var(--bs-tertiary-bg);
        --bs-table-color: var(--bs-body-color);
        --bs-table-border-color: var(--bs-border-color);
      }
      .btn-light {
        --bs-btn-bg: var(--bs-tertiary-bg);
        --bs-btn-color: var(--bs-body-color);
        --bs-btn-border-color: var(--bs-border-color);
        --bs-btn-hover-bg: var(--bs-secondary-bg);
        --bs-btn-hover-color: var(--bs-emphasis-color);
        --bs-btn-hover-border-color: var(--bs-border-color);
      }
      .category-row .progress,
      .progress {
        background-color: var(--bs-tertiary-bg);
      }
      .donut-hole {
        background: var(--bs-card-bg);
      }
      .modal-content {
        background-color: var(--bs-card-bg);
        color: var(--bs-body-color);
        border-color: var(--bs-border-color);
      }
      .form-control,
      .form-select,
      textarea.form-control {
        background-color: var(--bs-tertiary-bg);
        border-color: var(--bs-border-color);
        color: var(--bs-body-color);
      }
      .form-control::placeholder {
        color: var(--bs-secondary-color);
      }
    }
  `],
})
export class DealsAdminComponent implements OnInit {
  items: DealRow[] = [];
  search = '';
  filter = '';
  loading = true;
  categoryPeriod: 'week' | 'month' = 'week';

  // Pagination + compteurs pilotés par le backend (réponse paginate() Laravel)
  page       = 1;
  pageSize   = 10;
  totalItems = 0;
  totalPages = 1;
  statTotal   = 0;
  statActive  = 0;
  statPending = 0;
  private searchDebounce: any = null;

  // IdCateg -> nom de catégorie, chargé une fois depuis /categories
  private categoryNames: Record<number, string> = {};

  // ===== Aperçu rapide =====
  selectedDeal: DealRow | null = null;

  private categoryStyles: { match: string[]; color: string; bg: string; icon: string; gradient: string }[] = [
    { match: ['électronique', 'electronique', 'electronics'], color: '#7c5cfc', bg: 'rgba(124, 92, 252, .12)', icon: 'ri-cpu-line', gradient: 'linear-gradient(90deg, #7c5cfc, #299cdb)' },
    { match: ['maison', 'déco', 'deco', 'maison & déco', 'home'], color: '#0ab39c', bg: 'rgba(10, 179, 156, .12)', icon: 'ri-home-4-line', gradient: 'linear-gradient(90deg, #0ab39c, #299cdb)' },
    { match: ['beauté', 'beaute', 'beauty'], color: '#f672a7', bg: 'rgba(246, 114, 167, .12)', icon: 'ri-sparkling-2-line', gradient: 'linear-gradient(90deg, #f672a7, #7c5cfc)' },
    { match: ['mode', 'vêtements', 'vetements', 'fashion'], color: '#f7b84b', bg: 'rgba(247, 184, 75, .12)', icon: 'ri-shirt-line', gradient: 'linear-gradient(90deg, #f7b84b, #f672a7)' },
    { match: ['alimentation', 'food', 'épicerie', 'epicerie'], color: '#299cdb', bg: 'rgba(41, 156, 219, .12)', icon: 'ri-restaurant-line', gradient: 'linear-gradient(90deg, #299cdb, #0ab39c)' },
  ];
  private fallbackStyles = [
    { color: '#7c5cfc', bg: 'rgba(124, 92, 252, .12)', icon: 'ri-price-tag-3-line', gradient: 'linear-gradient(90deg, #7c5cfc, #299cdb)' },
    { color: '#0ab39c', bg: 'rgba(10, 179, 156, .12)', icon: 'ri-shopping-bag-3-line', gradient: 'linear-gradient(90deg, #0ab39c, #299cdb)' },
    { color: '#f7b84b', bg: 'rgba(247, 184, 75, .12)', icon: 'ri-star-line', gradient: 'linear-gradient(90deg, #f7b84b, #f672a7)' },
  ];

  private styleFor(category: string, fallbackIndex: number) {
    const key = (category || '').trim().toLowerCase();
    const found = this.categoryStyles.find(s => s.match.some(m => key.includes(m)));
    if (found) return found;
    return this.fallbackStyles[fallbackIndex % this.fallbackStyles.length];
  }

 
  get avgDiscount(): number {
    const arr = this.items.filter(d => d.discount > 0);
    return arr.length ? arr.reduce((s, d) => s + d.discount, 0) / arr.length : 0;
  }

  get pageNumbers(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  get donutGradient(): string {
    const total = this.statTotal || 1;
    const activePct = (this.statActive / total) * 100;
    return `conic-gradient(#0ab39c 0% ${activePct}%, #f7b84b ${activePct}% 100%)`;
  }

  categoryStatsIsFallback = false;
  categoryStats: CategoryStat[] = [];
  recentActivity: { id: number; label: string; title: string; time: string; icon: string }[] = [];


  recomputeDashboardStats(): void {

    const now = new Date();
    const cutoff = new Date(now);
    if (this.categoryPeriod === 'week') {
      cutoff.setDate(now.getDate() - 7);
    } else {
      cutoff.setMonth(now.getMonth() - 1);
    }
    let filtered = this.items.filter(d => d.date && new Date(d.date) >= cutoff);

    this.categoryStatsIsFallback = filtered.length === 0 && this.items.length > 0;
    if (this.categoryStatsIsFallback) filtered = this.items;
    const map = new Map<string, number>();
    filtered.forEach(d => {
      const key = d.category || 'Autre';
      map.set(key, (map.get(key) || 0) + 1);
    });
    const total = filtered.length || 1;
    this.categoryStats = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count], i) => {
        const style = this.styleFor(name, i);
        return {
          name,
          count,
          percent: Math.round((count / total) * 100),
          color: style.color,
          bg: style.bg,
          icon: style.icon,
          gradient: style.gradient,
        };
      });

    this.recentActivity = [...this.items]
      .filter(d => d.date)
      .sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime())
      .slice(0, 2)
      .map((d, i) => ({
        id: d.id,
        label: i === 0 ? 'Nouveau deal ajouté' : 'Deal mis à jour',
        title: d.title,
        time: this.timeAgo(d.date),
        icon: i === 0 ? 'ri-add-circle-line' : 'ri-refresh-line',
      }));
  }

  constructor(private api: TijaraApiService, private categories: CategoriesService, private deals: DealsService, private router: Router) {}


  scrollToDealsTable(): void {
    document.getElementById('deals-table-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngOnInit(): void {
    this.categories.getCategories({ per_page: 200 }).subscribe({
      next: (res: any) => {
        (res?.data || res || []).forEach((c: any) => {
          this.categoryNames[c.IdCateg] = c.TitleFr || c.TitleEn || '';
        });
        this.load();
      },
      error: () => this.load(),
    });
    this.loadStats();
  }

  private buildParams(): any {

    const params: any = { page: this.page, per_page: this.pageSize };
    if (this.search.trim()) params.search = this.search.trim();
    if (this.filter === 'active')  params.active = 1;
    if (this.filter === 'pending') params.active = 0;
    return params;
  }

  private mapRow(d: any): DealRow {
    const name = d.ownerdeals || '—';
    return {
      id:           d.IdDeal,
      title:         d.titleDeal       ?? '—',
      description:   d.descriptionDeal ?? '',
      price:         String(d.priceDeal ?? '0'),
      discount:     +(String(d.discountDeal ?? '0').replace('%', '')) || 0,
      image:         d.imageDeal ?? '',
      category:      this.categoryNames[d.idCateg] || '',
      vendorName:    name,
      shopName:      '',
      vendorAvatar:  `https://i.pravatar.cc/64?u=${d.IdDeal}`,
      isActive:     !!d.active,
      date:          d.datePublication ?? null,
      quantity:     +(d.quantity ?? 0),
    };
  }

  load(): void {
    this.loading = true;
    this.deals.getAdminDeals(this.buildParams()).subscribe({
      next: (res: any) => {
        this.items      = (res?.data || []).map((d: any) => this.mapRow(d));
        this.totalItems = res?.total        ?? this.items.length;
        this.totalPages = res?.last_page    ?? 1;
        this.page       = res?.current_page ?? this.page;
        this.recomputeDashboardStats();
        this.loading = false;
      },
      error: () => { this.loading = false; alert('Chargement impossible.'); }
    });
  }

  // Requêtes légères (per_page=1) : on ne lit que "total" renvoyé par Laravel.
  loadStats(): void {
    this.deals.getAdminDeals({ per_page: 1 }).subscribe((res: any) => this.statTotal = res?.total ?? 0);
    this.deals.getAdminDeals({ per_page: 1, active: 1 }).subscribe((res: any) => this.statActive = res?.total ?? 0);
    this.deals.getAdminDeals({ per_page: 1, active: 0 }).subscribe((res: any) => this.statPending = res?.total ?? 0);
  }

  onSearchChange(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.page = 1; this.load(); }, 400);
  }

  setFilter(f: string): void { this.filter = f; this.page = 1; this.load(); }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.load();
  }
  changePageSize(): void { this.page = 1; this.load(); }

  pct(n: number): number {
    return this.statTotal ? Math.round((n / this.statTotal) * 100) : 0;
  }

  
  toggleActive(d: DealRow): void {
    this.deals.activateDeal(d.id, !d.isActive).subscribe({
      next: () => { d.isActive = !d.isActive; this.loadStats(); },
      error: () => alert('Action impossible. Réessayez.'),
    });
  }

  remove(d: DealRow): void {
    if (!confirm(`Supprimer le deal "${d.title}" ?`)) return;
    this.deals.deleteDealAdmin(d.id).subscribe({
      next: () => { this.load(); this.loadStats(); },
      error: () => alert('Suppression impossible. Réessayez.'),
    });
  }

  // ===== View modal =====
  openView(d: DealRow): void {
    this.selectedDeal = d;
  }
  closeView(): void {
    this.selectedDeal = null;
  }

  // ===== Modifier : navigation vers la page dédiée =====
  goToDetail(id: number): void {
    this.router.navigate(['/admin/deal-detail', id]);
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  timeAgo(d: string | null): string {
    if (!d) return '—';
    const dt = new Date(d).getTime();
    if (isNaN(dt)) return '—';
    const diffMs = Date.now() - dt;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours < 1) return "à l'instant";
    if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  }
}