import { Component, OnInit } from '@angular/core';
import { AssetsService } from 'src/app/core/services/assets.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AnnoncesService } from 'src/app/core/services/annonces.service';
import { DealsService } from 'src/app/core/services/deals.service';
import { ProductsService } from 'src/app/core/services/products.service';
import { WishlistService } from 'src/app/core/services/wishlist.service';

interface ItemFeature {
  key: string;
  value: string;
}

interface FeatureFacet {
  key: string;
  options: { value: string; count: number }[];
}

@Component({
  selector: 'app-wishlist-user',
  standalone: false,
  template: `
<div class="container-fluid">
  <app-breadcrumbs [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

  <!-- ══ bannière avec barre de recherche ══ -->
  <div class="row mb-4">
    <div class="col-12">
      <div class="rounded-4 overflow-hidden position-relative"
           style="background:linear-gradient(135deg,#405189 0%,#3a4caa 55%,#0ab39c 100%)">
        <div class="px-4 py-4">
          <div class="d-flex align-items-center gap-3 mb-3">
            <div class="rounded-circle bg-white bg-opacity-25 d-flex align-items-center justify-content-center flex-shrink-0"
                 style="width:44px;height:44px">
              <i class="ri-heart-line text-white fs-20"></i>
            </div>
            <div class="text-white">
              <h5 class="fw-bold mb-0 fs-20" style="color:#fff!important">Mes Favoris</h5>
              <p class="mb-0 opacity-75 fs-13" style="color:#fff!important">Retrouvez vos annonces, deals et produits sauvegardés</p>
            </div>
          </div>

          <div class="d-flex align-items-center rounded-pill overflow-hidden shadow-sm mb-3"
               style="max-width:650px;height:56px;background:rgba(255,255,255,.18);backdrop-filter:blur(2px)">
            <span class="d-flex align-items-center justify-content-center flex-shrink-0"
                  style="width:56px;height:56px">
              <i class="ri-search-line text-white" style="font-size:20px"></i>
            </span>
            <input type="text" class="border-0 bg-transparent text-white flex-fill wishlist-search-input"
                   style="height:56px;font-size:16px;outline:none;box-shadow:none"
                   placeholder="Rechercher dans mes favoris..."
                   [(ngModel)]="searchTerm" [ngModelOptions]="{standalone: true}"
                   (ngModelChange)="onSearchChange()">
            @if (searchTerm) {
              <button class="border-0 bg-transparent text-white pe-4 flex-shrink-0" type="button"
                      (click)="searchTerm = ''; onSearchChange()" style="height:56px">
                <i class="ri-close-line fs-18"></i>
              </button>
            }
          </div>

          <div class="d-flex flex-wrap gap-2">
            <span class="badge rounded-pill px-3 py-2 fs-13 fw-medium"
                  style="background:rgba(255,255,255,.22);color:#fff">
              <i class="ri-equalizer-line me-1"></i>
              {{ filtered.length }} résultat(s)
            </span>
            <span class="badge rounded-pill px-3 py-2 fs-13 fw-medium" style="background:rgba(255,255,255,.22);color:#fff">
              Page {{ currentPage }} / {{ totalPages }}
            </span>
            @if (activeFiltersCount > 0) {
              <span class="badge rounded-pill px-3 py-2 fs-13 fw-medium" style="background:rgba(255,255,255,.22);color:#fff">
                <i class="ri-filter-3-line me-1"></i>{{ activeFiltersCount }} filtre(s) actif(s)
              </span>
            }
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="row g-4">

    <!-- ══ SIDEBAR FILTRES (identique à listing) ══ -->
    <div class="col-lg-3">
      <div class="card border-0 shadow-sm sticky-filters">
        <div class="card-body">
          <div class="d-flex align-items-center justify-content-between mb-3">
            <h6 class="fw-bold text-uppercase text-muted mb-0" style="font-size:11px;letter-spacing:.5px">
              <i class="ri-filter-3-line me-1"></i>Filtres
            </h6>
            <span class="badge bg-primary-subtle text-primary rounded-pill">{{ filtered.length }} résultat(s)</span>
          </div>

          <!-- Chips filtres actifs -->
          @if (activeFiltersCount > 0) {
            <div class="d-flex flex-wrap gap-1 mb-3">
              @if (filterCategory) {
                <span class="badge rounded-pill bg-primary-subtle text-primary d-inline-flex align-items-center gap-1 py-2 px-2">
                  {{ filterCategory }}
                  <i class="ri-close-line" style="cursor:pointer" (click)="selectFilterCategory('')"></i>
                </span>
              }
              @if (filterPriceMin != null) {
                <span class="badge rounded-pill bg-primary-subtle text-primary d-inline-flex align-items-center gap-1 py-2 px-2">
                  Min {{ filterPriceMin }} TND
                  <i class="ri-close-line" style="cursor:pointer" (click)="filterPriceMin=null; applyFilters()"></i>
                </span>
              }
              @if (filterPriceMax != null) {
                <span class="badge rounded-pill bg-primary-subtle text-primary d-inline-flex align-items-center gap-1 py-2 px-2">
                  Max {{ filterPriceMax }} TND
                  <i class="ri-close-line" style="cursor:pointer" (click)="filterPriceMax=null; applyFilters()"></i>
                </span>
              }
              @if (sortBy !== 'recent') {
                <span class="badge rounded-pill bg-primary-subtle text-primary d-inline-flex align-items-center gap-1 py-2 px-2">
                  Tri : {{ sortByLabel }}
                  <i class="ri-close-line" style="cursor:pointer" (click)="sortBy='recent'; applyFilters()"></i>
                </span>
              }
              @for (fk of activeFeatureFilterKeys; track fk) {
                @for (val of featureFilters[fk]; track val) {
                  <span class="badge rounded-pill bg-primary-subtle text-primary d-inline-flex align-items-center gap-1 py-2 px-2">
                    {{ fk }} : {{ val }}
                    <i class="ri-close-line" style="cursor:pointer" (click)="toggleFeatureValue(fk, val)"></i>
                  </span>
                }
              }
            </div>
          }

          <!-- ── Catégorie ─────────────────────────────────────── -->
          <div class="mb-3">
            <label class="form-label fs-12 fw-semibold text-muted text-uppercase mb-2">
              <i class="ri-list-check me-1"></i>Catégorie
            </label>
            <div style="position:relative">
              <button type="button"
                      class="form-select form-select-sm text-start d-flex align-items-center justify-content-between"
                      (click)="toggleCategoryDropdown()">
                <span class="fw-semibold text-truncate">{{ filterCategory || 'Toutes' }}</span>
                <span class="badge bg-light text-secondary rounded-pill ms-2">{{ getCategoryCount(filterCategory) }}</span>
              </button>
              @if (categoryDropdownOpen) {
                <div class="card shadow border-0 rounded-3 position-absolute w-100 mt-1"
                     style="z-index:30;max-height:280px;overflow-y:auto">
                  <div class="list-group list-group-flush">
                    <button type="button"
                            class="list-group-item list-group-item-action d-flex justify-content-between align-items-center border-0 py-2"
                            [class.bg-primary-subtle]="filterCategory===''"
                            [class.text-primary]="filterCategory===''"
                            [class.fw-semibold]="filterCategory===''"
                            (click)="selectFilterCategory('')">
                      <span>Toutes</span>
                      <span class="fs-11 text-muted">{{ getCategoryCount('') }}</span>
                    </button>
                    @for (cat of availableCategories; track cat) {
                      <button type="button"
                              class="list-group-item list-group-item-action d-flex justify-content-between align-items-center border-0 py-2"
                              [class.bg-primary-subtle]="filterCategory===cat"
                              [class.text-primary]="filterCategory===cat"
                              [class.fw-semibold]="filterCategory===cat"
                              (click)="selectFilterCategory(cat)">
                        <span>{{ cat }}</span>
                        <span class="fs-11 text-muted">{{ getCategoryCount(cat) }}</span>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- ── Prix ─────────────────────────────────────────── -->
          <div class="mb-3">
            <label class="form-label fs-12 fw-semibold text-muted text-uppercase mb-2">
              <i class="ri-price-tag-3-line me-1"></i>Prix (TND)
            </label>
            <div class="d-flex gap-2">
              <div class="input-group input-group-sm">
                <input type="number" class="form-control" placeholder="Min"
                       [(ngModel)]="filterPriceMin" (input)="applyFilters()">
              </div>
              <div class="input-group input-group-sm">
                <input type="number" class="form-control" placeholder="Max"
                       [(ngModel)]="filterPriceMax" (input)="applyFilters()">
              </div>
            </div>
          </div>

          <!-- ── Caractéristiques dynamiques : cases à cocher + compteurs ── -->
          @if (featureFacets.length > 0) {
            <div class="mb-3">
              <label class="form-label fs-12 fw-semibold text-muted text-uppercase mb-2">
                <i class="ri-settings-3-line me-1"></i>Caractéristiques
              </label>
              <div class="d-flex flex-column gap-2">
                @for (facet of featureFacets; track facet.key) {
                  <div class="card card-sm border-0 shadow-none p-0">
                    <div class="filter-label d-flex align-items-center justify-content-between"
                         style="cursor:pointer" (click)="toggleFacet(facet.key)">
                      <span>{{ facet.key }}</span>
                      <i class="ri-arrow-down-s-line facet-arrow" [class.open]="facetOpen[facet.key] !== false"></i>
                    </div>
                    @if (facetOpen[facet.key] !== false) {
                      <div class="facet-options ps-2 pt-2">
                        @for (opt of facet.options; track opt.value) {
                          <label class="d-flex align-items-center justify-content-between gap-2 mb-1" style="font-size:0.9rem;">
                            <span class="d-flex align-items-center gap-2">
                              <input type="checkbox"
                                     [checked]="isFeatureValueSelected(facet.key, opt.value)"
                                     (change)="toggleFeatureValue(facet.key, opt.value)">
                              <span>{{ opt.value }}</span>
                            </span>
                            <small class="text-muted">({{ opt.count }})</small>
                          </label>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }

          <!-- ── Tri ──────────────────────────────────────────── -->
          <div class="mb-3">
            <label class="form-label fs-12 fw-semibold text-muted text-uppercase mb-2">
              <i class="ri-sort-desc me-1"></i>Trier par
            </label>
            <select class="form-select form-select-sm" [(ngModel)]="sortBy" (change)="applyFilters()">
              <option value="recent">Plus récent</option>
              <option value="oldest">Plus ancien</option>
              <option value="title">Nom (A→Z)</option>
              <option value="priceAsc">Prix croissant</option>
              <option value="priceDesc">Prix décroissant</option>
            </select>
          </div>

          <button class="btn btn-outline-primary btn-sm w-100 rounded-3" (click)="resetAdvancedFilters()">
            <i class="ri-refresh-line me-1"></i>Réinitialiser les filtres
          </button>
        </div>
      </div>
    </div>

    <!-- ══ CONTENU ══ -->
    <div class="col-lg-9">
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white border-0 pt-4 px-4">
          <div class="d-flex align-items-center justify-content-between">
            <h5 class="card-title mb-0 fw-bold">
              <i class="ri-heart-line me-2 text-danger"></i>Mes Favoris
            </h5>
            <!-- Tab switcher -->
            <ul class="nav nav-pills nav-sm">
              <li class="nav-item">
                <button class="nav-link" [class.active]="activeTab==='ads'"
                        (click)="setActiveTab('ads')">
                  <i class="ri-megaphone-line me-1"></i>Annonces
                  <span class="badge bg-primary ms-1">{{ adsWishlist.length }}</span>
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link" [class.active]="activeTab==='deals'"
                        (click)="setActiveTab('deals')">
                  <i class="ri-price-tag-3-line me-1"></i>Deals
                  <span class="badge bg-primary ms-1">{{ dealsWishlist.length }}</span>
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link" [class.active]="activeTab==='products'"
                        (click)="setActiveTab('products')">
                  <i class="ri-shopping-bag-line me-1"></i>Produits
                  <span class="badge bg-primary ms-1">{{ productsWishlist.length }}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div class="card-body p-4">

          <!-- Annonces wishlist -->
          @if (activeTab === 'ads') {
            @if (loadingAds) {
              <div class="text-center py-4">
                <div class="spinner-border text-primary"></div>
              </div>
            } @else if (adsWishlist.length === 0) {
              <div class="text-center py-5 text-muted">
                <i class="ri-heart-line fs-48 d-block mb-3 opacity-30"></i>
                <p>Vous n'avez pas encore d'annonces favorites.</p>
                <a routerLink="/landing/annonces" class="btn btn-primary btn-sm">
                  <i class="ri-search-line me-1"></i>Parcourir les annonces
                </a>
              </div>
            } @else if (filtered.length === 0) {
              <div class="text-center py-5 text-muted">
                <i class="ri-search-line fs-48 d-block mb-3 opacity-30"></i>
                <p>Aucun résultat pour ces critères.</p>
                @if (activeFiltersCount > 0) {
                  <button class="btn btn-outline-secondary btn-sm rounded-3 mt-2" (click)="resetAdvancedFilters()">
                    Réinitialiser les filtres
                  </button>
                }
              </div>
            } @else {
              <div class="row g-3">
                @for (item of paginated; track trackWishItem(item, $index)) {
                  <div class="col-sm-6 col-lg-4 col-xl-3">
                    <div class="card border-0 shadow-sm h-100 hover-card">
                      <div class="position-relative">
                        <div style="height:160px;overflow:hidden;border-radius:8px 8px 0 0;background:#f3f4f8">
                          @if (item.image) {
                            <img [src]="item.image" style="width:100%;height:100%;object-fit:cover" alt="">
                          } @else {
                            <div class="d-flex align-items-center justify-content-center h-100">
                              <i class="ri-image-line text-muted fs-32"></i>
                            </div>
                          }
                        </div>
                        <button class="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle p-1"
                                style="width:28px;height:28px" title="Retirer des favoris"
                                (click)="removeAd(item)">
                          <i class="ri-heart-fill fs-12"></i>
                        </button>
                      </div>
                      <div class="card-body p-3">
                        <h6 class="fw-semibold mb-1 text-truncate">{{ item.title }}</h6>
                        @if (item.category) {
                          <div class="fs-11 text-muted mb-1">{{ item.category }}</div>
                        }
                        @if (item.price) {
                          <p class="text-primary fw-bold mb-0">{{ item.price }} TND</p>
                        }
                        @if (item.features && item.features.length > 0) {
                          <div class="d-flex flex-wrap gap-1 my-2">
                            @for (feat of item.features.slice(0, 2); track feat.key) {
                              <span class="feature-badge" [title]="feat.key + ': ' + feat.value">
                                {{ feat.key }} : {{ feat.value }}
                              </span>
                            }
                            @if (item.features.length > 2) {
                              <span class="feature-badge feature-badge-more">+{{ item.features.length - 2 }}</span>
                            }
                          </div>
                        }
                        <p class="text-muted fs-12 mb-2">Ajouté le {{ item.createdAt | date:'dd/MM/yyyy' }}</p>
                        <a [routerLink]="['/landing/annonces', item.targetId]"
                           class="btn btn-outline-primary btn-sm w-100">
                          <i class="ri-eye-line me-1"></i>Voir l'annonce
                        </a>
                      </div>
                    </div>
                  </div>
                }
              </div>

              @if (totalPages > 1) {
                <div class="d-flex justify-content-center align-items-center gap-2 mt-4">
                  <button class="btn btn-sm btn-outline-secondary rounded-3" [disabled]="currentPage===1" (click)="goToPage(currentPage-1)">
                    <i class="ri-arrow-left-s-line"></i>
                  </button>
                  @for (p of pagesArray; track p) {
                    <button class="btn btn-sm rounded-3" [class.btn-primary]="currentPage===p" [class.btn-outline-secondary]="currentPage!==p"
                            (click)="goToPage(p)">{{ p }}</button>
                  }
                  <button class="btn btn-sm btn-outline-secondary rounded-3" [disabled]="currentPage===totalPages" (click)="goToPage(currentPage+1)">
                    <i class="ri-arrow-right-s-line"></i>
                  </button>
                </div>
              }
            }
          }

          <!-- Deals wishlist -->
          @if (activeTab === 'deals') {
            @if (loadingDeals) {
              <div class="text-center py-4">
                <div class="spinner-border text-primary"></div>
              </div>
            } @else if (dealsWishlist.length === 0) {
              <div class="text-center py-5 text-muted">
                <i class="ri-heart-line fs-48 d-block mb-3 opacity-30"></i>
                <p>Vous n'avez pas encore de deals favoris.</p>
                <a routerLink="/landing/deals" class="btn btn-primary btn-sm">
                  <i class="ri-search-line me-1"></i>Parcourir les deals
                </a>
              </div>
            } @else if (filtered.length === 0) {
              <div class="text-center py-5 text-muted">
                <i class="ri-search-line fs-48 d-block mb-3 opacity-30"></i>
                <p>Aucun résultat pour ces critères.</p>
                @if (activeFiltersCount > 0) {
                  <button class="btn btn-outline-secondary btn-sm rounded-3 mt-2" (click)="resetAdvancedFilters()">
                    Réinitialiser les filtres
                  </button>
                }
              </div>
            } @else {
              <div class="row g-3">
                @for (item of paginated; track trackWishItem(item, $index)) {
                  <div class="col-sm-6 col-lg-4 col-xl-3">
                    <div class="card border-0 shadow-sm h-100 hover-card">
                      <div class="position-relative">
                        <div style="height:160px;overflow:hidden;border-radius:8px 8px 0 0;background:#f3f4f8">
                          @if (item.image) {
                            <img [src]="item.image" style="width:100%;height:100%;object-fit:cover" alt="">
                          } @else {
                            <div class="d-flex align-items-center justify-content-center h-100">
                              <i class="ri-image-line text-muted fs-32"></i>
                            </div>
                          }
                        </div>
                        <button class="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle p-1"
                                style="width:28px;height:28px" title="Retirer des favoris"
                                (click)="removeDeal(item)">
                          <i class="ri-heart-fill fs-12"></i>
                        </button>
                      </div>
                      <div class="card-body p-3">
                        <h6 class="fw-semibold mb-1 text-truncate">{{ item.title }}</h6>
                        @if (item.category) {
                          <div class="fs-11 text-muted mb-1">{{ item.category }}</div>
                        }
                        @if (item.price) {
                          <p class="text-primary fw-bold mb-0">{{ item.price }} TND</p>
                        }
                        @if (item.features && item.features.length > 0) {
                          <div class="d-flex flex-wrap gap-1 my-2">
                            @for (feat of item.features.slice(0, 2); track feat.key) {
                              <span class="feature-badge" [title]="feat.key + ': ' + feat.value">
                                {{ feat.key }} : {{ feat.value }}
                              </span>
                            }
                            @if (item.features.length > 2) {
                              <span class="feature-badge feature-badge-more">+{{ item.features.length - 2 }}</span>
                            }
                          </div>
                        }
                        <p class="text-muted fs-12 mb-2">Ajouté le {{ item.createdAt | date:'dd/MM/yyyy' }}</p>
                        <a [routerLink]="['/landing/deals', item.targetId]"
                           class="btn btn-outline-primary btn-sm w-100">
                          <i class="ri-eye-line me-1"></i>Voir le deal
                        </a>
                      </div>
                    </div>
                  </div>
                }
              </div>

              @if (totalPages > 1) {
                <div class="d-flex justify-content-center align-items-center gap-2 mt-4">
                  <button class="btn btn-sm btn-outline-secondary rounded-3" [disabled]="currentPage===1" (click)="goToPage(currentPage-1)">
                    <i class="ri-arrow-left-s-line"></i>
                  </button>
                  @for (p of pagesArray; track p) {
                    <button class="btn btn-sm rounded-3" [class.btn-primary]="currentPage===p" [class.btn-outline-secondary]="currentPage!==p"
                            (click)="goToPage(p)">{{ p }}</button>
                  }
                  <button class="btn btn-sm btn-outline-secondary rounded-3" [disabled]="currentPage===totalPages" (click)="goToPage(currentPage+1)">
                    <i class="ri-arrow-right-s-line"></i>
                  </button>
                </div>
              }
            }
          }

          <!-- Produits wishlist -->
          @if (activeTab === 'products') {
            @if (loadingProducts) {
              <div class="text-center py-4">
                <div class="spinner-border text-primary"></div>
              </div>
            } @else if (productsWishlist.length === 0) {
              <div class="text-center py-5 text-muted">
                <i class="ri-heart-line fs-48 d-block mb-3 opacity-30"></i>
                <p>Vous n'avez pas encore de produits favoris.</p>
                <a routerLink="/landing/produits" class="btn btn-primary btn-sm">
                  <i class="ri-search-line me-1"></i>Parcourir les produits
                </a>
              </div>
            } @else if (filtered.length === 0) {
              <div class="text-center py-5 text-muted">
                <i class="ri-search-line fs-48 d-block mb-3 opacity-30"></i>
                <p>Aucun résultat pour ces critères.</p>
                @if (activeFiltersCount > 0) {
                  <button class="btn btn-outline-secondary btn-sm rounded-3 mt-2" (click)="resetAdvancedFilters()">
                    Réinitialiser les filtres
                  </button>
                }
              </div>
            } @else {
              <div class="row g-3">
                @for (item of paginated; track trackWishItem(item, $index)) {
                  <div class="col-sm-6 col-lg-4 col-xl-3">
                    <div class="card border-0 shadow-sm h-100 hover-card">
                      <div class="position-relative">
                        <div style="height:160px;overflow:hidden;border-radius:8px 8px 0 0;background:#f3f4f8">
                          @if (item.image) {
                            <img [src]="item.image" style="width:100%;height:100%;object-fit:cover" alt="">
                          } @else {
                            <div class="d-flex align-items-center justify-content-center h-100">
                              <i class="ri-image-line text-muted fs-32"></i>
                            </div>
                          }
                        </div>
                        <button class="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle p-1"
                                style="width:28px;height:28px" title="Retirer des favoris"
                                (click)="removeProduct(item)">
                          <i class="ri-heart-fill fs-12"></i>
                        </button>
                      </div>
                      <div class="card-body p-3">
                        <h6 class="fw-semibold mb-1 text-truncate">{{ item.title }}</h6>
                        @if (item.category) {
                          <div class="fs-11 text-muted mb-1">{{ item.category }}</div>
                        }
                        @if (item.price) {
                          <p class="text-primary fw-bold mb-0">{{ item.price }} TND</p>
                        }
                        @if (item.features && item.features.length > 0) {
                          <div class="d-flex flex-wrap gap-1 my-2">
                            @for (feat of item.features.slice(0, 2); track feat.key) {
                              <span class="feature-badge" [title]="feat.key + ': ' + feat.value">
                                {{ feat.key }} : {{ feat.value }}
                              </span>
                            }
                            @if (item.features.length > 2) {
                              <span class="feature-badge feature-badge-more">+{{ item.features.length - 2 }}</span>
                            }
                          </div>
                        }
                        <p class="text-muted fs-12 mb-2">Ajouté le {{ item.createdAt | date:'dd/MM/yyyy' }}</p>
                        <a [routerLink]="['/landing/produits', item.targetId]"
                           class="btn btn-outline-primary btn-sm w-100">
                          <i class="ri-eye-line me-1"></i>Voir le produit
                        </a>
                      </div>
                    </div>
                  </div>
                }
              </div>

              @if (totalPages > 1) {
                <div class="d-flex justify-content-center align-items-center gap-2 mt-4">
                  <button class="btn btn-sm btn-outline-secondary rounded-3" [disabled]="currentPage===1" (click)="goToPage(currentPage-1)">
                    <i class="ri-arrow-left-s-line"></i>
                  </button>
                  @for (p of pagesArray; track p) {
                    <button class="btn btn-sm rounded-3" [class.btn-primary]="currentPage===p" [class.btn-outline-secondary]="currentPage!==p"
                            (click)="goToPage(p)">{{ p }}</button>
                  }
                  <button class="btn btn-sm btn-outline-secondary rounded-3" [disabled]="currentPage===totalPages" (click)="goToPage(currentPage+1)">
                    <i class="ri-arrow-right-s-line"></i>
                  </button>
                </div>
              }
            }
          }

        </div>
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    .hover-card {
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }
    .hover-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important;
    }
    .wishlist-search-input::placeholder {
      color: rgba(255, 255, 255, 0.8);
      opacity: 1;
    }

    .sticky-filters { position: sticky; top: 20px; }

    .feature-badge {
      display: inline-flex;
      align-items: center;
      background: #f1f3f9;
      color: #495057;
      font-size: 10.5px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #e4e7ee;
      white-space: nowrap;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .feature-badge-more {
      background: #405189;
      color: #fff;
      border-color: #405189;
    }

    /* ── Facettes à cocher (façon Tunisianet) ─────────────── */
    .filter-label {
      font-size: 12px;
      font-weight: 700;
      color: #98a6ad;
      text-transform: uppercase;
      letter-spacing: .3px;
    }
    .facet-arrow { transition: transform .2s; }
    .facet-arrow.open { transform: rotate(180deg); }
    .facet-options {
      display: flex;
      flex-direction: column;
      gap: 9px;
      max-height: 220px;
      overflow-y: auto;
      padding-right: 4px;
    }
  `]
})
export class WishlistUserComponent implements OnInit {
  breadCrumbItems = [
    { label: 'Mon Espace' },
    { label: 'Mes Favoris', active: true }
  ];

  activeTab: 'ads' | 'deals' | 'products' = 'ads';
  adsWishlist:      any[] = [];
  dealsWishlist:    any[] = [];
  productsWishlist: any[] = [];
  loadingAds      = true;
  loadingDeals    = false;
  loadingProducts = false;

  searchTerm = '';

  currentPage = 1;
  pageSize    = 8;

  // ─── Filtres avancés (identiques à listing) ───────────────
  filterCategory = '';
  filterPriceMin: number | null = null;
  filterPriceMax: number | null = null;
  categoryDropdownOpen = false;
  sortBy: 'recent' | 'oldest' | 'title' | 'priceAsc' | 'priceDesc' = 'recent';

  featureFilters: Record<string, string[]> = {};
  facetOpen: Record<string, boolean> = {};

  filtered: any[] = [];
  paginated: any[] = [];

  private readonly HARD_PAGE_CAP = 50;

  constructor(private annoncesService: AnnoncesService, private dealsService: DealsService, private productsService: ProductsService, private wishlistService: WishlistService, private assetsService: AssetsService) {}

  ngOnInit(): void { this.loadAds(); }

  // ── Contournement bug backend (fuite de donnees) ────────────────────
  // GET /ads-wishlist, /deals-wishlist et /product-wishlist renvoient les
  // entrees de TOUS les utilisateurs, pas seulement celles de l'utilisateur
  // connecte (IdUser variant sur chaque ligne de la reponse, pas filtre
  // cote backend). Interdiction de toucher au backend -> on filtre
  // nous-memes sur l'IdUser du compte connecte avant tout affichage.
  // ATTENTION : ceci ne corrige que l'AFFICHAGE — les donnees des autres
  // utilisateurs ont deja transite sur le reseau jusqu'au navigateur. Il
  // s'agit d'une fuite de confidentialite reelle cote backend qui devrait
  // etre signalee et corrigee independamment de ce contournement.
  private get currentUserId(): number | null {
    try {
      const cu = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const raw = cu?.id ?? cu?.IdUser ?? cu?.user?.id;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  }

  // Identifiant robuste pour le wishlist item, quel que soit le nom du champ
  // renvoyé par le backend (idWish, wishId, wish_id, id, favoriteId...).
  private resolveWishId(item: any): string | null {
    const raw = item?.idWish ?? item?.wishId ?? item?.wish_id
      ?? item?.favoriteId ?? item?.favorite_id ?? item?.id;
    if (raw === null || raw === undefined || raw === '') return null;
    return String(raw);
  }

  // ✅ Résout l'id de la CIBLE (l'annonce, le deal ou le produit liké), quel
  // que soit le nom du champ renvoyé par le backend pour /ads-wishlist,
  // /deals-wishlist et /product-wishlist. Sans ce fix, mapWishItem() ne pose
  // jamais "targetId" explicitement : le template et removeAd()/removeDeal()/
  // removeProduct() s'appuieraient sur un champ brut absent côté backend.
  private resolveTargetId(item: any): number | null {
    const raw = item?.targetId ?? item?.target_id
      ?? item?.IdAd ?? item?.IdDeal ?? item?.IdProduct
      ?? item?.ad_id ?? item?.deal_id ?? item?.product_id
      ?? item?.id;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  // Utilisé par le track du @for : ne dépend jamais d'un champ vide,
  // évite donc l'erreur NG0955 (Duplicated keys) même si idWish est absent.
  trackWishItem(item: any, index: number): string {
    return this.resolveWishId(item) ?? `${item?.targetId ?? 'item'}-${index}`;
  }

  // ── Resolution d'URL d'image ──────────────────────────────────────
  // Meme convention que listing.component.ts / detail.component.ts :
  // chemins relatifs type "assets/ads/images/xxx.jpg" -> prefixes par
  // l'URL de base des assets backend.
  private resolveImageUrl(raw: unknown, kind: 'ads' | 'deals' | 'products'): string | null {
    const val = Array.isArray(raw) ? raw[0] : raw;
    if (!val) return null;
    const s = String(val);
    if (s.startsWith('http://') || s.startsWith('https://')) return s;

    const cleanPath = s.replace(/\\/g, '/');
    const filename = cleanPath.split('/').pop();
    const folder = kind === 'ads' ? 'assets/ads/images'
                 : kind === 'deals' ? 'assets/deals/images'
                 : 'assets/products/images';
    return `${this.assetsService.assetsBaseUrl}/${folder}/${filename}`;
  }

  // ── Mapping aligne sur les vrais champs backend ─────────────────────
  // "item" ici est le detail complet de l'annonce/deal/produit (recupere
  // via GET /ads/{id}, /deals/{id} ou /products/{id}), fusionne avec les
  // infos de la liaison wishlist (idWish, targetId). Reprend le meme
  // pattern de prefixes que partout ailleurs dans l'app
  // (TitleAd/PriceAd/ImageAd... ou TitleProduct/PriceProduct/ImageProduct...).
  private mapWishItem(item: any, kind: 'ads' | 'deals' | 'products'): any {
    const price = parseFloat(
      item.PriceAd ?? item.PriceDeal ?? item.PriceProduct ?? item.price ?? item.deal_price ?? '0'
    );

    const imageSource = item.ImageAd ?? item.ImageDeal ?? item.ImageProduct ?? item.image ?? item.image_url;

    return {
      idWish: this.resolveWishId(item),
      targetId: this.resolveTargetId(item),
      title: item.TitleAd || item.TitleDeal || item.TitleProduct || item.title || item.name || 'Sans titre',
      description: item.DescriptionAd || item.DescriptionDeal || item.DescriptionProduct || item.description || '',
      category: item.category || item.category_name || '',
      image: this.resolveImageUrl(imageSource, kind),
      price: Number.isFinite(price) && price > 0 ? price : null,
      features: this.toFeatures(item.values ?? item.features ?? item.Features ?? item.attributes ?? item.featureValues),
      createdAt: item.createdAt || item.created_at || item.date_added || item.DatePublication || null,
      raw: item,
    };
  }

  private toFeatures(source: unknown): ItemFeature[] {
    let value = source;
    if (typeof value === 'string') {
      try { value = JSON.parse(value); } catch { return []; }
    }

    const entries = Array.isArray(value)
      ? value
      : value && typeof value === 'object'
        ? Object.entries(value as Record<string, unknown>).map(([key, featureValue]) => ({ key, value: featureValue }))
        : [];

    return entries
      .map((entry: any) => ({
        key: String(entry?.feature?.TitleFeature ?? entry?.key ?? entry?.name ?? entry?.label ?? entry?.featureKey ?? '').trim(),
        value: String(entry?.ValueFeature ?? entry?.value ?? entry?.featureValue ?? entry?.val ?? '').trim(),
      }))
      .filter((feature: ItemFeature) => !!feature.key && !!feature.value);
  }

  // ── Pagination du endpoint wishlist ─────────────────────────────────
  // /ads-wishlist, /deals-wishlist et /product-wishlist plafonnent a 10
  // items par page (meme bug que products/ads/deals). On boucle sur "page"
  // en s'appuyant sur "last_page" fourni par la reponse Laravel, jusqu'a
  // avoir tout recupere.
  private fetchAllWishlistPages(callFactory: (page: number) => import('rxjs').Observable<any>): Promise<any[]> {
    return new Promise((resolve) => {
      const collected: any[] = [];
      let page = 1;

      const next = () => {
        if (page > this.HARD_PAGE_CAP) { resolve(collected); return; }

        callFactory(page).subscribe({
          next: (r: any) => {
            const data: any[] = Array.isArray(r) ? r : (r?.data || []);
            if (data.length === 0) { resolve(collected); return; }

            collected.push(...data);

            const lastPage = Number(r?.last_page);
            if (Number.isFinite(lastPage) && page >= lastPage) {
              resolve(collected);
              return;
            }

            page++;
            next();
          },
          error: () => resolve(collected)
        });
      };

      next();
    });
  }

  loadAds(): void {
    this.loadingAds = true;
    const uid = this.currentUserId;

    this.fetchAllWishlistPages(page => this.wishlistService.getWishlistAds({ page })).then((raw) => {
      // Contournement fuite backend : on ne garde que nos propres entrees.
      const mine = uid == null ? raw : raw.filter(w => Number(w.IdUser) === uid);

      const uniqueAdIds = Array.from(new Set(
        mine.map(w => Number(w.IdAd ?? w.ad_id ?? w.targetId)).filter(id => Number.isFinite(id) && id > 0)
      ));

      if (uniqueAdIds.length === 0) {
        this.adsWishlist = [];
        this.loadingAds = false;
        this.applyFilters();
        return;
      }

      const requests = uniqueAdIds.map(id =>
        this.annoncesService.getAnnonce(id).pipe(catchError(() => of(null)))
      );

      forkJoin(requests).subscribe((results: any[]) => {
        const detailsMap = new Map<number, any>();
        results.forEach((r: any, i: number) => {
          const unwrapped = r?.data ?? r;
          if (unwrapped) detailsMap.set(uniqueAdIds[i], unwrapped);
        });

        this.adsWishlist = mine
          .map(w => {
            const adId = Number(w.IdAd ?? w.ad_id ?? w.targetId);
            const detail = detailsMap.get(adId);
            if (!detail) return null;
            return this.mapWishItem(
              { ...detail, idWish: w.IdWishlistAd ?? w.idWish, targetId: adId },
              'ads'
            );
          })
          .filter((x): x is any => x !== null);

        this.loadingAds = false;
        this.applyFilters();
      });
    });
  }

  loadDeals(): void {
    this.loadingDeals = true;
    const uid = this.currentUserId;

    this.fetchAllWishlistPages(page => this.wishlistService.getWishlistDeals({ page })).then((raw) => {
      const mine = uid == null ? raw : raw.filter(w => Number(w.IdUser) === uid);

      const uniqueDealIds = Array.from(new Set(
        mine.map(w => Number(w.IdDeal ?? w.deal_id ?? w.targetId)).filter(id => Number.isFinite(id) && id > 0)
      ));

      if (uniqueDealIds.length === 0) {
        this.dealsWishlist = [];
        this.loadingDeals = false;
        this.applyFilters();
        return;
      }

      const requests = uniqueDealIds.map(id =>
        this.dealsService.getDeal(id).pipe(catchError(() => of(null)))
      );

      forkJoin(requests).subscribe((results: any[]) => {
        const detailsMap = new Map<number, any>();
        results.forEach((r: any, i: number) => {
          const unwrapped = r?.data ?? r;
          if (unwrapped) detailsMap.set(uniqueDealIds[i], unwrapped);
        });

        this.dealsWishlist = mine
          .map(w => {
            const dealId = Number(w.IdDeal ?? w.deal_id ?? w.targetId);
            const detail = detailsMap.get(dealId);
            if (!detail) return null;
            return this.mapWishItem(
              { ...detail, idWish: w.IdWishlistDeal ?? w.idWish, targetId: dealId },
              'deals'
            );
          })
          .filter((x): x is any => x !== null);

        this.loadingDeals = false;
        this.applyFilters();
      });
    });
  }

  // ✅ AJOUTÉ — même logique que loadAds()/loadDeals(), branchée sur
  // getWishlistProducts() (GET /product-wishlist) + getProduct() pour
  // chaque IdProduct trouvé. Sans cette méthode, l'onglet "Produits"
  // n'existait pas du tout : un produit ajouté aux favoris (confirmé
  // présent en base côté backend) n'était donc jamais affiché nulle part
  // dans le frontend.
  loadProducts(): void {
    this.loadingProducts = true;
    const uid = this.currentUserId;

    this.fetchAllWishlistPages(page => this.wishlistService.getWishlistProducts({ page })).then((raw) => {
      const mine = uid == null ? raw : raw.filter(w => Number(w.IdUser) === uid);

      const uniqueProductIds = Array.from(new Set(
        mine.map(w => Number(w.IdProduct ?? w.product_id ?? w.targetId)).filter(id => Number.isFinite(id) && id > 0)
      ));

      if (uniqueProductIds.length === 0) {
        this.productsWishlist = [];
        this.loadingProducts = false;
        this.applyFilters();
        return;
      }

      const requests = uniqueProductIds.map(id =>
        this.productsService.getProduct(id).pipe(catchError(() => of(null)))
      );

      forkJoin(requests).subscribe((results: any[]) => {
        const detailsMap = new Map<number, any>();
        results.forEach((r: any, i: number) => {
          const unwrapped = r?.data ?? r;
          if (unwrapped) detailsMap.set(uniqueProductIds[i], unwrapped);
        });

        this.productsWishlist = mine
          .map(w => {
            const productId = Number(w.IdProduct ?? w.product_id ?? w.targetId);
            const detail = detailsMap.get(productId);
            if (!detail) return null;
            return this.mapWishItem(
              { ...detail, idWish: w.IdWishlistProduct ?? w.idWish, targetId: productId },
              'products'
            );
          })
          .filter((x): x is any => x !== null);

        this.loadingProducts = false;
        this.applyFilters();
      });
    });
  }

  setActiveTab(tab: 'ads' | 'deals' | 'products'): void {
    this.activeTab = tab;
    this.resetAdvancedFilters();
    if (tab === 'deals' && this.dealsWishlist.length === 0 && !this.loadingDeals) {
      this.loadDeals();
    } else if (tab === 'products' && this.productsWishlist.length === 0 && !this.loadingProducts) {
      this.loadProducts();
    } else {
      this.applyFilters();
    }
  }

  removeAd(item: any): void {
    this.wishlistService.removeFromWishlist('ads', item.targetId).subscribe({
      next: () => {
        this.adsWishlist = this.adsWishlist.filter(i => this.trackWishItem(i, -1) !== this.trackWishItem(item, -1));
        this.applyFilters();
      }
    });
  }

  removeDeal(item: any): void {
    this.wishlistService.removeFromWishlist('deals', item.targetId).subscribe({
      next: () => {
        this.dealsWishlist = this.dealsWishlist.filter(i => this.trackWishItem(i, -1) !== this.trackWishItem(item, -1));
        this.applyFilters();
      }
    });
  }

  // ✅ AJOUTÉ — retrait d'un produit des favoris, même logique que
  // removeAd()/removeDeal().
  removeProduct(item: any): void {
    this.wishlistService.removeFromWishlist('products', item.targetId).subscribe({
      next: () => {
        this.productsWishlist = this.productsWishlist.filter(i => this.trackWishItem(i, -1) !== this.trackWishItem(item, -1));
        this.applyFilters();
      }
    });
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  // ─── Source active selon l'onglet ───────────────────────────
  private get sourceList(): any[] {
    return this.activeTab === 'ads' ? this.adsWishlist
         : this.activeTab === 'deals' ? this.dealsWishlist
         : this.productsWishlist;
  }

  get availableCategories(): string[] {
    const values = new Set<string>();
    this.sourceList.forEach(p => { if (p.category) values.add(p.category); });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }

  getCategoryCount(cat: string): number {
    if (!cat) return this.sourceList.length;
    return this.sourceList.filter(p => p.category === cat).length;
  }

  toggleCategoryDropdown(): void {
    this.categoryDropdownOpen = !this.categoryDropdownOpen;
  }

  selectFilterCategory(cat: string): void {
    this.filterCategory = cat;
    this.categoryDropdownOpen = false;
    this.currentPage = 1;
    this.applyFilters();
  }

  toggleFacet(key: string): void {
    this.facetOpen[key] = this.facetOpen[key] === false ? true : false;
  }

  get sortByLabel(): string {
    switch (this.sortBy) {
      case 'oldest': return 'Plus ancien';
      case 'title': return 'Nom (A→Z)';
      case 'priceAsc': return 'Prix croissant';
      case 'priceDesc': return 'Prix décroissant';
      default: return 'Plus récent';
    }
  }

  get activeFeatureFilterKeys(): string[] {
    return Object.keys(this.featureFilters).filter(k => (this.featureFilters[k] || []).length > 0);
  }

  get activeFiltersCount(): number {
    let count = 0;
    if (this.filterCategory) count++;
    if (this.filterPriceMin != null) count++;
    if (this.filterPriceMax != null) count++;
    this.activeFeatureFilterKeys.forEach(k => count += this.featureFilters[k].length);
    return count;
  }

  toggleFeatureValue(key: string, value: string): void {
    const arr = [...(this.featureFilters[key] || [])];
    const idx = arr.indexOf(value);
    if (idx > -1) { arr.splice(idx, 1); } else { arr.push(value); }

    if (arr.length === 0) {
      const { [key]: _removed, ...rest } = this.featureFilters;
      this.featureFilters = rest;
    } else {
      this.featureFilters = { ...this.featureFilters, [key]: arr };
    }
    this.currentPage = 1;
    this.applyFilters();
  }

  isFeatureValueSelected(key: string, value: string): boolean {
    return (this.featureFilters[key] || []).includes(value);
  }

  private normalizeKey(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private itemMatchesFeatureValues(item: any, key: string, selectedValues: string[]): boolean {
    if (!selectedValues.length) return true;
    if (!Array.isArray(item.features)) return false;
    const matchingValues = (item.features as ItemFeature[])
      .filter(f => this.normalizeKey(f.key) === this.normalizeKey(key))
      .map(f => f.value);
    return selectedValues.some(value => matchingValues.includes(value));
  }

  // Base de calcul des compteurs : ignore le groupe en cours de sélection,
  // comme dans listing, pour que les autres options du même groupe restent visibles.
  private itemsForFacetCounts(excludedFeatureKey?: string): any[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.sourceList.filter(p => {
      if (term && !p.title?.toLowerCase().includes(term)) return false;
      if (this.filterCategory && p.category !== this.filterCategory) return false;
      if (this.filterPriceMin != null && (p.price == null || p.price < this.filterPriceMin)) return false;
      if (this.filterPriceMax != null && (p.price == null || p.price > this.filterPriceMax)) return false;

      return this.activeFeatureFilterKeys
        .filter(key => this.normalizeKey(key) !== this.normalizeKey(excludedFeatureKey || ''))
        .every(key => this.itemMatchesFeatureValues(p, key, this.featureFilters[key] || []));
    });
  }

  get featureFacets(): FeatureFacet[] {
    const labels = new Map<string, string>();
    this.itemsForFacetCounts().forEach(item => {
      if (!Array.isArray(item.features)) return;
      (item.features as ItemFeature[]).forEach(f => {
        const normalized = this.normalizeKey(f.key);
        if (normalized && !labels.has(normalized)) labels.set(normalized, f.key);
      });
    });

    return Array.from(labels.entries())
      .map(([normalizedKey, key]) => {
        const options = new Map<string, number>();
        this.itemsForFacetCounts(key).forEach(item => {
          if (!Array.isArray(item.features)) return;
          (item.features as ItemFeature[])
            .filter(f => this.normalizeKey(f.key) === normalizedKey)
            .forEach(f => options.set(f.value, (options.get(f.value) || 0) + 1));
        });
        return {
          key,
          options: Array.from(options.entries())
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => a.value.localeCompare(b.value, 'fr', { numeric: true })),
        };
      })
      .filter(facet => facet.options.length > 0)
      .sort((a, b) => a.key.localeCompare(b.key, 'fr', { numeric: true }));
  }

  resetAdvancedFilters(): void {
    this.filterCategory = '';
    this.filterPriceMin = null;
    this.filterPriceMax = null;
    this.featureFilters = {};
    this.searchTerm = '';
    this.sortBy = 'recent';
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    let list = this.sourceList.filter(p => {
      if (term && !p.title?.toLowerCase().includes(term)) return false;
      if (this.filterCategory && p.category !== this.filterCategory) return false;
      if (this.filterPriceMin != null && (p.price == null || p.price < this.filterPriceMin)) return false;
      if (this.filterPriceMax != null && (p.price == null || p.price > this.filterPriceMax)) return false;

      const activeKeys = this.activeFeatureFilterKeys;
      if (activeKeys.length > 0) {
        if (!Array.isArray(p.features) || p.features.length === 0) return false;
        for (const key of activeKeys) {
          if (!this.itemMatchesFeatureValues(p, key, this.featureFilters[key] || [])) return false;
        }
      }

      return true;
    });

    switch (this.sortBy) {
      case 'title':     list.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
      case 'priceAsc':  list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0)); break;
      case 'priceDesc': list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); break;
      case 'oldest':    list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()); break;
      default:          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()); break;
    }

    this.filtered = list;

    const total = this.totalPages;
    if (this.currentPage > total) this.currentPage = total;

    this.updatePagination();
  }

  private updatePagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginated = this.filtered.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }
}