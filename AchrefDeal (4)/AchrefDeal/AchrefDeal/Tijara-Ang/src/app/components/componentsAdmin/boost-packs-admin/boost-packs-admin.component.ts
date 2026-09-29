import { Component, OnInit } from '@angular/core';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { CatalogAdminService } from 'src/app/core/services/catalog-admin.service';

interface BoostPackRow {
  id: number;
  title: string;
  price: number;
  discount: number;
  maxDuration: number;
  ordersCount: number;
  sliders: boolean;
  sideBar: boolean;
  footer: boolean;
  relatedPost: boolean;
  firstLogin: boolean;
  links: boolean;
  active: boolean;
}

@Component({
  selector: 'app-boost-packs-admin',
  standalone: false,
  template: `
<!-- ═════ Header ═════ -->
<div class="bst-header mb-4">
  <div class="d-flex align-items-center gap-3">
    <span class="bst-header-icon"><i class="ri-rocket-2-fill"></i></span>
    <div>
      <h1 class="bst-header-title">Packs Boost Ads</h1>
      <p class="bst-header-sub">Gérez et suivez les performances de vos packs boost.</p>
    </div>
  </div>
  <span class="bst-breadcrumb">Dashboard <i class="ri-arrow-right-s-line"></i> Packs Boost</span>
</div>

<!-- ═════ KPI Cards ═════ -->
<div class="row g-3 mb-4">
  <div class="col-md-3">
    <div class="bst-kpi red">
      <div class="bst-kpi-top">
        <span class="bst-kpi-icon"><i class="ri-rocket-2-fill"></i></span>
        <button class="bst-kpi-menu" type="button"><i class="ri-more-2-fill"></i></button>
      </div>
      <div class="bst-kpi-label">TOTAL PACKS</div>
      <div class="bst-kpi-value">{{ statTotal }}</div>
      <div class="bst-kpi-sub">Tous les packs créés</div>
      <svg class="bst-spark" viewBox="0 0 80 24" preserveAspectRatio="none">
        <polyline points="0,20 15,16 30,18 45,10 60,14 80,4" fill="none" stroke="#f06548" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>

  <div class="col-md-3">
    <div class="bst-kpi green">
      <div class="bst-kpi-top">
        <span class="bst-kpi-icon"><i class="ri-checkbox-circle-fill"></i></span>
        <button class="bst-kpi-menu" type="button"><i class="ri-more-2-fill"></i></button>
      </div>
      <div class="bst-kpi-label">ACTIFS</div>
      <div class="bst-kpi-value">{{ activeCount }}</div>
      <div class="bst-kpi-sub">Packs actuellement actifs</div>
      <svg class="bst-spark" viewBox="0 0 80 24" preserveAspectRatio="none">
        <polyline points="0,20 15,16 30,18 45,10 60,14 80,4" fill="none" stroke="#0ab39c" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>

  <div class="col-md-3">
    <div class="bst-kpi orange">
      <div class="bst-kpi-top">
        <span class="bst-kpi-icon"><i class="ri-money-dollar-circle-fill"></i></span>
        <button class="bst-kpi-menu" type="button"><i class="ri-more-2-fill"></i></button>
      </div>
      <div class="bst-kpi-label">PRIX MOYEN (TND)</div>
      <div class="bst-kpi-value">{{ avgPrice | number:'1.0-0' }}</div>
      <div class="bst-kpi-sub">Prix moyen des packs</div>
      <svg class="bst-spark" viewBox="0 0 80 24" preserveAspectRatio="none">
        <polyline points="0,18 15,20 30,12 45,16 60,10 80,14" fill="none" stroke="#f7b84b" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>

  <div class="col-md-3">
    <div class="bst-kpi blue">
      <div class="bst-kpi-top">
        <span class="bst-kpi-icon"><i class="ri-percent-fill"></i></span>
        <button class="bst-kpi-menu" type="button"><i class="ri-more-2-fill"></i></button>
      </div>
      <div class="bst-kpi-label">AVEC REMISE</div>
      <div class="bst-kpi-value">{{ withDiscountCount }}</div>
      <div class="bst-kpi-sub">Packs avec remise</div>
      <svg class="bst-spark" viewBox="0 0 80 24" preserveAspectRatio="none">
        <polyline points="0,20 15,17 30,19 45,11 60,13 80,6" fill="none" stroke="#299cdb" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>
</div>

<!-- ═════ Packs disponibles ═════ -->
<div class="bst-card">
  <div class="bst-list-header">
    <div class="d-flex align-items-center gap-3">
      <span class="bst-list-icon"><i class="ri-rocket-2-fill"></i></span>
      <div>
        <div class="d-flex align-items-center gap-2">
          <h6 class="bst-list-title mb-0">Packs disponibles</h6>
          <span class="bst-count-badge">{{ totalItems }}</span>
        </div>
        <p class="bst-list-sub mb-0">Retrouvez ici tous vos packs boost.</p>
      </div>
    </div>

    <div class="d-flex align-items-center gap-2 flex-wrap">
      <div class="bst-search">
        <i class="ri-search-line bst-search-ic"></i>
        <input type="text" class="bst-search-input" placeholder="Nom du pack…"
               [(ngModel)]="search" (input)="onSearchChange()" />
      </div>
      <button class="bst-filter-btn" type="button"><i class="ri-equalizer-3-line me-1"></i>Filtres</button>
      <button class="bst-btn-primary" (click)="openAdd()">
        <i class="ri-add-line me-1"></i>Nouveau pack
      </button>
    </div>
  </div>

  <div class="bst-list-body">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border" style="color:#7c3aed"></div></div>
    } @else if (items.length === 0) {
      <div class="bst-empty">
        <svg class="bst-rocket-deco" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="60" fill="#f4f1ff"/>
          <circle cx="24" cy="30" r="2.2" fill="#c9b8fb"/>
          <circle cx="118" cy="38" r="1.8" fill="#c9b8fb"/>
          <circle cx="108" cy="106" r="2" fill="#f7b84b"/>
          <circle cx="28" cy="104" r="1.6" fill="#f7b84b"/>
          <path d="M62 32 q8 -10 16 0 l3 34 q-11 8 -22 0 Z" fill="#e6dbfe" stroke="#8b6cf0" stroke-width="2"/>
          <circle cx="70" cy="46" r="6" fill="#fff" stroke="#8b6cf0" stroke-width="2"/>
          <path d="M62 60 l-12 16 10 -3 Z" fill="#8b6cf0"/>
          <path d="M78 60 l12 16 -10 -3 Z" fill="#8b6cf0"/>
          <path d="M65 66 l2 18 6 -18 Z" fill="#f7924a"/>
          <path d="M75 66 l-2 18 -6 -18 Z" fill="#f7b84b"/>
        </svg>
        <h6 class="bst-empty-title">Aucun pack disponible</h6>
        <p class="bst-empty-sub">Vous n'avez encore créé aucun pack boost.</p>
        <div class="d-flex align-items-center justify-content-center gap-2">
          <button class="bst-btn-primary" (click)="openAdd()"><i class="ri-add-line me-1"></i>Créer le premier pack</button>
          <svg class="bst-arrow-deco" viewBox="0 0 40 30">
            <path d="M2 4 C10 4 8 24 20 24 C28 24 26 14 34 12" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round"/>
            <path d="M29 8 L35 12 L30 18" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    } @else {
      <div class="row g-3 p-3">
        @for (p of items; track p.id) {
          <div class="col-md-6 col-xl-4">
            <div class="bst-pack-card" [style.opacity]="p.active ? 1 : 0.65">
              <div class="bst-pack-header">
                <h6 class="bst-pack-title"><i class="ri-rocket-2-fill me-1"></i>{{ p.title }}</h6>
                @if (p.active) { <span class="bst-pill bst-pill-success">Actif</span> }
                @else { <span class="bst-pill bst-pill-muted">Inactif</span> }
              </div>
              <div class="bst-pack-body">
                <div class="d-flex align-items-baseline gap-2 mb-3">
                  <h2 class="bst-pack-price">{{ p.price | number:'1.0-2' }}</h2>
                  <span class="bst-pack-currency">TND</span>
                  @if (p.discount > 0) {
                    <span class="bst-pill bst-pill-danger ms-auto">-{{ p.discount }}%</span>
                  }
                </div>
                <div class="d-flex align-items-center gap-2 mb-3 fs-12 bst-pack-meta">
                  <i class="ri-time-line"></i>
                  <span>Jusqu'à <strong>{{ p.maxDuration }}</strong> jours</span>
                  @if (p.ordersCount > 0) {
                    <span class="ms-auto bst-pill bst-pill-info">{{ p.ordersCount }} cmd</span>
                  }
                </div>
                <ul class="bst-pack-features">
                  @if (p.sliders)     { <li><i class="ri-check-line"></i> Slider accueil</li> }
                  @if (p.sideBar)     { <li><i class="ri-check-line"></i> Sidebar</li> }
                  @if (p.footer)      { <li><i class="ri-check-line"></i> Footer</li> }
                  @if (p.relatedPost) { <li><i class="ri-check-line"></i> Posts similaires</li> }
                  @if (p.firstLogin)  { <li><i class="ri-check-line"></i> Box 1ère connexion</li> }
                  @if (p.links)       { <li><i class="ri-check-line"></i> Liens ajoutés</li> }
                </ul>
              </div>
              <div class="bst-pack-footer">
                <button class="bst-footer-btn flex-fill" (click)="openEdit(p)">
                  <i class="ri-edit-2-line"></i> Modifier
                </button>
                <button class="bst-footer-btn" (click)="toggleActive(p)" [title]="p.active ? 'Désactiver' : 'Activer'">
                  <i [class]="p.active ? 'ri-pause-circle-line' : 'ri-play-circle-line'"></i>
                </button>
                <button class="bst-footer-btn danger" (click)="remove(p)" title="Supprimer">
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
      <span class="fs-12 text-muted">Page {{ currentPage }} / {{ lastPage }} — {{ totalItems }} pack(s)</span>
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

<!-- ═════ Modal Ajout / Édition ═════ -->
@if (showForm) {
  <div class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,.5)" (click)="cancel($event)">
    <div class="modal-dialog modal-lg modal-dialog-centered" (click)="$event.stopPropagation()">
      <div class="modal-content border-0 shadow-lg bst-modal">
        <div class="modal-header bst-modal-header">
          <h5 class="modal-title fw-bold">
            <i class="ri-rocket-2-fill me-2"></i>{{ editingId ? 'Modifier le pack' : 'Nouveau pack Boost' }}
          </h5>
          <button type="button" class="btn-close" (click)="cancel()"></button>
        </div>
        <div class="modal-body">
          @if (saveError) {
            <div class="alert alert-danger fs-13"><i class="ri-error-warning-line me-2"></i>{{ saveError }}</div>
          }
          <div class="row g-3">
            <div class="col-md-8">
              <label class="form-label fs-12 fw-semibold">Nom du pack *</label>
              <input class="form-control form-control-sm" [(ngModel)]="form.title" placeholder="Ex : Pack Premium" />
            </div>
            <div class="col-md-4">
              <label class="form-label fs-12 fw-semibold">Durée max (jours)</label>
              <input type="number" min="1" max="366" class="form-control form-control-sm" [(ngModel)]="form.maxDuration" />
            </div>
            <div class="col-md-4">
              <label class="form-label fs-12 fw-semibold">Prix (TND) *</label>
              <input type="number" min="0" step="0.01" class="form-control form-control-sm" [(ngModel)]="form.price" />
            </div>
            <div class="col-md-4">
              <label class="form-label fs-12 fw-semibold">Remise (%)</label>
              <input type="number" min="0" max="100" step="0.01" class="form-control form-control-sm" [(ngModel)]="form.discount" />
            </div>
            <div class="col-md-4">
              <label class="form-label fs-12 fw-semibold">Nombre de commandes</label>
              <input type="number" min="0" class="form-control form-control-sm" [(ngModel)]="form.ordersCount" />
            </div>
            <div class="col-12">
              <hr class="my-2" />
              <h6 class="fs-13 fw-bold mb-2" style="color:#7c3aed"><i class="ri-bullseye-line me-1"></i>Emplacements de l'annonce</h6>
            </div>
            <div class="col-md-4">
              <div class="form-check"><input class="form-check-input" type="checkbox" id="bp-sl" [(ngModel)]="form.sliders" />
                <label class="form-check-label fs-13" for="bp-sl">Slider accueil</label></div>
            </div>
            <div class="col-md-4">
              <div class="form-check"><input class="form-check-input" type="checkbox" id="bp-sb" [(ngModel)]="form.sideBar" />
                <label class="form-check-label fs-13" for="bp-sb">Sidebar</label></div>
            </div>
            <div class="col-md-4">
              <div class="form-check"><input class="form-check-input" type="checkbox" id="bp-ft" [(ngModel)]="form.footer" />
                <label class="form-check-label fs-13" for="bp-ft">Footer</label></div>
            </div>
            <div class="col-md-4">
              <div class="form-check"><input class="form-check-input" type="checkbox" id="bp-rp" [(ngModel)]="form.relatedPost" />
                <label class="form-check-label fs-13" for="bp-rp">Posts similaires</label></div>
            </div>
            <div class="col-md-4">
              <div class="form-check"><input class="form-check-input" type="checkbox" id="bp-fl" [(ngModel)]="form.firstLogin" />
                <label class="form-check-label fs-13" for="bp-fl">Box 1ère connexion</label></div>
            </div>
            <div class="col-md-4">
              <div class="form-check"><input class="form-check-input" type="checkbox" id="bp-lk" [(ngModel)]="form.links" />
                <label class="form-check-label fs-13" for="bp-lk">Liens ajoutés</label></div>
            </div>
            <div class="col-12">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="bp-act" [(ngModel)]="form.active" />
                <label class="form-check-label fs-13" for="bp-act">Pack actif</label>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="bst-footer-btn" (click)="cancel()" [disabled]="saving">Annuler</button>
          <button class="bst-btn-primary" (click)="save()" [disabled]="saving">
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
    /* ═════ Header ═════ */
    .bst-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .bst-header-icon {
      width: 52px; height: 52px; border-radius: 16px; flex-shrink: 0;
      background: linear-gradient(135deg, #a78bfa, #7c3aed);
      display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22px;
      box-shadow: 0 6px 16px rgba(124,58,237,.3);
    }
    .bst-header-title { font-size: 1.7rem; font-weight: 800; color: #1a1f36; margin: 0 0 2px; }
    .bst-header-sub { color: #6b7280; font-size: 13px; margin: 0; }
    .bst-breadcrumb { font-size: 12px; color: #9298a8; margin-top: 6px; }

    /* ═════ KPI Cards ═════ */
    .bst-kpi { position: relative; overflow: hidden; border-radius: 16px; padding: 18px 20px; min-height: 128px; transition: transform .15s, box-shadow .15s; }
    .bst-kpi:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(0,0,0,.08); }
    .bst-kpi.red    { background: linear-gradient(135deg, #fff1ef 0%, #ffe4e0 100%); }
    .bst-kpi.green  { background: linear-gradient(135deg, #eefaf5 0%, #e1f6ec 100%); }
    .bst-kpi.orange { background: linear-gradient(135deg, #fff6ec 0%, #ffedd8 100%); }
    .bst-kpi.blue   { background: linear-gradient(135deg, #eaf6ff 0%, #dcefff 100%); }

    .bst-kpi-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .bst-kpi-icon { width: 38px; height: 38px; border-radius: 11px; background: rgba(255,255,255,.7); display: flex; align-items: center; justify-content: center; font-size: 17px; }
    .bst-kpi.red    .bst-kpi-icon { color: #f06548; }
    .bst-kpi.green  .bst-kpi-icon { color: #0ab39c; }
    .bst-kpi.orange .bst-kpi-icon { color: #f7924a; }
    .bst-kpi.blue   .bst-kpi-icon { color: #299cdb; }
    .bst-kpi-menu { width: 24px; height: 24px; border: none; background: transparent; color: #9298a8; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .bst-kpi-menu:hover { background: rgba(255,255,255,.6); }

    .bst-kpi-label { font-size: 9.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 4px; }
    .bst-kpi.red    .bst-kpi-label { color: #e4573f; }
    .bst-kpi.green  .bst-kpi-label { color: #14a085; }
    .bst-kpi.orange .bst-kpi-label { color: #e08a3c; }
    .bst-kpi.blue   .bst-kpi-label { color: #2185b8; }
    .bst-kpi-value { font-size: 26px; font-weight: 800; color: #1a1f36; line-height: 1; margin-bottom: 4px; }
    .bst-kpi-sub { font-size: 11px; color: #6b7280; }
    .bst-spark { position: absolute; right: 16px; bottom: 12px; width: 64px; height: 20px; }

    /* ═════ Cards / List ═════ */
    .bst-card { background: #fff; border-radius: 18px; box-shadow: 0 2px 12px rgba(0,0,0,.06); overflow: hidden; }
    .bst-list-header { padding: 18px 22px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; }
    .bst-list-icon { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #a78bfa, #7c3aed); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
    .bst-list-title { font-size: 15px; font-weight: 700; color: #1a1f36; }
    .bst-list-sub { font-size: 12px; color: #9298a8; }
    .bst-count-badge { background: #ece4ff; color: #7c3aed; font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 20px; }

    .bst-search { position: relative; }
    .bst-search-ic { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9298a8; font-size: 15px; }
    .bst-search-input { padding: 8px 14px 8px 36px; border: 1px solid #e9ebec; border-radius: 20px; font-size: 13px; outline: none; width: 220px; background: #fafbff; transition: border-color .15s; }
    .bst-search-input:focus { border-color: #8b6cf0; }
    .bst-filter-btn { padding: 8px 16px; border: 1px solid #e9ebec; border-radius: 20px; background: #fff; color: #374151; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; transition: all .15s; }
    .bst-filter-btn:hover { background: #f8f6ff; border-color: #8b6cf0; color: #7c3aed; }
    .bst-btn-primary { padding: 9px 18px; border: none; border-radius: 20px; background: linear-gradient(135deg, #a78bfa, #7c3aed); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; }
    .bst-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(124,58,237,.35); }
    .bst-btn-primary:disabled { opacity: .6; cursor: not-allowed; transform: none; }

    .bst-list-body { border-top: 1px solid #f4f2fb; }

    /* ═════ Empty state ═════ */
    .bst-empty { text-align: center; padding: 50px 20px 46px; }
    .bst-rocket-deco { width: 140px; height: 140px; margin: 0 auto 10px; display: block; }
    .bst-empty-title { font-size: 16px; font-weight: 700; color: #1a1f36; margin-bottom: 6px; }
    .bst-empty-sub { font-size: 13px; color: #9298a8; margin-bottom: 20px; }
    .bst-arrow-deco { width: 40px; height: 30px; }

    /* ═════ Pack cards ═════ */
    .bst-pack-card { background: #fff; border: 1px solid #f2f0fa; border-radius: 16px; overflow: hidden; height: 100%; display: flex; flex-direction: column; transition: box-shadow .15s, transform .15s; }
    .bst-pack-card:hover { box-shadow: 0 8px 22px rgba(0,0,0,.08); transform: translateY(-2px); }
    .bst-pack-header { padding: 12px 16px; background: #fff1ef; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .bst-pack-title { font-size: 13.5px; font-weight: 700; color: #e4573f; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bst-pack-body { padding: 14px 16px 6px; flex: 1; }
    .bst-pack-price { font-size: 24px; font-weight: 800; color: #16a34a; margin: 0; }
    .bst-pack-currency { color: #9298a8; font-size: 12px; }
    .bst-pack-meta { color: #9298a8; }
    .bst-pack-features { list-style: none; padding: 0; margin: 0; font-size: 12px; }
    .bst-pack-features li { color: #16a34a; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
    .bst-pack-footer { padding: 10px 16px 16px; display: flex; gap: 8px; }

    .bst-pill { padding: 3px 10px; border-radius: 20px; font-size: 10.5px; font-weight: 700; display: inline-flex; align-items: center; }
    .bst-pill-success { background: #dcfce7; color: #16a34a; }
    .bst-pill-muted { background: #f1f2f7; color: #6b7280; }
    .bst-pill-danger { background: #fdeceb; color: #f06548; }
    .bst-pill-info { background: #e8f4ff; color: #299cdb; }

    .bst-footer-btn { border: 1px solid #e9ebec; background: #fff; border-radius: 10px; padding: 7px 10px; font-size: 12px; color: #374151; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 4px; transition: all .15s; }
    .bst-footer-btn:hover { background: #f8f6ff; border-color: #8b6cf0; color: #7c3aed; }
    .bst-footer-btn.danger:hover { background: #fef2f0; border-color: #f06548; color: #f06548; }
    .bst-footer-btn:disabled { opacity: .6; cursor: not-allowed; }

    /* ═════ Modal ═════ */
    .bst-modal-header { background: #f4f1ff; }
    .bst-modal-header .modal-title { color: #7c3aed; }

    /* ═════════════════════════════════════════════════
       Adaptation Dark Mode (préserve le même design)
       ═════════════════════════════════════════════════ */
    :host-context([data-bs-theme="dark"]) {
      .bst-header-title { color: var(--bs-emphasis-color); }
      .bst-header-sub, .bst-breadcrumb { color: var(--bs-secondary-color); }

      .bst-kpi.red    { background: linear-gradient(135deg, rgba(240,101,72,.18) 0%, var(--bs-card-bg) 100%); }
      .bst-kpi.green  { background: linear-gradient(135deg, rgba(10,179,156,.18) 0%, var(--bs-card-bg) 100%); }
      .bst-kpi.orange { background: linear-gradient(135deg, rgba(247,146,74,.18) 0%, var(--bs-card-bg) 100%); }
      .bst-kpi.blue   { background: linear-gradient(135deg, rgba(41,156,219,.18) 0%, var(--bs-card-bg) 100%); }
      .bst-kpi:hover { box-shadow: 0 10px 24px rgba(0,0,0,.4); }
      .bst-kpi-icon { background: rgba(0,0,0,.2); }
      .bst-kpi-value { color: var(--bs-emphasis-color); }
      .bst-kpi-sub { color: var(--bs-secondary-color); }
      .bst-kpi-menu:hover { background: rgba(255,255,255,.12); }

      .bst-card { background: var(--bs-card-bg); box-shadow: 0 2px 12px rgba(0,0,0,.35); }
      .bst-list-sub { color: var(--bs-secondary-color); }
      .bst-list-title { color: var(--bs-emphasis-color); }
      .bst-count-badge { background: rgba(124,58,237,.25); color: #c9b3fc; }
      .bst-list-body { border-top-color: var(--bs-border-color); }

      .bst-search-input, .bst-filter-btn { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); color: var(--bs-body-color); }
      .bst-search-ic { color: var(--bs-secondary-color); }
      .bst-filter-btn:hover { background: var(--bs-secondary-bg); }

      .bst-empty-title { color: var(--bs-emphasis-color); }
      .bst-empty-sub { color: var(--bs-secondary-color); }
      .bst-rocket-deco circle:first-child { fill: var(--bs-tertiary-bg); }

      .bst-pack-card { background: var(--bs-card-bg); border-color: var(--bs-border-color); }
      .bst-pack-header { background: rgba(240,101,72,.15); }
      .bst-pack-meta { color: var(--bs-secondary-color); }
      .bst-pack-currency { color: var(--bs-secondary-color); }
      .bst-pill-muted { background: var(--bs-tertiary-bg); color: var(--bs-secondary-color); }
      .bst-footer-btn { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); color: var(--bs-body-color); }

      .bst-modal-header { background: rgba(124,58,237,.2); }
    }
  `],
})
export class BoostPacksAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Dashboard' }, { label: 'Packs Boost', active: true }];

  items: BoostPackRow[] = [];
  search = '';
  loading = true;
  private searchDebounce: any = null;

  currentPage = 1;
  perPage     = 12;
  totalItems  = 0;
  lastPage    = 1;
  statTotal   = 0;

  showForm = false;
  saving   = false;
  saveError = '';
  editingId: number | null = null;
  form = {
    title: '', price: 0, discount: 0, maxDuration: 30, ordersCount: 0,
    sliders: false, sideBar: false, footer: false, relatedPost: false, firstLogin: false, links: false, active: true,
  };

  activeCount = 0;
  withDiscountCount = 0;
  avgPrice = 0;

  constructor(private api: TijaraApiService, private catalogAdmin: CatalogAdminService) {}

  ngOnInit(): void {
    this.load();
    this.loadStats();
  }

  private mapPack(p: any): BoostPackRow {
    return {
      id:          +(p.id_boost ?? p.IdBoost ?? p.id ?? 0),
      title:        p.title       ?? p.Title       ?? '',
      price:       +(p.price       ?? p.Price       ?? 0),
      discount:    +(p.discount    ?? p.Discount    ?? 0),
      maxDuration:+(p.max_duration ?? p.MaxDuration ?? 30),
      ordersCount:+(p.orders_count ?? p.OrdersCount ?? 0),
      sliders:    !!(p.sliders     ?? p.Sliders     ?? false),
      sideBar:    !!(p.side_bar    ?? p.SideBar     ?? false),
      footer:     !!(p.footer      ?? p.Footer      ?? false),
      relatedPost:!!(p.related_post?? p.RelatedPost ?? false),
      firstLogin: !!(p.first_login ?? p.FirstLogin  ?? false),
      links:      !!(p.links       ?? p.Links       ?? false),
      active:     !!(p.active      ?? p.Active      ?? true),
    };
  }

  private buildParams(): any {
    const params: any = { page: this.currentPage, per_page: this.perPage };
    if (this.search.trim()) params.search = this.search.trim();
    return params;
  }

  load(): void {
    this.loading = true;
    this.catalogAdmin.adminList('boost-ads-packs', this.buildParams()).subscribe({
      next: (res: any) => {
        const data: any[] = res?.data || [];
        this.items = (data || []).map((p: any) => this.mapPack(p));
        this.totalItems  = res?.total        ?? this.items.length;
        this.lastPage    = res?.last_page    ?? 1;
        this.currentPage = res?.current_page ?? this.currentPage;
        this.loading = false;
      },
      error: () => { this.loading = false; alert('Chargement impossible.'); }
    });
  }

  // KPI (actifs / remise / prix moyen) calculés sur l'ensemble des packs.
  loadStats(): void {
    this.catalogAdmin.adminList('boost-ads-packs', { per_page: 1 }).subscribe((res: any) => this.statTotal = res?.total ?? 0);
    this.catalogAdmin.adminList('boost-ads-packs', { per_page: 200 }).subscribe((res: any) => {
      const all = ((res?.data || []) as any[]).map((p: any) => this.mapPack(p));
      this.activeCount       = all.filter(p => p.active).length;
      this.withDiscountCount = all.filter(p => p.discount > 0).length;
      this.avgPrice = all.length ? all.reduce((s, p) => s + p.price, 0) / all.length : 0;
    });
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
    this.form = {
      title: '', price: 0, discount: 0, maxDuration: 30, ordersCount: 0,
      sliders: false, sideBar: false, footer: false, relatedPost: false, firstLogin: false, links: false, active: true,
    };
    this.showForm = true;
  }
  openEdit(p: BoostPackRow): void {
    this.editingId = p.id; this.saveError = '';
    this.form = { title: p.title, price: p.price, discount: p.discount, maxDuration: p.maxDuration, ordersCount: p.ordersCount,
      sliders: p.sliders, sideBar: p.sideBar, footer: p.footer, relatedPost: p.relatedPost, firstLogin: p.firstLogin, links: p.links, active: p.active };
    this.showForm = true;
  }
  cancel(_ev?: Event): void { this.showForm = false; this.saving = false; this.saveError = ''; }

  save(): void {
    if (!this.form.title.trim()) { this.saveError = 'Le nom est requis.'; return; }
    this.saving = true; this.saveError = '';
    const payload = {
      Title: this.form.title, Price: +this.form.price, Discount: +this.form.discount,
      MaxDuration: +this.form.maxDuration, OrdersCount: +this.form.ordersCount,
      Sliders: this.form.sliders, SideBar: this.form.sideBar, Footer: this.form.footer,
      RelatedPost: this.form.relatedPost, FirstLogin: this.form.firstLogin, Links: this.form.links,
      Active: this.form.active,
    };
    const op = this.editingId
      ? this.catalogAdmin.adminUpdate('boost-ads-packs', this.editingId, payload)
      : this.catalogAdmin.adminCreate('boost-ads-packs', payload);
    op.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); this.loadStats(); },
      error: (err) => { this.saving = false; this.saveError = err?.error?.message || 'Erreur d\'enregistrement.'; },
    });
  }

  toggleActive(p: BoostPackRow): void {
    this.catalogAdmin.adminUpdate('boost-ads-packs', p.id, {
      Title: p.title, Price: p.price, Discount: p.discount, MaxDuration: p.maxDuration, OrdersCount: p.ordersCount,
      Sliders: p.sliders, SideBar: p.sideBar, Footer: p.footer, RelatedPost: p.relatedPost,
      FirstLogin: p.firstLogin, Links: p.links, Active: !p.active,
    }).subscribe({
      next: () => { p.active = !p.active; this.loadStats(); },
      error: () => alert('Action impossible.'),
    });
  }
  remove(p: BoostPackRow): void {
    if (!confirm(`Supprimer le pack "${p.title}" ?`)) return;
    this.catalogAdmin.adminDelete('boost-ads-packs', p.id).subscribe({
      next: () => { this.load(); this.loadStats(); },
      error: () => alert('Suppression impossible.'),
    });
  }
}