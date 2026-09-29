import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { CategoriesService } from 'src/app/core/services/categories.service';
import { UsersVendorsService } from 'src/app/core/services/users-vendors.service';
import { ProductsService } from 'src/app/core/services/products.service';
import { CategoryStyleService } from 'src/app/core/services/category-style.service';

interface ProductRow {
  id:         number;
  name:       string;
  price:      string;
  image:      string;
  category:   string;
  categoryColor: string;
  vendorName: string;
  vendorId:   number | null;
  shopName:   string;
  stock:      number;
  isActive:   boolean;
  likeCount:  number;
  selected:   boolean;
}

@Component({
  selector:   'app-products-admin',
  standalone: false,
  template: `
<!-- ── Breadcrumb ── -->
<nav class="d-flex align-items-center gap-1 fs-12 text-muted mb-2">
  <span>Admin</span><i class="ri-arrow-right-s-line"></i>
  <span>Marketplace</span><i class="ri-arrow-right-s-line"></i>
  <span class="text-dark fw-semibold">Produits</span>
</nav>

<!-- ── Header (hero) ── -->
<div class="prod-hero mb-4">
  <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
    <div>
      <div class="d-flex align-items-center gap-2 mb-2">
        <span class="badge rounded-pill px-3 py-1 fs-11 fw-semibold"
              style="background:#e8faf7;color:#0ab39c;border:1px solid #b2eeea">
          ● CATALOGUE EN DIRECT
        </span>
        <span class="fs-12 text-muted">Mise à jour {{ lastUpdate }}</span>
      </div>
      <h2 class="fw-bold mb-2 prod-hero-title">
        Produits <span class="prod-hero-accent">du catalogue</span>
      </h2>
      <p class="text-muted fs-13 mb-0" style="max-width:460px">
        Modérez les produits publiés par vos vendeurs, suivez les stocks et gardez la qualité
        de votre catalogue <span class="prod-hero-highlight">au top</span>.
      </p>
    </div>

    <div class="d-flex align-items-center gap-4">
      <div class="d-flex gap-2 align-items-center">
        <button class="btn btn-light btn-sm rounded-pill px-3 d-flex align-items-center gap-2"
                (click)="exportCsv()">
          <i class="ri-download-2-line"></i> Exporter
        </button>
        <button class="btn btn-sm rounded-pill px-3 d-flex align-items-center gap-2 text-white fw-semibold"
                style="background:linear-gradient(135deg,#405189,#0ab39c)">
          <i class="ri-add-line"></i> Ajouter un produit <i class="ri-arrow-right-line"></i>
        </button>
      </div>

      <div class="prod-hero-illustration d-none d-lg-block">
        <svg viewBox="0 0 140 120" width="104" height="90">
          <defs>
            <linearGradient id="prodHeroGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#a8ece0"/>
              <stop offset="100%" stop-color="#0ab39c"/>
            </linearGradient>
          </defs>
          <g opacity="0.5">
            <circle cx="18" cy="20" r="3" fill="#f7b84b"/>
            <circle cx="120" cy="16" r="2.5" fill="#405189"/>
            <circle cx="16" cy="92" r="2" fill="#f06595"/>
            <path d="M124 88 l3 3 l-3 3 l-3 -3 Z" fill="#0ab39c"/>
          </g>
          <rect x="35" y="35" width="34" height="34" rx="8" fill="url(#prodHeroGrad)" opacity="0.85"/>
          <rect x="73" y="35" width="34" height="34" rx="8" fill="url(#prodHeroGrad)" opacity="0.55"/>
          <rect x="35" y="73" width="34" height="34" rx="8" fill="url(#prodHeroGrad)" opacity="0.55"/>
          <rect x="73" y="73" width="34" height="34" rx="8" fill="url(#prodHeroGrad)" opacity="0.85"/>
          <path d="M46 52 l6 6 12 -12" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  </div>
</div>

<!-- ── KPI Cards ── -->
<div class="row g-3 mb-4">
  <!-- Total produits -->
  <div class="col-6 col-xl-3">
    <div class="card border-0 h-100" style="border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,.06)">
      <div class="card-body p-3">
        <div class="d-flex align-items-start justify-content-between mb-3">
          <div class="rounded-3 d-flex align-items-center justify-content-center"
               style="width:40px;height:40px;background:#f0f0f8">
            <i class="ri-box-3-line" style="color:#9b8ecf;font-size:20px"></i>
          </div>
          <span class="badge rounded-pill fs-10 fw-semibold"
                style="background:#edfbf8;color:#0ab39c">» +{{ newThisWeek }} cette semaine</span>
        </div>
        <div class="fs-11 text-uppercase text-muted fw-semibold ls-1 mb-1">TOTAL PRODUITS</div>
        <div class="fw-bold mb-1" style="font-size:2rem;line-height:1">{{ statTotal }}</div>
        <div class="fs-11 text-muted">catalogue actif</div>
        <div class="mt-2" style="height:40px">
          <svg viewBox="0 0 120 40" preserveAspectRatio="none" width="100%" height="100%">
            <polyline [attr.points]="sparkPoints(sparkTotal)" fill="none" stroke="#c3b9f0" stroke-width="2"/>
          </svg>
        </div>
      </div>
    </div>
  </div>

  <!-- Produits publiés -->
  <div class="col-6 col-xl-3">
    <div class="card border-0 h-100" style="border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,.06)">
      <div class="card-body p-3">
        <div class="d-flex align-items-start justify-content-between mb-3">
          <div class="rounded-3 d-flex align-items-center justify-content-center"
               style="width:40px;height:40px;background:#edfbf8">
            <i class="ri-checkbox-circle-line" style="color:#0ab39c;font-size:20px"></i>
          </div>
          <span class="badge rounded-pill fs-10 fw-semibold"
                style="background:#edfbf8;color:#0ab39c">» {{ publishRate }}%</span>
        </div>
        <div class="fs-11 text-uppercase text-muted fw-semibold ls-1 mb-1">PRODUITS PUBLIÉS</div>
        <div class="fw-bold mb-1" style="font-size:2rem;line-height:1">{{ statApproved }}</div>
        <div class="fs-11 text-muted">taux de publication</div>
        <div class="mt-2" style="height:40px">
          <svg viewBox="0 0 120 40" preserveAspectRatio="none" width="100%" height="100%">
            <polyline [attr.points]="sparkPoints(sparkApproved)" fill="none" stroke="#0ab39c" stroke-width="2"/>
          </svg>
        </div>
      </div>
    </div>
  </div>

  <!-- À valider -->
  <div class="col-6 col-xl-3">
    <div class="card border-0 h-100" style="border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,.06)">
      <div class="card-body p-3">
        <div class="d-flex align-items-start justify-content-between mb-3">
          <div class="rounded-3 d-flex align-items-center justify-content-center"
               style="width:40px;height:40px;background:#fff8e7">
            <i class="ri-time-line" style="color:#f7b84b;font-size:20px"></i>
          </div>
          <span class="badge rounded-pill fs-10 fw-semibold"
                style="background:#fff8e7;color:#f7b84b">
            {{ statPending === 0 ? '» Tout clair' : '» ' + statPending + ' en attente' }}
          </span>
        </div>
        <div class="fs-11 text-uppercase text-muted fw-semibold ls-1 mb-1">À VALIDER</div>
        <div class="fw-bold mb-1" style="font-size:2rem;line-height:1">{{ statPending }}</div>
        <div class="fs-11 text-muted">{{ statPending === 0 ? 'aucune en attente' : 'en attente de validation' }}</div>
        <div class="mt-2" style="height:40px">
          <svg viewBox="0 0 120 40" preserveAspectRatio="none" width="100%" height="100%">
            <polyline [attr.points]="sparkPoints(sparkPending)" fill="none" stroke="#f7b84b" stroke-width="2"/>
          </svg>
        </div>
      </div>
    </div>
  </div>

  <!-- Valeur du stock -->
  <div class="col-6 col-xl-3">
    <div class="card border-0 h-100" style="border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,.06)">
      <div class="card-body p-3">
        <div class="d-flex align-items-start justify-content-between mb-3">
          <div class="rounded-3 d-flex align-items-center justify-content-center"
               style="width:40px;height:40px;background:#edfbf8">
            <i class="ri-money-dollar-circle-line" style="color:#0ab39c;font-size:20px"></i>
          </div>
          <span class="badge rounded-pill fs-10 fw-semibold"
                style="background:#edfbf8;color:#0ab39c">» TND</span>
        </div>
        <div class="fs-11 text-uppercase text-muted fw-semibold ls-1 mb-1">VALEUR DU STOCK</div>
        <div class="fw-bold mb-1" style="font-size:2rem;line-height:1">{{ stockValueFormatted }}</div>
        <div class="fs-11 text-muted">{{ totalStock }} unités</div>
        <div class="mt-2" style="height:40px">
          <svg viewBox="0 0 120 40" preserveAspectRatio="none" width="100%" height="100%">
            <polyline [attr.points]="sparkPoints(sparkValue)" fill="none" stroke="#0ab39c" stroke-width="2"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ── Table ── -->
<div class="card border-0" style="border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,.06)">
  <div class="card-body p-4">

    <!-- Header table -->
    <div class="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-3">
      <div>
        <div class="d-flex align-items-center gap-2">
          <h5 class="mb-0 fw-bold">Modération des produits</h5>
          <span class="badge rounded-pill fs-11 fw-semibold"
                style="background:#f0f0f8;color:#405189">{{ totalItems }}</span>
        </div>
        <p class="text-muted fs-12 mb-0">Vérifiez, approuvez ou rejetez les produits soumis par vos vendeurs</p>
      </div>
      <div class="d-flex align-items-center gap-2 flex-wrap">
        <!-- Recherche -->
        <div class="d-flex align-items-center gap-2 px-3 py-2 rounded-pill"
             style="background:#f8f9fc;border:1px solid #eef0f5">
          <i class="ri-search-line text-muted fs-14"></i>
          <input type="text" class="border-0 bg-transparent fs-13 outline-none"
                 placeholder="Nom, vendeur, catégorie..."
                 style="width:180px;outline:none"
                 [(ngModel)]="search" (input)="applyFilter()" />
        </div>
        <!-- Filtres -->
        <div class="d-flex gap-1">
          <button class="btn btn-sm rounded-pill px-3 fs-12 fw-semibold"
                  [style.background]="filter==='' ? '#405189' : '#f8f9fc'"
                  [style.color]="filter==='' ? '#fff' : '#5b616e'"
                  (click)="setFilter('')">
            Tous <span class="ms-1 opacity-75">{{ statTotal }}</span>
          </button>
          <button class="btn btn-sm rounded-pill px-3 fs-12 fw-semibold"
                  [style.background]="filter==='pending' ? '#f7b84b' : '#f8f9fc'"
                  [style.color]="filter==='pending' ? '#fff' : '#5b616e'"
                  (click)="setFilter('pending')">
            En attente <span class="ms-1 opacity-75">{{ statPending }}</span>
          </button>
          <button class="btn btn-sm rounded-pill px-3 fs-12 fw-semibold"
                  [style.background]="filter==='approved' ? '#0ab39c' : '#f8f9fc'"
                  [style.color]="filter==='approved' ? '#fff' : '#5b616e'"
                  (click)="setFilter('approved')">
            Approuvés <span class="ms-1 opacity-75">{{ statApproved }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border" style="color:#0ab39c"></div>
      <p class="text-muted mt-2 fs-13">Chargement du catalogue...</p>
    </div>

    <!-- Empty -->
    <div *ngIf="!loading && items.length === 0" class="text-center py-5">
      <i class="ri-box-3-line" style="font-size:3rem;color:#ccc"></i>
      <p class="text-muted mt-2 mb-0 fs-13">Aucun produit ne correspond.</p>
    </div>

    <!-- Table -->
    <div *ngIf="!loading && items.length > 0" class="table-responsive">
      <table class="table align-middle mb-0" style="border-collapse:separate;border-spacing:0 4px">
        <thead>
          <tr style="background:#f8f9fc">
            <th class="ps-3 py-3 border-0" style="width:40px">
              <input type="checkbox" class="form-check-input"
                     (change)="toggleAll($event)" [checked]="allSelected" />
            </th>
            <th class="py-3 border-0 fs-11 text-uppercase fw-semibold text-muted" style="min-width:200px">
              Produit <i class="ri-arrow-up-down-line ms-1 opacity-50"></i>
            </th>
            <th class="py-3 border-0 fs-11 text-uppercase fw-semibold text-muted">
              Vendeur <i class="ri-arrow-up-down-line ms-1 opacity-50"></i>
            </th>
            <th class="py-3 border-0 fs-11 text-uppercase fw-semibold text-muted">
              Catégorie <i class="ri-arrow-up-down-line ms-1 opacity-50"></i>
            </th>
            <th class="py-3 border-0 fs-11 text-uppercase fw-semibold text-muted">
              Stock <i class="ri-arrow-up-down-line ms-1 opacity-50"></i>
            </th>
            <th class="py-3 border-0 fs-11 text-uppercase fw-semibold text-muted">
              Prix <i class="ri-arrow-up-down-line ms-1 opacity-50"></i>
            </th>
            <th class="py-3 border-0 fs-11 text-uppercase fw-semibold text-muted">
              Statut <i class="ri-arrow-up-down-line ms-1 opacity-50"></i>
            </th>
            <th class="py-3 pe-3 border-0 fs-11 text-uppercase fw-semibold text-muted text-end">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of items" class="prod-row"
              style="background:#fff;border-radius:12px">
            <!-- Checkbox -->
            <td class="ps-3 py-3 border-0">
              <input type="checkbox" class="form-check-input"
                     [(ngModel)]="p.selected" />
            </td>
            <!-- Produit -->
            <td class="py-3 border-0">
              <div class="d-flex align-items-center gap-3">
                <!-- Icône placeholder avec couleur selon catégorie -->
                <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                     [style.background]="getCategoryBg(p.category)"
                     style="width:44px;height:44px">
                  <i [class]="getCategoryIcon(p.category)"
                     [style.color]="getCategoryColor(p.category)"
                     style="font-size:20px"></i>
                </div>
                <div>
                  <div class="fw-semibold fs-13 text-dark text-truncate" style="max-width:200px">{{ p.name }}</div>
                  <div class="fs-11 text-muted d-flex align-items-center gap-2">
                    <span>ID #{{ p.id }}</span>
                    <span class="d-flex align-items-center gap-1" title="Likes">
                      <i class="ri-heart-3-fill text-danger" style="font-size:10px"></i>{{ p.likeCount }}
                    </span>
                  </div>
                </div>
              </div>
            </td>
            <!-- Vendeur -->
            <td class="py-3 border-0">
              <div class="d-flex align-items-center gap-2" [class.prod-vendor-clickable]="p.vendorId" (click)="goToVendor(p, $event)">
                <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold fs-11 flex-shrink-0 text-white"
                     [style.background]="getVendorColor(p.vendorName)"
                     style="width:30px;height:30px">
                  {{ getInitials(p.vendorName) }}
                </div>
                <div>
                  <div class="fw-semibold fs-13 prod-vendor-name">{{ p.vendorName || '—' }}</div>
                  <div *ngIf="p.shopName" class="fs-11 text-muted">
                    <i class="ri-store-2-line me-1"></i>{{ p.shopName }}
                  </div>
                </div>
              </div>
            </td>
            <!-- Catégorie -->
            <td class="py-3 border-0">
              <span class="badge rounded-pill px-2 py-1 fs-11 fw-semibold"
                    [style.background]="getCategoryBg(p.category)"
                    [style.color]="getCategoryColor(p.category)">
                {{ p.category || '—' }}
              </span>
            </td>
            <!-- Stock -->
            <td class="py-3 border-0">
              <span class="fs-13 fw-semibold" [class.text-danger]="p.stock < 5">
                <span *ngIf="p.stock < 5" class="text-danger me-1">●</span>{{ p.stock }}
              </span>
            </td>
            <!-- Prix -->
            <td class="py-3 border-0">
              <span class="fw-bold fs-13">{{ p.price }} TND</span>
            </td>
            <!-- Statut -->
            <td class="py-3 border-0">
              <span *ngIf="p.isActive"
                    class="badge rounded-pill px-3 py-1 fs-11 fw-semibold d-flex align-items-center gap-1"
                    style="background:#edfbf8;color:#0ab39c;width:fit-content">
                <i class="ri-shield-check-line"></i> Approuvé
              </span>
              <span *ngIf="!p.isActive"
                    class="badge rounded-pill px-3 py-1 fs-11 fw-semibold d-flex align-items-center gap-1"
                    style="background:#fff8e7;color:#f7b84b;width:fit-content">
                <i class="ri-time-line"></i> En attente
              </span>
            </td>
            <!-- Actions -->
            <td class="py-3 pe-3 border-0 text-end">
              <div class="d-flex align-items-center justify-content-end gap-1">
                <button class="action-btn" title="Voir" style="color:#9298a8" (click)="viewProduct(p)">
                  <i class="ri-eye-line"></i>
                </button>
                <button class="action-btn" title="Modifier" style="color:#405189" (click)="goToDetail(p.id)">
                  <i class="ri-pencil-line"></i>
                </button>
                <button *ngIf="!p.isActive"
                        class="action-btn text-success" title="Approuver"
                        (click)="approve(p)">
                  <i class="ri-check-line"></i>
                </button>
                <button class="action-btn text-danger" title="Supprimer"
                        (click)="reject(p)">
                  <i class="ri-close-line"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div *ngIf="totalPages > 1"
           class="d-flex align-items-center justify-content-between pt-3 mt-2"
           style="border-top:1px solid #f5f6f9">
        <div class="fs-12 text-muted">
        Affichage {{ (currentPage-1)*pageSize+1 }}–{{ currentPage*pageSize > totalItems ? totalItems : currentPage*pageSize }} sur {{ totalItems }}
        </div>
        <div class="d-flex gap-1">
          <button class="page-btn" [disabled]="currentPage===1" (click)="goPage(currentPage-1)">
            <i class="ri-arrow-left-s-line"></i>
          </button>
          <button *ngFor="let p of pageRange()" class="page-btn"
                  [class.page-active]="p===currentPage" (click)="goPage(p)">{{ p }}</button>
          <button class="page-btn" [disabled]="currentPage===totalPages" (click)="goPage(currentPage+1)">
            <i class="ri-arrow-right-s-line"></i>
          </button>
        </div>
      </div>
    </div>

  </div>
</div>

<!-- ═════════════════ MODALE : VOIR LE PRODUIT ═════════════════ -->
<div *ngIf="showViewModal && selectedProduct" class="tj-modal-backdrop" (click)="closeViewModal()">
  <div class="tj-modal" (click)="$event.stopPropagation()">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h5 class="fw-bold mb-0">Détails du produit</h5>
      <button class="tj-modal-close" (click)="closeViewModal()"><i class="ri-close-line"></i></button>
    </div>

    <div class="d-flex align-items-center gap-3 mb-4">
      <div class="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
           [style.background]="getCategoryBg(selectedProduct.category)"
           style="width:56px;height:56px">
        <i [class]="getCategoryIcon(selectedProduct.category)"
           [style.color]="getCategoryColor(selectedProduct.category)"
           style="font-size:26px"></i>
      </div>
      <div>
        <div class="fw-bold fs-16">{{ selectedProduct.name }}</div>
        <div class="fs-12 text-muted">ID #{{ selectedProduct.id }}</div>
      </div>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-6">
        <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Prix</div>
        <div class="fw-bold fs-14">{{ selectedProduct.price }} TND</div>
      </div>
      <div class="col-6">
        <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Statut</div>
        <span *ngIf="selectedProduct.isActive" class="badge rounded-pill px-2 py-1 fs-11" style="background:#edfbf8;color:#0ab39c">Approuvé</span>
        <span *ngIf="!selectedProduct.isActive" class="badge rounded-pill px-2 py-1 fs-11" style="background:#fff8e7;color:#f7b84b">En attente</span>
      </div>
    </div>

    <div class="d-flex justify-content-end gap-2 mt-4">
      <button class="btn btn-light btn-sm rounded-pill px-3" (click)="closeViewModal()">Fermer</button>
      <button class="btn btn-sm rounded-pill px-3 text-white fw-semibold"
              style="background:#405189"
              (click)="goToDetail(selectedProduct.id); closeViewModal()">
        <i class="ri-arrow-right-line me-1"></i>Voir tout / Modifier
      </button>
    </div>
  </div>
</div>
`,
  styles: [`
    /* ═════ Hero ═════ */
    .prod-vendor-clickable { cursor: pointer; }
    .prod-vendor-clickable:hover .prod-vendor-name { color: #405189; text-decoration: underline; }
    .prod-hero {
      padding: 28px 32px;
      background: linear-gradient(135deg, #f4fdfb 0%, #ffffff 55%, #f0faf7 100%);
      border-radius: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .prod-hero-title { font-size: 2rem; margin: 0; }
    .prod-hero-accent {
      background: linear-gradient(135deg, #0ab39c, #405189);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .prod-hero-highlight { color: #0ab39c; font-weight: 700; }
    .prod-hero-illustration { display: flex; align-items: center; justify-content: center; }

    .prod-row { transition: box-shadow .15s, transform .15s; }
    .prod-row:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); transform: translateY(-1px); }
    .action-btn {
      width:32px;height:32px;border-radius:8px;border:1px solid #eef0f5;
      background:#fff;display:flex;align-items:center;justify-content:center;
      font-size:15px;transition:.15s;cursor:pointer;
    }
    .action-btn:hover { background:#f2effe;border-color:#e0d9fc; }
    .page-btn {
      width:30px;height:30px;border-radius:8px;border:1px solid #eef0f5;
      background:#fff;font-size:12px;font-weight:600;color:#5b616e;
      display:flex;align-items:center;justify-content:center;transition:.15s;cursor:pointer;
    }
    .page-btn:hover:not(:disabled) { background:#f2effe;color:#6c5ce7; }
    .page-btn:disabled { opacity:.4;cursor:default; }
    .page-active { background:#405189 !important;border-color:#405189 !important;color:#fff !important; }
    .outline-none:focus { outline:none !important;box-shadow:none !important; }

    /* ═════ Modales ═════ */
    .tj-modal-backdrop {
      position: fixed; inset: 0; background: rgba(20,22,30,.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 1050; padding: 16px;
    }
    .tj-modal {
      background: #fff; border-radius: 16px; padding: 24px;
      width: 100%; max-width: 460px; max-height: 90vh; overflow-y: auto;
      box-shadow: 0 12px 40px rgba(0,0,0,.2);
    }
    .tj-modal-close {
      width: 28px; height: 28px; border-radius: 8px; border: none;
      background: #f2f2f7; color: #5b616e; display: flex;
      align-items: center; justify-content: center; cursor: pointer;
    }
    .tj-modal-close:hover { background: #e6e6ee; }

    /* ═════════════════════════════════════════════════
       Adaptation Dark Mode (préserve le même design)
       ═════════════════════════════════════════════════ */
    :host-context([data-bs-theme="dark"]) {
      .text-dark { color: var(--bs-body-color, #e9ecef) !important; }

      .prod-hero {
        background: linear-gradient(135deg, var(--bs-tertiary-bg, #23262b) 0%, var(--bs-body-bg, #1a1d21) 55%, var(--bs-tertiary-bg, #23262b) 100%);
        box-shadow: 0 1px 3px rgba(0, 0, 0, .3);
      }

      .btn-light {
        --bs-btn-bg: var(--bs-tertiary-bg, #23262b);
        --bs-btn-color: var(--bs-body-color, #e9ecef);
        --bs-btn-border-color: var(--bs-border-color, #32363d);
        --bs-btn-hover-bg: var(--bs-secondary-bg, #2a2e35);
        --bs-btn-hover-color: var(--bs-emphasis-color, #f4f5f7);
        --bs-btn-hover-border-color: var(--bs-border-color, #32363d);
      }

      /* fonds pastel codés en dur (icônes KPI, badges, statuts) */
      [style*="#f0f0f8"] { background: var(--bs-tertiary-bg, #23262b) !important; }
      [style*="#edfbf8"] { background: rgba(10, 179, 156, .18) !important; }
      [style*="#fff8e7"] { background: rgba(247, 184, 75, .18) !important; }

      /* barre de recherche, en-tête du tableau, filtre inactif */
      [style*="#f8f9fc"] {
        background: var(--bs-tertiary-bg, #23262b) !important;
        border-color: var(--bs-border-color, #32363d) !important;
      }
      [style*="#eef0f5"] { border-color: var(--bs-border-color, #32363d) !important; }
      [style*="#f5f6f9"] { border-color: var(--bs-border-color, #32363d) !important; }

      /* lignes du tableau produits */
      .prod-row { background: var(--bs-card-bg, #1e2126) !important; }
      .prod-row:hover { box-shadow: 0 4px 16px rgba(0, 0, 0, .4); }

      .action-btn {
        background: var(--bs-tertiary-bg, #23262b);
        border-color: var(--bs-border-color, #32363d);
        color: var(--bs-body-color, #e9ecef);
      }
      .action-btn:hover { background: rgba(64, 81, 137, .2); border-color: rgba(64, 81, 137, .4); }

      .page-btn {
        background: var(--bs-tertiary-bg, #23262b);
        border-color: var(--bs-border-color, #32363d);
        color: var(--bs-secondary-color, #9299a8);
      }
      .page-btn:hover:not(:disabled) { background: rgba(108, 92, 231, .2); color: #a89cf5; }
      .page-btn:disabled { opacity: .35; }

      .tj-modal { background: var(--bs-card-bg, #1e2126); color: var(--bs-body-color, #e9ecef); }
      .tj-modal-close { background: var(--bs-tertiary-bg, #23262b); color: var(--bs-body-color, #e9ecef); }
      .tj-modal-close:hover { background: var(--bs-secondary-bg, #2a2e35); }
    }
  `]
})
export class ProductsAdminComponent implements OnInit {

  items:   ProductRow[] = [];
  search = '';
  filter = '';
  loading = true;
  lastUpdate = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });

  
  pageSize    = 8;
  currentPage = 1;
  totalItems  = 0;
  totalPages  = 1;
  statTotal    = 0;
  statApproved = 0;
  statPending  = 0;
  private searchDebounce: any = null;


  sparkTotal:    number[] = [];
  sparkApproved: number[] = [];
  sparkPending:  number[] = [];
  sparkValue:    number[] = [];


  showViewModal   = false;
  selectedProduct: ProductRow | null = null;

  get publishRate(): number {
    return this.statTotal ? Math.round((this.statApproved / this.statTotal) * 100) : 0;
  }
  get newThisWeek(): number { return Math.max(1, Math.floor(this.statTotal * 0.15)); }
 
  get totalStock():  number { return this.items.reduce((a, p) => a + (p.stock || 0), 0); }
  get stockValueFormatted(): string {
    const v = this.items.filter(p => p.isActive)
                        .reduce((a, p) => a + (+p.price || 0) * (p.stock || 0), 0);
    if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
    return v.toFixed(0);
  }
  get allSelected(): boolean { return this.items.length > 0 && this.items.every(p => p.selected); }

  
  private categoryNames: Record<number, string> = {};
  private vendorNames:   Record<number, string> = {};


  private firstImageUrl(raw: string, id: number): string {
    if (raw) {
      let filename = raw;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) filename = parsed[0];
      } catch { /* pas du JSON, déjà une simple chaîne */ }
      if (filename && filename.includes('assets/')) {
        return `${this.products.assetBaseUrl}/${filename.replace(/^\/+/, '')}`;
      }
    }
    return `${this.products.assetBaseUrl}/assets/products/images/product_${id}.jpg`;
  }

  constructor(private api: TijaraApiService, private categories: CategoriesService, private usersVendors: UsersVendorsService, private products: ProductsService, private router: Router, private catStyle: CategoryStyleService) {}

  goToVendor(p: ProductRow, ev?: Event): void {
    ev?.stopPropagation();
    if (!p.vendorId) return;
    this.router.navigate(['/admin/vendor-detail', p.vendorId]);
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
    this.usersVendors.getAdminAllUsers({ per_page: 200 }).subscribe({
      next: (res: any) => {
        (res?.data || []).forEach((u: any) => {
          this.vendorNames[u.IdUser] = `${u.FirstName || ''} ${u.LastName || ''}`.trim() || u.Username || '';
        });
      },
    });
    this.loadStats();
  }

  private buildParams(): any {
    const params: any = { page: this.currentPage, per_page: this.pageSize };
    if (this.search.trim()) params.search = this.search.trim();
    if (this.filter === 'approved') params.Active = 1;
    if (this.filter === 'pending')  params.Active = 0;
    return params;
  }

  private mapRow(p: any): ProductRow {
    const rawCat = this.categoryNames[p.IdCateg] || '';
    return {
      id:            p.IdProduct,
      name:          p.TitleProduct ?? '—',
      price:         String(p.PriceProduct ?? '0'),
      image:         this.firstImageUrl(p.ImageProduct, p.IdProduct),
      category:      this.catStyle.canonicalLabel(rawCat) || rawCat,
      categoryColor: '',
      vendorName:    this.vendorNames[p.IdUser] || '',
      vendorId:      p.IdUser ? +p.IdUser : null,
      shopName:      '',
      stock:         +(p.QuantityProduct ?? 0),
      isActive:      !!p.Active,

      likeCount:     +(p.LikeCount ?? 0),
      selected:      false,
    };
  }

  load(): void {
    this.loading = true;
    this.products.getAdminAllProducts(this.buildParams()).subscribe({
      next: (res: any) => {
        this.items       = (res?.data || []).map((p: any) => this.mapRow(p));
        this.totalItems  = res?.total        ?? this.items.length;
        this.totalPages  = res?.last_page    ?? 1;
        this.currentPage = res?.current_page ?? this.currentPage;
        this.generateSparks();
        this.loading = false;
        this.lastUpdate = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
      },
      error: () => { this.loading = false; }
    });
  }

  // Requêtes légères (per_page=1) : on ne lit que "total" renvoyé par Laravel.
  loadStats(): void {
    this.products.getAdminAllProducts({ per_page: 1 }).subscribe((res: any) => this.statTotal = res?.total ?? 0);
    this.products.getAdminAllProducts({ per_page: 1, Active: 1 }).subscribe((res: any) => this.statApproved = res?.total ?? 0);
    this.products.getAdminAllProducts({ per_page: 1, Active: 0 }).subscribe((res: any) => this.statPending = res?.total ?? 0);
  }

  // Générer des données sparkline réalistes
  private generateSparks(): void {
    this.sparkTotal    = this.makeSpark(this.statTotal,    8);
    this.sparkApproved = this.makeSpark(this.statApproved, 8);
    this.sparkPending  = this.makeSpark(this.statPending,  8);
    this.sparkValue    = this.makeSpark(this.totalStock,   8);
  }

  private makeSpark(current: number, points: number): number[] {
    if (current === 0) return Array(points).fill(0);
    const arr: number[] = [];
    for (let i = 0; i < points; i++) {
      const progress = i / (points - 1);
      const base = current * (0.5 + progress * 0.5);
      const noise = (Math.random() - 0.5) * current * 0.2;
      arr.push(Math.max(0, base + noise));
    }
    arr[points - 1] = current;
    return arr;
  }

  sparkPoints(data: number[]): string {
    if (!data.length) return '';
    const max = Math.max(...data, 1);
    const w = 120, h = 40, pad = 4;
    return data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - pad - ((v / max) * (h - pad * 2));
      return `${x},${y}`;
    }).join(' ');
  }

  onSearchChange(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.currentPage = 1; this.load(); }, 400);
  }

  applyFilter(): void { this.currentPage = 1; this.load(); }
  setFilter(f: string): void { this.filter = f; this.currentPage = 1; this.load(); }

  toggleAll(e: any): void {
    this.items.forEach(p => p.selected = e.target.checked);
  }

  goPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.currentPage = p;
    this.load();
  }

  pageRange(): number[] {
    const range: number[] = [];
    const start = Math.max(1, this.currentPage - 1);
    const end   = Math.min(this.totalPages, start + 2);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }

  approve(p: ProductRow): void {
    this.products.approveProduct(p.id).subscribe({
      next: () => { p.isActive = true; this.loadStats(); },
      error: () => alert('Approbation impossible.'),
    });
  }

  reject(p: ProductRow): void {
    if (!confirm(`Désapprouver le produit "${p.name}" ?`)) return;
    this.products.rejectProductAdmin(p.id).subscribe({
      next: () => { p.isActive = false; this.loadStats(); },
      error: () => alert('Action impossible.'),
    });
  }


  exportCsv(): void {
    const rows = [['ID','Nom','Vendeur','Catégorie','Prix','Stock','Statut']];
    this.items.forEach(p => rows.push([
      String(p.id), p.name, p.vendorName, p.category,
      p.price, String(p.stock), p.isActive ? 'Approuvé' : 'En attente'
    ]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `produits_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  // ══════════════════ VOIR / MODIFIER PRODUIT ══════════════════

  viewProduct(p: ProductRow): void {
    this.selectedProduct = p;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedProduct = null;
  }

  // ── Modifier : navigation vers la page dédiée ──
  goToDetail(id: number): void {
    this.router.navigate(['/admin/product-detail', id]);
  }

  // ── Helpers couleur / icônes : délèguent au service partagé (source unique) ──
  getCategoryColor(cat: string): string { return this.catStyle.color(cat); }
  getCategoryBg(cat: string): string    { return this.catStyle.bg(cat); }
  getCategoryIcon(cat: string): string  { return this.catStyle.icon(cat); }

  private vendorColors = [
    '#405189','#0ab39c','#f7b84b','#f06548','#299cdb',
    '#9c27b0','#e91e63','#4caf50','#ff9800','#607d8b'
  ];

  getVendorColor(name: string): string {
    if (!name) return '#6c757d';
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return this.vendorColors[Math.abs(hash) % this.vendorColors.length];
  }

  getInitials(name: string): string { 
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }
}