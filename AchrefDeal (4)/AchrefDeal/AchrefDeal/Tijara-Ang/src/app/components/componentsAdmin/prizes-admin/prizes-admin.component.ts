import { Component, OnInit } from '@angular/core';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { CatalogAdminService } from 'src/app/core/services/catalog-admin.service';

interface PrizeRow {
  id: number;
  title: string;
  description: string;
  image: string;
  datePrize: string;
  idUser: number | null;
  IdDeal: number | null;
  winnerName: string;
  dealTitle: string;
  vendorName: string;
  active: boolean;
}

@Component({
  selector: 'app-prizes-admin',
  standalone: false,
  template: `
<div class="prizes-page">

  <!-- Header -->
  <div class="page-header d-flex align-items-start justify-content-between mb-4">
    <div class="d-flex align-items-center gap-3">
      <div class="header-icon"><i class="ri-award-fill"></i></div>
      <div>
        <h4 class="mb-1 fw-bold">Prix &amp; Cadeaux</h4>
        <p class="text-muted mb-0 fs-13">Gérez tous vos prix et cadeaux. Créez, attribuez et suivez leur performance.</p>
      </div>
    </div>
    <div class="breadcrumb-mini fs-13 text-muted">
      Dashboard <i class="ri-arrow-right-s-line"></i> <span class="fw-semibold text-dark">Prix &amp; Cadeaux</span>
    </div>
  </div>

  <!-- KPI cards -->
  <div class="row g-3 mb-4">
    <div class="col-md-4">
      <div class="stat-card stat-purple">
        <div class="d-flex align-items-start justify-content-between">
          <div class="stat-icon"><i class="ri-gift-fill"></i></div>
          <i class="ri-more-2-fill stat-menu"></i>
        </div>
        <div class="stat-label">TOTAL PRIX</div>
        <div class="stat-value">{{ statTotal }}</div>
        <div class="stat-sub">Tous vos prix créés</div>
        <svg class="stat-spark" viewBox="0 0 100 30" preserveAspectRatio="none">
          <polyline points="0,25 15,22 30,24 45,15 60,18 75,8 100,4" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
    <div class="col-md-4">
      <div class="stat-card stat-green">
        <div class="d-flex align-items-start justify-content-between">
          <div class="stat-icon"><i class="ri-checkbox-circle-fill"></i></div>
          <i class="ri-more-2-fill stat-menu"></i>
        </div>
        <div class="stat-label">ACTIFS</div>
        <div class="stat-value">{{ activeCount }}</div>
        <div class="stat-sub">Prix actuellement actifs</div>
        <svg class="stat-spark" viewBox="0 0 100 30" preserveAspectRatio="none">
          <polyline points="0,20 15,24 30,16 45,19 60,10 75,13 100,5" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
    <div class="col-md-4">
      <div class="stat-card stat-orange">
        <div class="d-flex align-items-start justify-content-between">
          <div class="stat-icon"><i class="ri-trophy-fill"></i></div>
          <i class="ri-more-2-fill stat-menu"></i>
        </div>
        <div class="stat-label">ATTRIBUÉS</div>
        <div class="stat-value">{{ assignedCount }}</div>
        <div class="stat-sub">Prix déjà attribués</div>
        <svg class="stat-spark" viewBox="0 0 100 30" preserveAspectRatio="none">
          <polyline points="0,10 15,18 30,12 45,20 60,14 75,22 100,6" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  </div>

  <!-- List card -->
  <div class="list-card">
    <div class="list-header d-flex flex-wrap align-items-center gap-3">
      <div class="header-icon header-icon-sm"><i class="ri-award-fill"></i></div>
      <div class="flex-grow-1">
        <div class="d-flex align-items-center gap-2">
          <h6 class="mb-0 fw-bold">Liste des prix</h6>
          <span class="count-pill">{{ totalItems }}</span>
        </div>
        <p class="text-muted fs-12 mb-0">Retrouvez ici tous vos prix et cadeaux</p>
      </div>

      <div class="search-box">
        <i class="ri-search-line"></i>
        <input type="text" placeholder="Titre, description…" [(ngModel)]="search" (input)="onSearchChange()" />
      </div>

      <button class="btn-filter"><i class="ri-filter-3-line"></i> Filtres</button>
      <button class="btn-primary-solid" (click)="openAdd()"><i class="ri-add-line"></i> Nouveau prix</button>
    </div>

    <div class="list-body">
      @if (loading) {
        <div class="text-center py-5"><div class="spinner-border" style="color:#7c5cff"></div></div>
      } @else if (items.length === 0) {
        <div class="empty-state text-center py-5">
          <div class="empty-illustration mx-auto mb-3">
            <svg viewBox="0 0 200 200" width="140" height="140">
              <circle cx="40" cy="35" r="5" fill="#f9c5d1"/>
              <circle cx="165" cy="45" r="4" fill="#c4b5fd"/>
              <circle cx="30" cy="120" r="4" fill="#fde68a"/>
              <circle cx="175" cy="130" r="5" fill="#a7f3d0"/>
              <rect x="55" y="60" width="16" height="10" rx="2" fill="#c4b5fd" transform="rotate(20 55 60)"/>
              <rect x="150" y="90" width="14" height="9" rx="2" fill="#f9c5d1" transform="rotate(-15 150 90)"/>
              <g transform="translate(55,70)">
                <rect x="0" y="35" width="90" height="65" rx="8" fill="#a78bfa"/>
                <rect x="0" y="35" width="90" height="24" rx="8" fill="#8b5cf6"/>
                <rect x="38" y="0" width="14" height="100" fill="#f472b6"/>
                <path d="M45 35 C20 10, 0 15, 10 35 Z" fill="#f9a8d4"/>
                <path d="M45 35 C70 10, 90 15, 80 35 Z" fill="#f9a8d4"/>
                <rect x="0" y="55" width="90" height="8" fill="#7c3aed" opacity="0.5"/>
              </g>
            </svg>
          </div>
          <h6 class="fw-bold mb-1">Aucun prix ajouté pour le moment</h6>
          <p class="text-muted fs-13 mb-3">Commencez par créer votre premier prix ou cadeau.</p>
          <button class="btn-primary-solid mx-auto" (click)="openAdd()"><i class="ri-add-line"></i> Créer un prix</button>
        </div>
      } @else {
        <div class="row g-3 p-3">
          @for (p of items; track p.id) {
            <div class="col-md-6 col-xl-4">
              <div class="prize-card">
                <div class="position-relative">
                  @if (p.image) {
                    <img [src]="p.image" alt="" class="prize-img" (error)="p.image=''" />
                  } @else {
                    <div class="prize-img prize-img-placeholder">
                      <i class="ri-gift-fill"></i>
                    </div>
                  }
                  <div class="position-absolute top-0 end-0 m-2">
                    @if (p.active) { <span class="badge-status badge-active">Actif</span> }
                    @else { <span class="badge-status badge-inactive">Inactif</span> }
                  </div>
                </div>
                <div class="p-3">
                  <h6 class="fw-semibold text-truncate mb-1">{{ p.title || '—' }}</h6>
                  <p class="text-muted fs-12 mb-2 text-truncate">{{ p.description || '—' }}</p>
                  <div class="d-flex justify-content-between align-items-center fs-12 mb-2">
                    <span class="text-muted"><i class="ri-calendar-line"></i> {{ formatDate(p.datePrize) }}</span>
                    @if (p.idUser) {
                      <span class="count-pill count-pill-success"><i class="ri-trophy-line"></i> {{ p.winnerName || 'Attribué' }}</span>
                    } @else if (p.vendorName) {
                      <span class="count-pill" title="Vendeur du deal lié"><i class="ri-store-2-line"></i> {{ p.vendorName }}</span>
                    } @else {
                      <span class="text-muted fs-11">Disponible</span>
                    }
                  </div>
                </div>
                <div class="prize-footer d-flex gap-2 p-2">
                  <button class="btn-ghost flex-fill" (click)="openEdit(p)"><i class="ri-edit-2-line"></i> Modifier</button>
                  @if (p.IdDeal && !p.idUser) {
                    <button class="btn-ghost" (click)="drawWinner(p)" [disabled]="drawingId === p.id" title="Tirage au sort">
                      @if (drawingId === p.id) {
                        <span class="spinner-border spinner-border-sm"></span>
                      } @else {
                        <i class="ri-shuffle-line"></i>
                      }
                    </button>
                  }
                  <button class="btn-ghost" (click)="toggleActive(p)" [title]="p.active ? 'Désactiver' : 'Activer'">
                    <i [class]="p.active ? 'ri-pause-circle-line' : 'ri-play-circle-line'"></i>
                  </button>
                  <button class="btn-ghost btn-ghost-danger" (click)="remove(p)" title="Supprimer">
                    <i class="ri-delete-bin-line"></i>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Pagination numérique : la page demandée est envoyée au backend -->
    @if (!loading && items.length > 0) {
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-top">
        <span class="fs-12 text-muted">Page {{ currentPage }} / {{ lastPage }} — {{ totalItems }} prix</span>
        <nav>
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" [class.disabled]="currentPage <= 1">
              <button class="page-link" (click)="goToPage(currentPage - 1)"><i class="ri-arrow-left-s-line"></i></button>
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
              <button class="page-link" (click)="goToPage(currentPage + 1)"><i class="ri-arrow-right-s-line"></i></button>
            </li>
          </ul>
        </nav>
      </div>
    }
  </div>
</div>

@if (showForm) {
  <div class="modal fade show d-block" tabindex="-1" style="background:rgba(15,10,35,.45)" (click)="cancel($event)">
    <div class="modal-dialog modal-lg modal-dialog-centered" (click)="$event.stopPropagation()">
      <div class="modal-content border-0 shadow-lg prize-modal">
        <div class="modal-header">
          <h5 class="modal-title fw-bold">
            <i class="ri-gift-fill me-2" style="color:#8b5cf6"></i>{{ editingId ? 'Modifier le prix' : 'Nouveau prix' }}
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
              <input class="form-control form-control-sm" [(ngModel)]="form.title" placeholder="Ex : iPhone 15 Pro" />
            </div>
            <div class="col-md-4">
              <label class="form-label fs-12 fw-semibold">Date du prix</label>
              <input type="date" class="form-control form-control-sm" [(ngModel)]="form.datePrize" />
            </div>
            <div class="col-12">
              <label class="form-label fs-12 fw-semibold">Description</label>
              <textarea class="form-control form-control-sm" rows="2" [(ngModel)]="form.description"></textarea>
            </div>
            <div class="col-md-9">
              <label class="form-label fs-12 fw-semibold">Image</label>
              <input type="file" accept="image/*" class="form-control form-control-sm" (change)="onImageSelected($event)" />
              <div class="form-text fs-11">Fichier image — laisser vide pour conserver l'image actuelle.</div>
            </div>
            <div class="col-md-3 d-flex align-items-end">
              @if (imagePreview) {
                <img [src]="imagePreview" alt="" class="rounded" width="60" height="60" style="object-fit:cover" />
              }
            </div>
            <div class="col-md-6">
              <label class="form-label fs-12 fw-semibold">Deal lié *</label>
              <select class="form-select form-select-sm" [(ngModel)]="form.IdDeal">
                <option [ngValue]="null">— Choisir un deal —</option>
                @for (d of deals; track d.id) {
                  <option [ngValue]="d.id">{{ d.label }}</option>
                }
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label fs-12 fw-semibold">Gagnant (optionnel)</label>
              <input type="text" class="form-control form-control-sm mb-1" placeholder="Rechercher un utilisateur…"
                     [(ngModel)]="userSearch" (input)="onUserSearchChange()" />
              <select class="form-select form-select-sm" [(ngModel)]="form.idUser">
                <option [ngValue]="null">— Aucun gagnant —</option>
                @for (u of users; track u.id) {
                  <option [ngValue]="u.id">{{ u.label }}</option>
                }
              </select>
              @if (usersTruncated) {
                <div class="form-text fs-11 text-warning">
                  <i class="ri-error-warning-line"></i> Liste limitée à {{ users.length }} résultats — affinez la recherche si besoin.
                </div>
              }
            </div>
            <div class="col-md-6 d-flex align-items-end">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="prize-active" [(ngModel)]="form.active" />
                <label class="form-check-label fs-13" for="prize-active">Actif</label>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" (click)="cancel()" [disabled]="saving">Annuler</button>
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
    .prizes-page { font-family: inherit; }

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
      position:relative; overflow:hidden; border-radius:18px; padding:20px;
      box-shadow: 0 2px 10px rgba(20,10,50,.05);
      border: 1px solid rgba(0,0,0,.03);
    }
    .stat-purple { background: linear-gradient(135deg,#faf9ff,#f1edff); }
    .stat-green  { background: linear-gradient(135deg,#f6fdf9,#e9f9ef); }
    .stat-orange { background: linear-gradient(135deg,#fffaf5,#fff1e3); }

    .stat-icon {
      width:44px; height:44px; border-radius:12px;
      display:flex; align-items:center; justify-content:center; font-size:20px;
      background: rgba(255,255,255,.7);
    }
    .stat-purple .stat-icon { color:#8b5cf6; }
    .stat-green  .stat-icon { color:#16a34a; }
    .stat-orange .stat-icon { color:#f97316; }

    .stat-menu { color:#c9c3db; font-size:18px; }
    .stat-label { font-size:11px; font-weight:700; letter-spacing:.06em; color:#9a93b3; margin-top:14px; }
    .stat-purple .stat-label { color:#8b7cd8; }
    .stat-green  .stat-label { color:#4f9d72; }
    .stat-orange .stat-label { color:#d98a4a; }
    .stat-value { font-size:28px; font-weight:800; margin-top:2px; }
    .stat-purple .stat-value { color:#7c3aed; }
    .stat-green  .stat-value { color:#16a34a; }
    .stat-orange .stat-value { color:#f97316; }
    .stat-sub { font-size:12px; color:#9a93b3; margin-top:2px; }
    .stat-spark { width:100%; height:26px; margin-top:8px; }

    /* List card */
    .list-card { background:#fff; border-radius:18px; box-shadow: 0 2px 10px rgba(20,10,50,.05); border:1px solid rgba(0,0,0,.03); }
    .list-header { padding:18px 20px; border-bottom:1px solid #f1eefc; }
    .count-pill { background:#f1edff; color:#7c3aed; font-size:12px; font-weight:700; padding:2px 10px; border-radius:999px; }
    .count-pill-success { background:#e9f9ef; color:#16a34a; padding:2px 8px; border-radius:999px; font-size:11px; }

    .search-box {
      display:flex; align-items:center; gap:6px; background:#f7f6fb; border:1px solid #eeebf7;
      border-radius:10px; padding:6px 12px; min-width:220px; color:#a8a2bf; font-size:13px;
    }
    .search-box input { border:none; background:transparent; outline:none; font-size:13px; width:100%; color:#333; }

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

    .list-body { min-height: 260px; }

    /* Empty state */
    .empty-illustration { width:140px; height:140px; }

    /* Prize cards (filled state) */
    .prize-card { background:#fff; border:1px solid #f1eefc; border-radius:16px; overflow:hidden; box-shadow:0 2px 8px rgba(20,10,50,.04); height:100%; display:flex; flex-direction:column; }
    .prize-img { height:150px; width:100%; object-fit:cover; }
    .prize-img-placeholder { display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#f1edff,#ede9fe); color:#8b5cf6; font-size:40px; }
    .badge-status { font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px; }
    .badge-active { background:#e9f9ef; color:#16a34a; }
    .badge-inactive { background:#f1eefc; color:#9a93b3; }
    .prize-footer { border-top:1px solid #f5f3fb; margin-top:auto; }
    .btn-ghost { background:#f7f6fb; border:none; border-radius:8px; padding:7px 10px; font-size:12px; font-weight:600; color:#6b6483; display:flex; align-items:center; justify-content:center; gap:4px; }
    .btn-ghost-danger { color:#ef4444; }

    .prize-modal .modal-header { background:#faf9ff; border-bottom:1px solid #f1eefc; }

   
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
      .stat-purple { background: linear-gradient(135deg, var(--bs-card-bg), rgba(139,92,246,.08)); }
      .stat-green  { background: linear-gradient(135deg, var(--bs-card-bg), rgba(22,163,74,.08)); }
      .stat-orange { background: linear-gradient(135deg, var(--bs-card-bg), rgba(249,115,22,.08)); }

      .stat-icon { background: rgba(255,255,255,.06); }
      .stat-purple .stat-icon { color:#a78bfa; }
      .stat-green  .stat-icon { color:#34d399; }
      .stat-orange .stat-icon { color:#fb923c; }

      .stat-menu { color: var(--bs-secondary-color); }
      .stat-label { color: var(--bs-secondary-color); }
      .stat-purple .stat-label { color:#a78bfa; }
      .stat-green  .stat-label { color:#34d399; }
      .stat-orange .stat-label { color:#fb923c; }
      .stat-value { color: var(--bs-emphasis-color); }
      .stat-purple .stat-value { color:#a78bfa; }
      .stat-green  .stat-value { color:#34d399; }
      .stat-orange .stat-value { color:#fb923c; }
      .stat-sub { color: var(--bs-secondary-color); }

      /* Carte liste */
      .list-card { background: var(--bs-card-bg); border-color: var(--bs-border-color); box-shadow: 0 2px 12px rgba(0,0,0,.35); }
      .list-header { border-color: var(--bs-border-color); }
      .header-icon-sm { background: rgba(139,92,246,.18); color:#a78bfa; }
      .count-pill { background: rgba(139,92,246,.18); color:#a78bfa; }
      .count-pill-success { background: rgba(22,163,74,.18); color:#34d399; }

      .search-box { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); color: var(--bs-secondary-color); }
      .search-box input { color: var(--bs-body-color); }
      .search-box input::placeholder { color: var(--bs-secondary-color); }

      .btn-filter { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); color: var(--bs-body-color); }
      .btn-filter:hover { background: var(--bs-secondary-bg); }

      /* Cartes prix (état rempli) */
      .prize-card { background: var(--bs-card-bg); border-color: var(--bs-border-color); box-shadow: 0 2px 8px rgba(0,0,0,.3); }
      .prize-img-placeholder { background: linear-gradient(135deg, rgba(139,92,246,.15), rgba(139,92,246,.08)); color:#a78bfa; }
      .badge-active { background: rgba(22,163,74,.18); color:#34d399; }
      .badge-inactive { background: var(--bs-tertiary-bg); color: var(--bs-secondary-color); }
      .prize-footer { border-color: var(--bs-border-color); }
      .btn-ghost { background: var(--bs-tertiary-bg); color: var(--bs-body-color); }
      .btn-ghost:hover { background: var(--bs-secondary-bg); }
      .btn-ghost-danger { color:#f87171; }

      /* Modal */
      .prize-modal { background: var(--bs-card-bg); }
      .prize-modal .modal-header { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); }
      .prize-modal .modal-footer { border-color: var(--bs-border-color); }
      .form-control, .form-select {
        background-color: var(--bs-tertiary-bg);
        border-color: var(--bs-border-color);
        color: var(--bs-body-color);
      }
      .form-control::placeholder { color: var(--bs-secondary-color); }
      .form-control:focus, .form-select:focus { background-color: var(--bs-tertiary-bg); }

      /* Illustration état vide : légèrement adoucie sur fond sombre */
      .empty-illustration { opacity: .92; }
      .empty-state .text-muted { color: var(--bs-secondary-color) !important; }
    }
  `],
})
export class PrizesAdminComponent implements OnInit {
  items: PrizeRow[]    = [];
  search = '';
  loading = true;

  showForm = false;
  saving   = false;
  saveError = '';
  editingId: number | null = null;
  form = { title: '', description: '', image: '', datePrize: '', idUser: null as number | null, IdDeal: null as number | null, active: true };
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  private existingImage: string | null = null;

  // Liste des utilisateurs pour le select "Gagnant" (remplace l'ancien
  // champ "ID utilisateur" en texte libre — plus lisible et sans risque
  // de faute de frappe sur un ID).
  users: { id: number; label: string }[] = [];
  usersTruncated = false;
  userSearch = '';
  private userSearchDebounce: any = null;

  deals: { id: number; label: string }[] = [];

  activeCount = 0;
  assignedCount = 0;
  statTotal = 0;

  currentPage = 1;
  perPage     = 12;
  totalItems  = 0;
  lastPage    = 1;
  private searchDebounce: any = null;

  constructor(private api: TijaraApiService, private catalogAdmin: CatalogAdminService) {}

  ngOnInit(): void { this.load(); this.loadStats(); this.loadUsers(); this.loadDeals(); }

  loadDeals(): void {
    this.catalogAdmin.adminList('deals', { per_page: 50 }).subscribe({
      next: (res: any) => {
        const rows: any[] = res?.data ?? res ?? [];
        this.deals = rows.map((d: any) => ({
          id: d.IdDeal,
          label: d.titleDeal || `Deal #${d.IdDeal}`,
        }));
      },
      error: () => { this.deals = []; }
    });
  }

  private buildParams(): any {
    const params: any = { page: this.currentPage, per_page: this.perPage };
    if (this.search.trim()) params.search = this.search.trim();
    return params;
  }

  load(): void {
    this.loading = true;
    this.catalogAdmin.adminList('prizes', this.buildParams()).subscribe({
      next: (res: any) => {
        this.items       = this.mapPrizes(res?.data || []);
        this.totalItems  = res?.total        ?? this.items.length;
        this.lastPage    = res?.last_page    ?? 1;
        this.currentPage = res?.current_page ?? this.currentPage;
        this.loading = false;
      },
      error: () => { this.loading = false; alert('Chargement impossible.'); }
    });
  }

  // Les KPI (Actifs / Attribués) portent sur l'ensemble des prix, pas
  // seulement la page affichée. Le backend plafonne per_page à 50
  // (MAX_PER_PAGE côté PrizesController) donc on boucle sur les pages
  // pour calculer les totaux côté client, plafonné à 20 pages (1000 prix).
  loadStats(): void {
    this.catalogAdmin.adminList('prizes', { per_page: 1 }).subscribe((res: any) => this.statTotal = res?.total ?? 0);
    this.fetchAllForStats(1, []);
  }

  private fetchAllForStats(page: number, acc: any[]): void {
    this.catalogAdmin.adminList('prizes', { per_page: 50, page }).subscribe({
      next: (res: any) => {
        const merged = acc.concat(res?.data || []);
        const current = Number(res?.current_page ?? page);
        const last = Number(res?.last_page ?? current);
        if (current < last && current < 20) {
          this.fetchAllForStats(current + 1, merged);
        } else {
          const mapped = this.mapPrizes(merged);
          this.recomputeStats(mapped);
        }
      },
      error: () => { /* KPI secondaires : on échoue silencieusement */ }
    });
  }

  private mapPrizes(data: any[]): PrizeRow[] {
    return (data || []).map((p: any) => {
      const u = p.user ?? null;
      const d = p.deal ?? null;
      return {
        id:        +(p.idPrize ?? p.id ?? 0),
        title:      p.title       ?? p.Title       ?? '',
        description:p.description ?? p.Description ?? '',
        image:      p.image_url   ?? p.image        ?? p.Image ?? '',
        datePrize:  this.toDateInput(p.datePublication),
        idUser:    (p.idUser      ?? p.id_user     ?? null) as number | null,
        IdDeal:    (p.IdDeal      ?? null) as number | null,
        winnerName: u ? `${u.FirstName || ''} ${u.LastName || ''}`.trim() || u.Username || '' : '',
        dealTitle:  d ? (d.titleDeal || `Deal #${d.IdDeal}`) : '',
        // Vendeur = propriétaire du deal lié (deal.iduser, chargé côté
        // backend). Sans ça la carte n'affichait jamais le vendeur.
        vendorName: d?.iduser
          ? (`${d.iduser.FirstName || ''} ${d.iduser.LastName || ''}`.trim() || d.iduser.Username || '')
          : '',
        active:   !!(p.active     ?? p.Active     ?? true),
      };
    });
  }

  private recomputeStats(all: PrizeRow[]): void {
    this.activeCount   = all.filter(p => p.active).length;
    this.assignedCount = all.filter(p => !!p.idUser).length;
  }

  // Peuple le select "Gagnant" du formulaire. Plafonné à 50 côté backend
  // (MAX_PER_PAGE sur UsersController) — d'où le champ de recherche pour
  // affiner si le compte cherché n'apparaît pas dans les 50 premiers.
  loadUsers(term = ''): void {
    const params: any = { per_page: 50 };
    if (term.trim()) params.search = term.trim();
    this.catalogAdmin.adminList('users', params).subscribe({
      next: (res: any) => {
        const rows: any[] = res?.data ?? res ?? [];
        this.users = rows.map((u: any) => ({
          id: u.IdUser,
          label: `${u.FirstName || ''} ${u.LastName || ''}`.trim() || u.Username || `#${u.IdUser}`,
        }));
        this.usersTruncated = (res?.total ?? rows.length) > rows.length;
      },
      error: () => { this.users = []; }
    });
  }
  onUserSearchChange(): void {
    if (this.userSearchDebounce) clearTimeout(this.userSearchDebounce);
    this.userSearchDebounce = setTimeout(() => this.loadUsers(this.userSearch), 350);
  }

  onSearchChange(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.currentPage = 1; this.load(); }, 400);
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

  openAdd(): void {
    this.editingId = null; this.saveError = '';
    this.form = { title: '', description: '', image: '', datePrize: '', idUser: null, IdDeal: null, active: true };
    this.selectedFile = null; this.imagePreview = null; this.existingImage = null;
    this.userSearch = ''; this.loadUsers(); this.loadDeals();
    this.showForm = true;
  }
  openEdit(p: PrizeRow): void {
    this.editingId = p.id; this.saveError = '';
    this.form = { title: p.title, description: p.description, image: p.image, datePrize: p.datePrize, idUser: p.idUser, IdDeal: p.IdDeal, active: p.active };
    this.selectedFile = null; this.imagePreview = p.image || null; this.existingImage = p.image || null;
    this.userSearch = ''; this.loadUsers(); this.loadDeals();
    this.showForm = true;
  }
  cancel(_ev?: Event): void { this.showForm = false; this.saving = false; this.saveError = ''; }

  onImageSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.selectedFile = file;
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { this.imagePreview = reader.result as string; };
      reader.readAsDataURL(file);
    } else {
      this.imagePreview = this.existingImage;
    }
  }

  save(): void {
    if (!this.form.title.trim()) { this.saveError = 'Le titre est requis.'; return; }
    if (!this.editingId && this.form.IdDeal == null) { this.saveError = 'Le deal lié est requis.'; return; }
    this.saving = true; this.saveError = '';

    const fd = new FormData();
    fd.append('title', this.form.title);
    fd.append('description', this.form.description || '');
    fd.append('datePublication', this.form.datePrize || '');
    if (this.form.idUser != null) fd.append('idUser', String(this.form.idUser));
    if (this.form.IdDeal != null) fd.append('IdDeal', String(this.form.IdDeal));
    if (!this.editingId) fd.append('active', this.form.active ? '1' : '0');
    if (this.selectedFile) fd.append('image', this.selectedFile);

    const op = this.editingId
      ? this.catalogAdmin.adminUpdateMultipart('prizes', this.editingId, fd)
      : this.catalogAdmin.adminCreateMultipart('prizes', fd);
    op.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); this.loadStats(); },
      error: (err: any) => { this.saving = false; this.saveError = err?.error?.message || 'Erreur d\'enregistrement.'; },
    });
  }

  
  toggleActive(p: PrizeRow): void {
    this.catalogAdmin.adminPatch(`prizes/${p.id}/activate`, { active: !p.active }).subscribe({
      next: () => { p.active = !p.active; this.loadStats(); },
      error: () => alert('Action impossible.'),
    });
  }

  drawingId: number | null = null;
  drawWinner(p: PrizeRow): void {
    if (!confirm(`Lancer le tirage au sort pour "${p.title}" parmi tous les acheteurs du deal lié ?`)) return;
    this.drawingId = p.id;
    // Le tirage au sort a été déplacé côté backend : ce n'est plus
    // POST /prizes/{id}/draw (supprimé — il tirait au sort n'importe quel
    // utilisateur, pas forcément un acheteur du deal), mais POST /winners
    // avec juste { IdPrize }. Le backend choisit lui-même le gagnant
    // aléatoirement parmi les vrais acheteurs du deal lié (Orders.IdDeal).
    this.catalogAdmin.adminCreate(`winners`, { IdPrize: p.id }).subscribe({
      next: (res: any) => {
        this.drawingId = null;
        const winner = res?.data?.user;
        const name = winner
          ? `${winner.FirstName || ''} ${winner.LastName || ''}`.trim() || winner.Username
          : 'un acheteur';
        const pool = res?.eligible_pool != null ? ` (parmi ${res.eligible_pool} acheteur(s) éligible(s))` : '';
        alert(`Gagnant tiré au sort : ${name}${pool}`);
        this.load();
        this.loadStats();
      },
      error: (err: any) => {
        this.drawingId = null;
        alert(err?.error?.message || 'Tirage au sort impossible.');
      },
    });
  }

  remove(p: PrizeRow): void {
    if (!confirm(`Supprimer le prix "${p.title}" ?`)) return;
    this.catalogAdmin.adminDelete('prizes', p.id).subscribe({
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