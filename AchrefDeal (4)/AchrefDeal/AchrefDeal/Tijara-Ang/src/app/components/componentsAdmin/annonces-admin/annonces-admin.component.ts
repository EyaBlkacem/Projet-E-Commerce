import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { CategoriesService } from 'src/app/core/services/categories.service';
import { AnnoncesService } from 'src/app/core/services/annonces.service';

interface AnnonceRow {
  id:             number;
  title:          string;
  description:    string;
  price:          string;
  image:          string;

  images:         string[];
  imageIdx:       number;
  category:       string;
  categoryIcon:   string;
  categoryColor:  string;
  authorName:     string;
  authorId:       number | null;
  authorInitials: string;
  authorColor:    string;
  active:         boolean;
  date:           string | null;
  city:           string;
  
  phone:          string;
  email:          string;

  likeCount:      number;
}

@Component({
  selector:   'app-annonces-admin',
  standalone: false,
  template: `
<!-- ═════ Hero Header ═════ -->
<div class="ann-hero mb-4">
  <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
    <div>
      <div class="d-flex align-items-center gap-2 mb-2">
        <span class="ann-live-badge">
          <span class="ann-live-dot"></span> MODÉRATION EN DIRECT
        </span>
        <span class="ann-update-text">Mise à jour {{ lastUpdate }}</span>
      </div>
      <h1 class="ann-hero-title">
        Annonces <span class="ann-hero-accent">marketplace</span>
      </h1>
      <p class="ann-hero-sub">
        Passez en revue les publications de vos vendeurs, validez les nouvelles annonces
        et gardez un œil sur la <span class="ann-hero-highlight">qualité</span> de votre catalogue.
      </p>
    </div>
    <div class="d-flex align-items-center gap-4">
      <div class="d-flex gap-2 align-items-center">
        <button class="ann-btn-secondary">
          <i class="ri-equalizer-3-line me-1"></i>Filtres avancés
        </button>
        <button class="ann-btn-primary">
          <i class="ri-robot-line me-1"></i>Modération auto
          <i class="ri-arrow-right-line ms-1"></i>
        </button>
      </div>
      <div class="ann-hero-illustration d-none d-lg-block">
        <svg viewBox="0 0 140 120" width="110" height="94">
          <defs>
            <linearGradient id="annHeroGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#c9c3f7"/>
              <stop offset="100%" stop-color="#7c6ef5"/>
            </linearGradient>
          </defs>
          <g opacity="0.5">
            <circle cx="20" cy="22" r="3" fill="#f7b84b"/>
            <circle cx="122" cy="18" r="2.5" fill="#0ab39c"/>
            <circle cx="18" cy="95" r="2" fill="#f06595"/>
          </g>
          <rect x="30" y="45" width="60" height="40" rx="10" fill="url(#annHeroGrad)" opacity="0.18"/>
          <path d="M45 55 L70 45 L70 85 L45 75 Z" fill="url(#annHeroGrad)"/>
          <path d="M70 48 L95 38 A24 24 0 0 1 95 92 L70 82 Z" fill="url(#annHeroGrad)"/>
          <rect x="48" y="75" width="8" height="18" rx="3" fill="#405189"/>
          <circle cx="98" cy="65" r="5" fill="#fff"/>
        </svg>
      </div>
    </div>
  </div>
</div>

<!-- ═════ KPI Cards ═════ -->
<div class="row g-3 mb-4">
  <div class="col-6 col-md-3">
    <div class="ann-kpi">
      <div class="ann-kpi-top">
        <span class="ann-kpi-icon" style="background:#e8eaf6;color:#405189">
          <i class="ri-megaphone-line"></i>
        </span>
        <span class="ann-kpi-trend up">↗ +12.4%</span>
      </div>
      <div class="ann-kpi-label">TOTAL ANNONCES</div>
      <div class="ann-kpi-value">{{ statTotal }}</div>
      <div class="ann-kpi-sub">vs. mois dernier</div>
      <svg class="ann-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
        <polyline points="0,25 15,20 30,22 45,15 60,18 80,10" fill="none" stroke="#405189" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="ann-kpi">
      <div class="ann-kpi-top">
        <span class="ann-kpi-icon" style="background:#e0f9f5;color:#0ab39c">
          <i class="ri-checkbox-circle-line"></i>
        </span>
        <span class="ann-kpi-trend up">↗ {{ statTotal > 0 ? (statApproved / statTotal * 100 | number:'1.0-0') : 0 }}%</span>
      </div>
      <div class="ann-kpi-label">PUBLICATIONS ACTIVES</div>
      <div class="ann-kpi-value">{{ statApproved }}</div>
      <div class="ann-kpi-sub">taux d'approbation</div>
      <svg class="ann-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
        <polyline points="0,28 15,22 30,18 45,20 60,12 80,8" fill="none" stroke="#0ab39c" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="ann-kpi">
      <div class="ann-kpi-top">
        <span class="ann-kpi-icon" style="background:#fef9e7;color:#f7b84b">
          <i class="ri-time-line"></i>
        </span>
        <span class="ann-kpi-trend warn">À traiter</span>
      </div>
      <div class="ann-kpi-label">FILE DE MODÉRATION</div>
      <div class="ann-kpi-value" style="color:#f7b84b">{{ statPending }}</div>
      <div class="ann-kpi-sub">demandes en attente</div>
      <svg class="ann-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
        <polyline points="0,15 15,20 30,12 45,22 60,16 80,24" fill="none" stroke="#f7b84b" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="ann-kpi">
      <div class="ann-kpi-top">
        <span class="ann-kpi-icon" style="background:#e8f4ff;color:#299cdb">
          <i class="ri-money-dollar-circle-line"></i>
        </span>
        <span class="ann-kpi-trend up">↗ TND</span>
      </div>
      <div class="ann-kpi-label">VALEUR (page actuelle)</div>
      <div class="ann-kpi-value">{{ totalValue }}</div>
      <div class="ann-kpi-sub">annonces approuvées affichées</div>
      <svg class="ann-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
        <polyline points="0,28 15,24 30,20 45,16 60,10 80,6" fill="none" stroke="#299cdb" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>
</div>

<!-- ═════ Section modération ═════ -->
<div class="ann-card">
  <div class="ann-card-header">
    <div>
      <div class="d-flex align-items-center gap-2">
        <h6 class="mb-0 fw-bold fs-15">Modération des annonces</h6>
        <span class="ann-count-badge">{{ totalItems }}</span>
      </div>
      <p class="mb-0 fs-12 text-muted mt-1">Vérifiez, approuvez ou rejetez les publications</p>
    </div>
    <div class="d-flex align-items-center gap-2 flex-wrap">
      <div class="ann-search">
        <i class="ri-search-line ann-search-ic"></i>
        <input type="text" class="ann-search-input" placeholder="Titre, auteur, catégorie..."
               [(ngModel)]="search" (input)="onSearchChange()" />
      </div>
      <div class="ann-filter-group">
        <button [class.active]="filter===''"         (click)="setFilter('')">
          Toutes <span class="ann-filter-num">{{ statTotal }}</span>
        </button>
        <button [class.active]="filter==='pending'"  (click)="setFilter('pending')">
          En attente <span class="ann-filter-num warn">{{ statPending }}</span>
        </button>
        <button [class.active]="filter==='approved'" (click)="setFilter('approved')">
          Approuvées <span class="ann-filter-num ok">{{ statApproved }}</span>
        </button>
      </div>
      <div class="ann-view-toggle">
        <button [class.active]="viewMode==='grid'" (click)="viewMode='grid'">
          <i class="ri-grid-fill"></i>
        </button>
        <button [class.active]="viewMode==='list'" (click)="viewMode='list'">
          <i class="ri-list-unordered"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- Loading -->
  <div *ngIf="loading" class="text-center py-5">
    <div class="spinner-border text-primary"></div>
    <p class="text-muted mt-2 fs-13">Chargement des annonces...</p>
  </div>

  <!-- Empty -->
  <div *ngIf="!loading && items.length === 0" class="text-center py-5">
    <div class="avatar-xl mx-auto mb-3 rounded-circle bg-info-subtle d-flex align-items-center justify-content-center">
      <i class="ri-megaphone-line fs-1 text-info"></i>
    </div>
    <h6 class="text-muted">Aucune annonce trouvée</h6>
  </div>

  <!-- ── Vue GRILLE ── -->
  <div *ngIf="!loading && items.length > 0 && viewMode==='grid'" class="ann-grid">
    <div *ngFor="let a of items; trackBy: trackById" class="ann-grid-item">
      <div class="ann-img-wrap"
           [style.background]="'linear-gradient(160deg, ' + a.categoryColor + '30 0%, ' + a.categoryColor + '08 100%)'">
        <img *ngIf="a.image" [src]="a.image" alt="" class="ann-img" (error)="onImgError(a)"/>
        <div *ngIf="!a.image" class="ann-icon-chip" [style.background]="a.categoryColor + '26'">
          <i [class]="a.categoryIcon" [style.color]="a.categoryColor"></i>
        </div>
        <div class="ann-cat-badge" *ngIf="a.category" [style.color]="a.categoryColor">
          <i [class]="a.categoryIcon + ' me-1'"></i>{{ a.category }}
        </div>
        <div class="ann-status-badge" [class.approved]="a.active" [class.pending]="!a.active">
          <i [class]="a.active ? 'ri-checkbox-circle-fill' : 'ri-time-fill'"></i>
          {{ a.active ? 'Approuvée' : 'En attente' }}
        </div>
        <button class="ann-bookmark"><i class="ri-bookmark-line"></i></button>
      </div>
      <div class="ann-body">
        <h6 class="ann-title">{{ a.title || '—' }}</h6>
        <p class="ann-desc">{{ a.description || '—' }}</p>
        <div class="ann-meta">
          <span *ngIf="a.city"><i class="ri-map-pin-line"></i> {{ a.city }}</span>
          <span *ngIf="a.city && a.date" class="ann-meta-dot">·</span>
          <span *ngIf="a.date"><i class="ri-calendar-line"></i> {{ a.date }}</span>
          <span class="ann-meta-dot">·</span>
          <span title="Likes"><i class="ri-heart-3-fill text-danger"></i> {{ a.likeCount }}</span>
        </div>
        <div class="ann-footer-row">
          <div class="d-flex align-items-center gap-2" [class.ann-author-clickable]="a.authorId" (click)="goToAuthor(a, $event)">
            <div class="ann-author-avatar" [style.background]="a.authorColor">{{ a.authorInitials }}</div>
            <div>
              <div class="ann-author-name">{{ a.authorName || '—' }}</div>
              <div class="ann-author-role">Vendeur vérifié</div>
            </div>
          </div>
          <div class="text-end">
            <div class="ann-price-label">PRIX</div>
            <div class="ann-price">{{ a.price }} <span>TND</span></div>
          </div>
        </div>
      </div>
      <!-- Actions grille avec View + Edit -->
      <div class="ann-actions">
        <button class="ann-btn-view" (click)="viewAnnonce(a)" title="Voir le détail">
          <i class="ri-eye-line me-1"></i>Voir
        </button>
        <button class="ann-btn-edit" (click)="goToDetail(a.id)" title="Modifier">
          <i class="ri-edit-line me-1"></i>Modifier
        </button>
        <button *ngIf="!a.active" class="ann-btn-approve" (click)="approve(a)">
          <i class="ri-check-line"></i>
        </button>
        <button class="ann-btn-reject-icon" (click)="reject(a)">
          <i class="ri-close-line"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- ── Vue LISTE ── -->
  <div *ngIf="!loading && items.length > 0 && viewMode==='list'" class="table-responsive">
    <table class="table ann-list-table align-middle mb-0">
      <thead>
        <tr>
          <th class="ps-4">Annonce</th>
          <th>Catégorie</th>
          <th>Auteur</th>
          <th>Contact annonceur</th>
          <th>Prix</th>
          <th>Date</th>
          <th class="text-center">Statut</th>
          <th class="text-end pe-4">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let a of items; trackBy: trackById" class="ann-list-row">
          <td class="ps-4">
            <div class="d-flex align-items-center gap-3">
              <div class="ann-list-thumb" [style.background]="a.categoryColor+'18'">
                <img *ngIf="a.image" [src]="a.image" alt="" (error)="onImgError(a)"/>
                <i *ngIf="!a.image" [class]="a.categoryIcon" [style.color]="a.categoryColor"></i>
              </div>
              <div>
                <div class="fw-semibold fs-13">{{ a.title }}</div>
                <div class="fs-11 text-muted text-truncate" style="max-width:180px">{{ a.description }}</div>
                <div class="fs-11 text-muted d-flex align-items-center gap-1" title="Likes">
                  <i class="ri-heart-3-fill text-danger" style="font-size:10px"></i>{{ a.likeCount }}
                </div>
              </div>
            </div>
          </td>
          <td>
            <span class="ann-cat-pill" [style.color]="a.categoryColor" [style.background]="a.categoryColor+'18'">
              <i [class]="a.categoryIcon + ' me-1'"></i>{{ a.category || '—' }}
            </span>
          </td>
          <td>
            <div class="d-flex align-items-center gap-2" [class.ann-author-clickable]="a.authorId" (click)="goToAuthor(a, $event)">
              <div class="ann-author-avatar sm" [style.background]="a.authorColor">{{ a.authorInitials }}</div>
              <span class="fs-13">{{ a.authorName }}</span>
            </div>
          </td>
          <td class="fs-12">
            <div *ngIf="a.phone" class="d-flex align-items-center gap-1 text-muted">
              <i class="ri-phone-line"></i>{{ a.phone }}
            </div>
            <div *ngIf="a.email" class="d-flex align-items-center gap-1 text-muted text-truncate" style="max-width:160px">
              <i class="ri-mail-line"></i>{{ a.email }}
            </div>
            <span *ngIf="!a.phone && !a.email" class="text-muted">—</span>
          </td>
          <td class="fw-bold fs-13">{{ a.price }} TND</td>
          <td class="fs-12 text-muted">{{ a.date || '—' }}</td>
          <td class="text-center">
            <span class="ann-status-pill" [class.approved]="a.active" [class.pending]="!a.active">
              {{ a.active ? 'Approuvée' : 'En attente' }}
            </span>
          </td>
          <td class="text-end pe-4">
            <div class="d-flex gap-1 justify-content-end">
              <!-- ── Bouton VOIR ── -->
              <button class="ann-action-btn view" title="Voir le détail" (click)="viewAnnonce(a)">
                <i class="ri-eye-line"></i>
              </button>
              <!-- ── Bouton MODIFIER ── -->
              <button class="ann-action-btn edit" title="Modifier" (click)="goToDetail(a.id)">
                <i class="ri-edit-line"></i>
              </button>
              <button *ngIf="!a.active" class="ann-action-btn approve" (click)="approve(a)">
                <i class="ri-check-line"></i>
              </button>
              <button class="ann-action-btn reject" (click)="reject(a)">
                <i class="ri-close-line"></i>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  <div *ngIf="!loading && items.length > 0" class="ann-pagination">
    <div class="ann-pagination-info">
      <select class="ann-page-size" [(ngModel)]="pageSize" (change)="changePageSize()">
        <option [ngValue]="8">8</option>
        <option [ngValue]="12">12</option>
        <option [ngValue]="24">24</option>
      </select>
      par page · {{ totalItems }} annonce(s)
    </div>
    <div class="ann-pagination-controls">
      <button class="ann-page-btn" [disabled]="page === 1" (click)="goToPage(page - 1)">
        <i class="ri-arrow-left-s-line"></i>
      </button>
      <button *ngFor="let p of pageNumbers; trackBy: trackByIndex" class="ann-page-btn" [class.active]="p === page"
              (click)="goToPage(p)">{{ p }}</button>
      <button class="ann-page-btn" [disabled]="page === totalPages" (click)="goToPage(page + 1)">
        <i class="ri-arrow-right-s-line"></i>
      </button>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════
     MODAL — VOIR ANNONCE
══════════════════════════════════════════════════════════ -->
<div *ngIf="viewingAnnonce" class="ann-modal-overlay" (click)="closeView()">
  <div class="ann-modal-panel" (click)="$event.stopPropagation()">
    <!-- Header modal -->
    <div class="ann-modal-header">
      <div class="d-flex align-items-center gap-3">
        <div class="ann-modal-icon" [style.background]="viewingAnnonce.categoryColor+'22'"
             [style.color]="viewingAnnonce.categoryColor">
          <i [class]="viewingAnnonce.categoryIcon"></i>
        </div>
        <div>
          <h5 class="mb-0 fw-bold">{{ viewingAnnonce.title }}</h5>
          <span class="fs-12 text-muted">ID #{{ viewingAnnonce.id }}</span>
        </div>
      </div>
      <button class="ann-modal-close" (click)="closeView()">
        <i class="ri-close-line"></i>
      </button>
    </div>

    <!-- Image -->
    <div *ngIf="viewingAnnonce.image" class="ann-modal-img-wrap">
      <img [src]="viewingAnnonce.image" alt="" class="ann-modal-img" (error)="onImgError(viewingAnnonce)" />
    </div>
    <div *ngIf="!viewingAnnonce.image" class="ann-modal-img-placeholder"
         [style.background]="viewingAnnonce.categoryColor+'15'">
      <i [class]="viewingAnnonce.categoryIcon" [style.color]="viewingAnnonce.categoryColor"
         style="font-size:48px;opacity:.5"></i>
    </div>

    <!-- Statut -->
    <div class="d-flex align-items-center gap-2 mb-3">
      <span class="ann-status-pill" [class.approved]="viewingAnnonce.active" [class.pending]="!viewingAnnonce.active">
        <i [class]="viewingAnnonce.active ? 'ri-checkbox-circle-fill me-1' : 'ri-time-fill me-1'"></i>
        {{ viewingAnnonce.active ? 'Approuvée' : 'En attente' }}
      </span>
      <span *ngIf="viewingAnnonce.category" class="ann-cat-pill"
            [style.color]="viewingAnnonce.categoryColor"
            [style.background]="viewingAnnonce.categoryColor+'18'">
        <i [class]="viewingAnnonce.categoryIcon + ' me-1'"></i>{{ viewingAnnonce.category }}
      </span>
    </div>

    <!-- Description (aperçu court) -->
    <div class="ann-detail-section">
      <div class="ann-detail-label">Description</div>
      <p class="fs-13 text-muted mb-0" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">
        {{ viewingAnnonce.description || 'Aucune description.' }}
      </p>
    </div>

    <!-- Infos essentielles -->
    <div class="row g-3 mb-3">
      <div class="col-6">
        <div class="ann-detail-section">
          <div class="ann-detail-label">Prix</div>
          <div class="fw-bold fs-18 text-dark">{{ viewingAnnonce.price }} <span class="fs-12 text-muted">TND</span></div>
        </div>
      </div>
      <div class="col-6">
        <div class="ann-detail-section">
          <div class="ann-detail-label">Auteur</div>
          <div class="d-flex align-items-center gap-2">
            <div class="ann-author-avatar sm" [style.background]="viewingAnnonce.authorColor">
              {{ viewingAnnonce.authorInitials }}
            </div>
            <span class="fs-13 fw-medium">{{ viewingAnnonce.authorName }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="d-flex gap-2 mt-2">
      <button *ngIf="!viewingAnnonce.active" class="ann-btn-approve flex-grow-1" (click)="approve(viewingAnnonce); closeView()">
        <i class="ri-check-line me-1"></i>Approuver
      </button>
      <button *ngIf="viewingAnnonce.active" class="ann-btn-reject-full flex-grow-1" (click)="reject(viewingAnnonce); closeView()">
        <i class="ri-close-line me-1"></i>Désapprouver
      </button>
      <button class="ann-btn-edit-modal" (click)="goToDetail(viewingAnnonce.id); closeView()">
        <i class="ri-arrow-right-line me-1"></i>Voir tout / Modifier
      </button>
    </div>
  </div>
</div>
`,
  styles: [`
    /* ═════ Hero ═════ */
    .ann-hero { padding:28px 32px; background:linear-gradient(135deg,#f8f7ff 0%,#ffffff 55%,#f4f6ff 100%); border-radius:20px; box-shadow:0 1px 3px rgba(0,0,0,.04); }
    .ann-hero-title { font-size:2.1rem; font-weight:800; color:#1a1f36; margin:0 0 8px; line-height:1.2; }
    .ann-hero-accent { background:linear-gradient(135deg,#7c6ef5,#405189); -webkit-background-clip:text; background-clip:text; color:transparent; }
    .ann-hero-sub { color:#6b7280; font-size:14px; max-width:480px; margin:0; }
    .ann-hero-highlight { color:#7c6ef5; font-weight:700; }
    .ann-live-badge { display:inline-flex; align-items:center; gap:6px; background:#f0fdf4; color:#16a34a; font-size:11px; font-weight:700; padding:4px 10px; border-radius:20px; letter-spacing:.05em; }
    .ann-live-dot { width:8px; height:8px; border-radius:50%; background:#16a34a; animation:pulse 1.5s infinite; }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.3)} }
    .ann-update-text { font-size:12px; color:#9298a8; }
    .ann-btn-secondary { padding:8px 16px; border:1px solid #e9ebec; border-radius:20px; background:#fff; color:#374151; font-size:13px; cursor:pointer; transition:all .15s; }
    .ann-btn-secondary:hover { background:#f8f9ff; border-color:#405189; color:#405189; }
    .ann-btn-primary { padding:8px 18px; border:none; border-radius:20px; background:linear-gradient(135deg,#7c6ef5,#405189); color:#fff; font-size:13px; font-weight:600; cursor:pointer; transition:all .15s; display:flex; align-items:center; }
    .ann-btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(124,110,245,.4); }

    /* ═════ KPI ═════ */
    .ann-kpi { background:#fff; border-radius:16px; padding:20px; box-shadow:0 2px 12px rgba(0,0,0,.07); position:relative; overflow:hidden; transition:transform .15s,box-shadow .15s; }
    .ann-kpi:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,.12); }
    .ann-kpi-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
    .ann-kpi-icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; }
    .ann-kpi-trend { font-size:11px; font-weight:700; padding:3px 8px; border-radius:20px; }
    .ann-kpi-trend.up   { background:#dcfce7; color:#16a34a; }
    .ann-kpi-trend.warn { background:#fef9e7; color:#f7b84b; }
    .ann-kpi-label { font-size:10px; font-weight:700; letter-spacing:.06em; color:#9298a8; text-transform:uppercase; margin-bottom:4px; }
    .ann-kpi-value { font-size:28px; font-weight:800; color:#1a1f36; line-height:1; margin-bottom:4px; }
    .ann-kpi-sub { font-size:11px; color:#9298a8; margin-bottom:8px; }
    .ann-spark { width:100%; height:30px; display:block; }

    /* ═════ Card ═════ */
    .ann-card { background:#fff; border-radius:16px; box-shadow:0 2px 12px rgba(0,0,0,.07); overflow:hidden; }
    .ann-card-header { padding:20px 24px; border-bottom:1px solid #f0f0f5; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
    .ann-count-badge { background:#eef0ff; color:#405189; font-size:12px; font-weight:700; padding:2px 10px; border-radius:20px; }
    .ann-search { position:relative; }
    .ann-search-ic { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#9298a8; font-size:15px; }
    .ann-search-input { padding:8px 14px 8px 36px; border:1px solid #e9ebec; border-radius:20px; font-size:13px; outline:none; width:220px; background:#fafbff; transition:border-color .15s; }
    .ann-search-input:focus { border-color:#405189; }
    .ann-filter-group { display:flex; border:1px solid #e9ebec; border-radius:20px; overflow:hidden; background:#fafbff; }
    .ann-filter-group button { padding:7px 14px; border:none; background:transparent; cursor:pointer; font-size:12px; font-weight:500; color:#6b7280; transition:all .15s; display:flex; align-items:center; gap:6px; }
    .ann-filter-group button.active { background:#405189; color:#fff; }
    .ann-filter-num { font-size:11px; padding:1px 6px; border-radius:10px; background:rgba(255,255,255,.25); }
    .ann-filter-num.warn { background:#fef9e7; color:#f7b84b; }
    .ann-filter-num.ok   { background:#dcfce7; color:#16a34a; }
    .ann-view-toggle { display:flex; border:1px solid #e9ebec; border-radius:10px; overflow:hidden; }
    .ann-view-toggle button { width:36px; height:36px; border:none; background:transparent; cursor:pointer; color:#9298a8; transition:all .15s; display:flex; align-items:center; justify-content:center; font-size:16px; }
    .ann-view-toggle button.active { background:#405189; color:#fff; }

    /* ═════ Grille ═════ */
    .ann-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:20px; padding:20px; }
    .ann-grid-item { border-radius:14px; overflow:hidden; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.08); transition:transform .15s,box-shadow .15s; display:flex; flex-direction:column; }
    .ann-grid-item:hover { transform:translateY(-4px); box-shadow:0 8px 24px rgba(0,0,0,.14); }
    .ann-img-wrap { position:relative; height:170px; display:flex; align-items:center; justify-content:center; }
    .ann-img { width:100%; height:100%; object-fit:cover; }
    .ann-icon-chip { width:68px; height:68px; border-radius:18px; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 18px rgba(0,0,0,.06); }
    .ann-icon-chip i { font-size:30px; }
    .ann-cat-badge { position:absolute; top:10px; left:10px; background:rgba(255,255,255,.95); backdrop-filter:blur(4px); padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; display:flex; align-items:center; box-shadow:0 2px 8px rgba(0,0,0,.1); }
    .ann-status-badge { position:absolute; top:10px; right:10px; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; display:flex; align-items:center; gap:4px; }
    .ann-status-badge.approved { background:#dcfce7; color:#16a34a; }
    .ann-status-badge.pending  { background:#fef3d6; color:#d97706; }
    .ann-bookmark { position:absolute; bottom:10px; right:10px; width:32px; height:32px; border-radius:8px; border:none; background:rgba(255,255,255,.9); cursor:pointer; color:#9298a8; display:flex; align-items:center; justify-content:center; font-size:16px; transition:all .15s; }
    .ann-body { padding:16px; flex:1; }
    .ann-title { font-size:14px; font-weight:700; color:#1a1f36; margin-bottom:4px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; }
    .ann-desc  { font-size:12px; color:#6b7280; margin-bottom:10px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; min-height:32px; }
    .ann-meta  { display:flex; align-items:center; gap:8px; font-size:11px; color:#9298a8; margin-bottom:14px; }
    .ann-meta-dot { color:#d1d5db; }
    .ann-footer-row { display:flex; align-items:center; justify-content:space-between; }
    .ann-author-avatar { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; color:#fff; flex-shrink:0; }
    .ann-author-avatar.sm { width:28px; height:28px; font-size:11px; }
    .ann-author-name { font-size:13px; font-weight:600; color:#1a1f36; }
    .ann-author-clickable { cursor:pointer; }
    .ann-author-clickable:hover .ann-author-name { color:#405189; text-decoration:underline; }
    .ann-author-role { font-size:10px; color:#16a34a; }
    .ann-price-label { font-size:9px; text-transform:uppercase; letter-spacing:.06em; color:#9298a8; }
    .ann-price { font-size:18px; font-weight:800; color:#1a1f36; }
    .ann-price span { font-size:11px; color:#9298a8; font-weight:400; }

    /* Actions grille avec View + Edit */
    .ann-actions { display:flex; gap:6px; padding:12px 16px; border-top:1px solid #f0f0f5; background:#fafbff; }
    .ann-btn-view {
      flex:1; padding:8px; border:1px solid #e0d9fc; border-radius:10px;
      background:#f0effe; color:#7c6ef5; font-size:12px; font-weight:600;
      cursor:pointer; transition:all .15s; display:flex; align-items:center; justify-content:center;
    }
    .ann-btn-view:hover { background:#7c6ef5; color:#fff; }
    .ann-btn-edit {
      flex:1; padding:8px; border:1px solid #b2e0e8; border-radius:10px;
      background:#e8f4ff; color:#299cdb; font-size:12px; font-weight:600;
      cursor:pointer; transition:all .15s; display:flex; align-items:center; justify-content:center;
    }
    .ann-btn-edit:hover { background:#299cdb; color:#fff; }
    .ann-btn-approve { width:36px; height:36px; border:none; border-radius:10px; background:linear-gradient(135deg,#0ab39c,#099885); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:16px; transition:all .15s; flex-shrink:0; }
    .ann-btn-approve:hover { transform:translateY(-1px); }
    .ann-btn-reject-full { flex:1; padding:9px; border:1px solid #e9ebec; border-radius:10px; background:#fff; color:#6b7280; font-size:13px; cursor:pointer; transition:all .15s; }
    .ann-btn-reject-full:hover { border-color:#f06548; color:#f06548; }
    .ann-btn-reject-icon { width:36px; height:36px; border:1px solid #e9ebec; border-radius:10px; background:#fff; color:#9298a8; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:16px; transition:all .15s; flex-shrink:0; }
    .ann-btn-reject-icon:hover { border-color:#f06548; color:#f06548; }

    /* ═════ Vue liste ═════ */
    .ann-list-table thead th { font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:#9298a8; font-weight:700; padding:12px 10px; background:#f8f9ff; border-bottom:1px solid #eef0f5; }
    .ann-list-table td { padding:14px 10px; border-bottom:1px solid #f5f6f9; }
    .ann-list-row:hover { background:#fafbff !important; }
    .ann-list-table tbody tr:last-child td { border-bottom:none; }
    .ann-list-thumb { width:48px; height:48px; border-radius:10px; overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:20px; }
    .ann-list-thumb img { width:100%; height:100%; object-fit:cover; }
    .ann-cat-pill { padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600; }
    .ann-status-pill { padding:4px 12px; border-radius:20px; font-size:11px; font-weight:600; }
    .ann-status-pill.approved { background:#dcfce7; color:#16a34a; }
    .ann-status-pill.pending  { background:#fef9e7; color:#d97706; }
    .ann-action-btn { width:32px; height:32px; border-radius:8px; border:1px solid #e9ebec; background:#fff; cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center; transition:all .15s; }
    .ann-action-btn.view:hover   { background:#f0effe; border-color:#7c6ef5; color:#7c6ef5; }
    .ann-action-btn.edit:hover   { background:#e8f4ff; border-color:#299cdb; color:#299cdb; }
    .ann-action-btn.approve:hover { background:#dcfce7; border-color:#0ab39c; color:#0ab39c; }
    .ann-action-btn.reject:hover  { background:#fee2e2; border-color:#f06548; color:#f06548; }

    /* ═════ Pagination ═════ */
    .ann-pagination { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; padding:16px 24px; border-top:1px solid #f0f0f5; }
    .ann-pagination-info { font-size:12px; color:#9298a8; display:flex; align-items:center; gap:6px; }
    .ann-page-size { border:1px solid #e9ebec; border-radius:8px; padding:4px 8px; font-size:12px; color:#374151; background:#fafbff; }
    .ann-pagination-controls { display:flex; align-items:center; gap:4px; }
    .ann-page-btn { min-width:32px; height:32px; padding:0 8px; border:1px solid #e9ebec; border-radius:8px; background:#fff; color:#6b7280; font-size:12px; font-weight:600; cursor:pointer; transition:all .15s; display:inline-flex; align-items:center; justify-content:center; }
    .ann-page-btn:hover:not(:disabled):not(.active) { background:#f8f9ff; border-color:#405189; color:#405189; }
    .ann-page-btn.active { background:#405189; border-color:#405189; color:#fff; }
    .ann-page-btn:disabled { opacity:.4; cursor:not-allowed; }

    /* ═════ Modals ═════ */
    .ann-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:1050; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn .2s ease; }
    .ann-modal-panel { background:#fff; border-radius:20px; padding:28px; width:100%; max-width:540px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.2); animation:slideUp .25s ease; }
    @keyframes fadeIn  { from{opacity:0}         to{opacity:1} }
    @keyframes slideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }

    .ann-modal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
    .ann-modal-icon { width:46px; height:46px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; }
    .ann-modal-close { width:32px; height:32px; border-radius:50%; border:1px solid #e9ebec; background:#f8f9ff; cursor:pointer; color:#6b7280; display:flex; align-items:center; justify-content:center; font-size:16px; transition:.15s; }
    .ann-modal-close:hover { background:#fee2e2; color:#f06548; border-color:#f06548; }

    .ann-modal-img-wrap { border-radius:14px; overflow:hidden; height:200px; margin-bottom:20px; }
    .ann-modal-img { width:100%; height:100%; object-fit:cover; }
    .ann-modal-img-placeholder { height:160px; border-radius:14px; display:flex; align-items:center; justify-content:center; margin-bottom:20px; }

    .ann-detail-section { background:#f8f9ff; border-radius:12px; padding:14px 16px; }
    .ann-detail-label { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#9298a8; font-weight:700; margin-bottom:6px; }
    .ann-btn-edit-modal { padding:10px 20px; border:1px solid #b2e0e8; border-radius:12px; background:#e8f4ff; color:#299cdb; font-size:13px; font-weight:600; cursor:pointer; transition:all .15s; display:flex; align-items:center; }
    .ann-btn-edit-modal:hover { background:#299cdb; color:#fff; }

    /* ═════ Formulaire modifier ═════ */
    .ann-form { display:flex; flex-direction:column; gap:16px; }
    .ann-form-group { display:flex; flex-direction:column; gap:6px; }
    .ann-form-label { font-size:12px; font-weight:600; color:#374151; }
    .ann-form-input { width:100%; padding:10px 14px; border:1px solid #e9ebec; border-radius:12px; font-size:13px; outline:none; background:#fafbff; transition:border-color .15s; resize:vertical; }
    .ann-form-input:focus { border-color:#405189; background:#fff; }
    .ann-input-group { position:relative; }
    .ann-input-addon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#9298a8; font-size:15px; }
    .ann-status-toggle { flex:1; padding:10px; border:2px solid #e9ebec; border-radius:12px; background:#fff; font-size:13px; font-weight:600; cursor:pointer; transition:all .15s; display:flex; align-items:center; justify-content:center; color:#6b7280; }
    .ann-status-toggle.active-approve { border-color:#0ab39c; background:#edfbf8; color:#0ab39c; }
    .ann-status-toggle.active-reject  { border-color:#f7b84b; background:#fef9e7; color:#d97706; }

    /* ═════════════════════════════════════════════════
       Adaptation Dark Mode
       ═════════════════════════════════════════════════ */
    :host-context([data-bs-theme="dark"]) {
      .ann-hero {
        background: linear-gradient(135deg, var(--bs-tertiary-bg, #23262b) 0%, var(--bs-body-bg, #1a1d21) 55%, var(--bs-tertiary-bg, #23262b) 100%);
        box-shadow: 0 1px 3px rgba(0, 0, 0, .3);
      }
      .ann-hero-title  { color: var(--bs-emphasis-color, #f4f5f7); }
      .ann-hero-sub    { color: var(--bs-secondary-color, #9299a8); }
      .ann-update-text { color: var(--bs-secondary-color, #9299a8); }
      .ann-btn-secondary {
        background: var(--bs-tertiary-bg, #23262b);
        border-color: var(--bs-border-color, #32363d);
        color: var(--bs-body-color, #e9ecef);
      }
      .ann-btn-secondary:hover { background: var(--bs-secondary-bg, #2a2e35); }

      /* KPI */
      .ann-kpi { background: var(--bs-card-bg, #1e2126); box-shadow: 0 2px 12px rgba(0, 0, 0, .3); }
      .ann-kpi:hover { box-shadow: 0 8px 24px rgba(0, 0, 0, .45); }
      .ann-kpi-label, .ann-kpi-sub { color: var(--bs-secondary-color, #9299a8); }
      .ann-kpi-value { color: var(--bs-emphasis-color, #f4f5f7); }

      /* Card + toolbar */
      .ann-card { background: var(--bs-card-bg, #1e2126); box-shadow: 0 2px 12px rgba(0, 0, 0, .3); }
      .ann-card-header { border-color: var(--bs-border-color, #32363d); }
      .ann-count-badge { background: rgba(64, 81, 137, .25); color: #8fa3d9; }
      .ann-search-input, .ann-filter-group, .ann-view-toggle {
        background: var(--bs-tertiary-bg, #23262b);
        border-color: var(--bs-border-color, #32363d);
        color: var(--bs-body-color, #e9ecef);
      }
      .ann-search-input::placeholder { color: var(--bs-secondary-color, #9299a8); }
      .ann-search-ic { color: var(--bs-secondary-color, #9299a8); }
      .ann-filter-group button { color: var(--bs-secondary-color, #9299a8); }
      .ann-view-toggle button  { color: var(--bs-secondary-color, #9299a8); }

      /* Grille */
      .ann-grid-item { background: var(--bs-card-bg, #1e2126); box-shadow: 0 2px 8px rgba(0, 0, 0, .35); }
      .ann-grid-item:hover { box-shadow: 0 8px 24px rgba(0, 0, 0, .5); }
      .ann-cat-badge { background: rgba(30, 32, 42, .85); color: var(--bs-body-color, #e9ecef); }
      .ann-bookmark  { background: rgba(30, 32, 42, .85); color: var(--bs-secondary-color, #9299a8); }
      .ann-title { color: var(--bs-emphasis-color, #f4f5f7); }
      .ann-desc  { color: var(--bs-secondary-color, #9299a8); }
      .ann-meta  { color: var(--bs-secondary-color, #9299a8); }
      .ann-author-name { color: var(--bs-emphasis-color, #f4f5f7); }
      .ann-price-label { color: var(--bs-secondary-color, #9299a8); }
      .ann-price { color: var(--bs-emphasis-color, #f4f5f7); }
      .ann-price span { color: var(--bs-secondary-color, #9299a8); }
      .ann-actions { background: var(--bs-tertiary-bg, #23262b); border-color: var(--bs-border-color, #32363d); }
      .ann-btn-reject-full, .ann-btn-reject-icon {
        background: var(--bs-tertiary-bg, #23262b);
        border-color: var(--bs-border-color, #32363d);
        color: var(--bs-secondary-color, #9299a8);
      }

      /* Vue liste */
      .ann-list-table thead th { background: var(--bs-tertiary-bg, #23262b); color: var(--bs-secondary-color, #9299a8); border-color: var(--bs-border-color, #32363d); }
      .ann-list-table td { border-color: var(--bs-border-color, #32363d); color: var(--bs-body-color, #e9ecef); }
      .ann-list-row:hover { background: var(--bs-tertiary-bg, #23262b) !important; }
      .ann-action-btn { background: var(--bs-tertiary-bg, #23262b); border-color: var(--bs-border-color, #32363d); color: var(--bs-body-color, #e9ecef); }

      /* Pagination */
      .ann-pagination { border-color: var(--bs-border-color, #32363d); }
      .ann-pagination-info { color: var(--bs-secondary-color, #9299a8); }
      .ann-page-size, .ann-page-btn {
        background: var(--bs-tertiary-bg, #23262b);
        border-color: var(--bs-border-color, #32363d);
        color: var(--bs-body-color, #e9ecef);
      }

      /* Modal aperçu */
      .ann-modal-panel { background: var(--bs-card-bg, #1e2126); box-shadow: 0 20px 60px rgba(0, 0, 0, .6); }
      .ann-modal-close { background: var(--bs-tertiary-bg, #23262b); border-color: var(--bs-border-color, #32363d); color: var(--bs-body-color, #e9ecef); }
      .ann-detail-section { background: var(--bs-tertiary-bg, #23262b); }
      .ann-detail-label { color: var(--bs-secondary-color, #9299a8); }

      /* Formulaire (au cas où réutilisé ailleurs) */
      .ann-form-label { color: var(--bs-body-color, #e9ecef); }
      .ann-form-input {
        background: var(--bs-tertiary-bg, #23262b);
        border-color: var(--bs-border-color, #32363d);
        color: var(--bs-body-color, #e9ecef);
      }
      .ann-form-input:focus { background: var(--bs-tertiary-bg, #23262b); }
      .ann-status-toggle { background: var(--bs-tertiary-bg, #23262b); border-color: var(--bs-border-color, #32363d); color: var(--bs-secondary-color, #9299a8); }
    }
  `]
})
export class AnnoncesAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Annonces', active: true }];

  items:   AnnonceRow[] = [];
  search   = '';
  filter   = '';
  loading  = true;
  viewMode: 'grid' | 'list' = 'grid';
  lastUpdate = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  
  page       = 1;
  pageSize   = 8;
  totalItems = 0;
  totalPages = 1;
  statTotal    = 0;
  statApproved = 0;
  statPending  = 0;
  private searchDebounce: any = null;

  
  viewingAnnonce: AnnonceRow | null = null;

  pageNumbers: number[] = [];
  totalValue = '0';
  
  private recomputeStats(): void {
    this.pageNumbers = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    
    const sum = this.items.filter(a => a.active).reduce((s, a) => s + (parseFloat(a.price) || 0), 0);
    this.totalValue = sum >= 1000 ? (sum / 1000).toFixed(1) + 'K' : sum.toFixed(0);
  }

  trackById(_i: number, a: AnnonceRow): number { return a.id; }
  trackByIndex(_i: number, p: number): number { return p; }

  
  onImgError(a: AnnonceRow): void {
    a.imageIdx++;
    a.image = a.imageIdx < a.images.length ? a.images[a.imageIdx] : '';
  }

  private avatarColors = ['#6c5ce7','#0ab39c','#f7b84b','#f06548','#299cdb','#405189','#e91e63'];

  private categoryStyles: { match: string[]; label: string; icon: string; color: string }[] = [
    { match: ['electronique','electronics','high-tech','hightech'], label: 'Électronique', icon: 'ri-computer-line',      color: '#f06548' },
    { match: ['sport','sports'],                                     label: 'Sport',        icon: 'ri-bike-line',          color: '#0ab39c' },
    { match: ['vehicule','vehicules','voiture','voitures','auto'],   label: 'Véhicules',    icon: 'ri-car-line',           color: '#299cdb' },
    { match: ['immobilier','immeuble','appartement'],                label: 'Immobilier',   icon: 'ri-building-2-line',    color: '#405189' },
    { match: ['vetement','vetements','mode','fashion'],              label: 'Vêtements',    icon: 'ri-t-shirt-line',       color: '#e91e63' },
    { match: ['maison','deco','meuble','meubles'],                   label: 'Maison',       icon: 'ri-home-4-line',        color: '#f0965a' },
    { match: ['service','services','cours','formation'],             label: 'Services',     icon: 'ri-graduation-cap-line',color: '#8b7cf6' },
  ];
  private fallbackStyle = { icon: 'ri-megaphone-line', color: '#6c5ce7' };

  private normalize(s: string): string {
    return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  private styleForCategory(raw: string): { label: string; icon: string; color: string } {
    const key   = this.normalize(raw);
    if (!key) return { label: '', icon: this.fallbackStyle.icon, color: this.fallbackStyle.color };
    const found = this.categoryStyles.find(s => s.match.some(m => key.includes(m)));
    return found ?? { label: raw, icon: this.fallbackStyle.icon, color: this.fallbackStyle.color };
  }

  // IdCateg -> nom de catégorie (TitleFr), chargé une fois depuis /categories
  private categoryNames: Record<number, string> = {};

  
  private allImages(raw: any, id: number): string[] {
    let filenames: string[] = [];
    if (Array.isArray(raw)) {
      filenames = raw;
    } else if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) filenames = parsed;
        else if (typeof parsed === 'string' && parsed) filenames = [parsed];
      } catch {
        filenames = [raw];
      }
    }
    const urls = filenames.map(f =>
      f.includes('/')
        ? `${this.annonces.assetBaseUrl}/${f.replace(/^\/+/, '')}`
        : `${this.annonces.assetBaseUrl}/assets/ads/images/${f}`
    );
    urls.push(`${this.annonces.assetBaseUrl}/assets/ads/images/ad_${id}.jpg`);
    return urls;
  }

  constructor(private api: TijaraApiService, private categories: CategoriesService, private annonces: AnnoncesService, private router: Router) {}

  goToAuthor(a: AnnonceRow, ev?: Event): void {
    ev?.stopPropagation();
    if (!a.authorId) return;
    this.router.navigate(['/admin/vendor-detail', a.authorId]);
  }

  ngOnInit(): void {
    this.categories.getCategories({ per_page: 200 }).subscribe({
      next: (res: any) => {
        (res?.data || res || []).forEach((c: any) => {
          this.categoryNames[c.IdCateg] = c.TitleFr || c.TitleEn || '';
        });
        this.load();
      },
      error: () => this.load(), // pas bloquant si /categories échoue
    });
    this.loadStats();
  }

  private buildParams(): any {
    const params: any = { page: this.page, per_page: this.pageSize };
    if (this.search.trim()) params.search = this.search.trim();
    if (this.filter === 'approved') params.Active = 1;
    if (this.filter === 'pending')  params.Active = 0;
    return params;
  }

  private mapRow(a: any): AnnonceRow {
    const rawCat = this.categoryNames[a.IdCateg] || '';
    const style  = this.styleForCategory(rawCat);
    const name   = a.Ownerads || '—';
    const hash   = name.split('').reduce((h: number, c: string) => h + c.charCodeAt(0), 0);
    return {
      id:             a.IdAd,
      title:          a.TitleAd ?? '—',
      description:    a.DescriptionAd ?? '',
      price:          String(a.PriceAd ?? '0'),
      image:          this.allImages(a.ImageAd, a.IdAd)[0],
      images:         this.allImages(a.ImageAd, a.IdAd),
      imageIdx:       0,
      category:       style.label || rawCat,
      categoryIcon:   style.icon,
      categoryColor:  style.color,
      authorName:     name,
      authorId:       a.IdUser ? +a.IdUser : null,
      authorInitials: name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase(),
      authorColor:    this.avatarColors[hash % this.avatarColors.length],
      active:         !!a.Active,
      date:           a.DatePublication ?? null,
      city:           a.LocationAd ?? '',
      phone:          a.Telephone ?? '',
      email:          a.Email ?? '',
      likeCount:      +(a.LikeCount ?? 0),
    };
  }

  load(): void {
    this.loading = true;
    this.annonces.getAdminAnnonces(this.buildParams()).subscribe({
      next: (res: any) => {
        this.items      = (res?.data || []).map((a: any) => this.mapRow(a));
        this.totalItems = res?.total        ?? this.items.length;
        this.totalPages = res?.last_page    ?? 1;
        this.page       = res?.current_page ?? this.page;
        this.recomputeStats();
        this.loading    = false;
        this.lastUpdate = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      },
      error: () => { this.loading = false; }
    });
  }

  
  loadStats(): void {
    this.annonces.getAdminAnnonces({ per_page: 1 }).subscribe((res: any) => this.statTotal = res?.total ?? 0);
    this.annonces.getAdminAnnonces({ per_page: 1, Active: 1 }).subscribe((res: any) => this.statApproved = res?.total ?? 0);
    this.annonces.getAdminAnnonces({ per_page: 1, Active: 0 }).subscribe((res: any) => this.statPending = res?.total ?? 0);
  }

  onSearchChange(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.page = 1; this.load(); }, 400);
  }

  setFilter(f: string): void { this.filter = f; this.page = 1; this.load(); }
  goToPage(p: number): void { if (p >= 1 && p <= this.totalPages) { this.page = p; this.load(); } }
  changePageSize(): void { this.page = 1; this.load(); }

  approve(a: AnnonceRow): void {
    this.annonces.approveAnnonce(a.id).subscribe({
      next:  () => { a.active = true; this.loadStats(); },
      error: () => alert('Approbation impossible.'),
    });
  }

  reject(a: AnnonceRow): void {
    if (!confirm(`Rejeter l'annonce "${a.title}" ?`)) return;
    this.annonces.rejectAnnonce(a.id).subscribe({
      next:  () => { a.active = false; this.loadStats(); },
      error: () => alert('Action impossible.'),
    });
  }

  // ── VOIR ──────────────────────────────────────────────
  viewAnnonce(a: AnnonceRow): void  { this.viewingAnnonce = a; }
  closeView(): void                  { this.viewingAnnonce = null; }

  // ── MODIFIER : navigation vers la page dédiée ──────────
  goToDetail(id: number): void {
    this.router.navigate(['/admin/annonce-detail', id]);
  }
}