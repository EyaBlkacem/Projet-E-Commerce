import { Component, OnInit } from '@angular/core';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { CatalogAdminService } from 'src/app/core/services/catalog-admin.service';

interface WinnerRow {
  id: number;
  idUser: number | null;
  idPrize: number | null;
  idOrder: number | null;
  fullName: string;
  email: string;
  phone: string;
  dateWin: string;
  note: string;
  active: boolean;
  userName: string;
  prizeTitle: string;
}

@Component({
  selector: 'app-winners-admin',
  standalone: false,
  template: `
<div class="winners-page">

  <!-- ===== En-tête (icône + titre + sous-titre + fil d'ariane + illustration) ===== -->
  <div class="page-header d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
    <div class="d-flex align-items-center gap-3">
      <div class="header-icon">
        <i class="ri-trophy-line"></i>
      </div>
      <div>
        <h3 class="mb-1 fw-bold">Gagnants</h3>
        <p class="text-muted mb-0 fs-13">Gérez vos gagnants et suivez les performances de vos concours.</p>
      </div>
    </div>

    <div class="d-flex align-items-center gap-3">
      <div class="breadcrumb-mini fs-13 text-muted">
        Admin <i class="ri-arrow-right-s-line align-middle"></i> <span class="text-primary fw-semibold">Gagnants</span>
      </div>
      <div class="header-illustration d-none d-md-block">
        <svg viewBox="0 0 120 90" width="100" height="78">
          <defs>
            <linearGradient id="trophyGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#c9c3f7"/>
              <stop offset="100%" stop-color="#8f7ff0"/>
            </linearGradient>
          </defs>
          <g opacity="0.55">
            <circle cx="18" cy="18" r="3" fill="#f7b84b"/>
            <circle cx="105" cy="15" r="2.5" fill="#0ab39c"/>
            <circle cx="15" cy="60" r="2" fill="#f06595"/>
            <circle cx="108" cy="55" r="3" fill="#6c5dd3"/>
            <path d="M8 40 l4 4 l-4 4 l-4 -4 Z" fill="#f7b84b"/>
            <path d="M112 70 l3 3 l-3 3 l-3 -3 Z" fill="#0ab39c"/>
          </g>
          <path d="M45 30 h30 v20 a15 15 0 0 1 -30 0 Z" fill="url(#trophyGrad)"/>
          <path d="M45 32 c-10 0 -14 6 -14 12 c0 5 4 9 12 10 l0 -6 c-4 -1 -6 -3 -6 -6 c0 -4 3 -7 8 -7 Z" fill="url(#trophyGrad)"/>
          <path d="M75 32 c10 0 14 6 14 12 c0 5 -4 9 -12 10 l0 -6 c4 -1 6 -3 6 -6 c0 -4 -3 -7 -8 -7 Z" fill="url(#trophyGrad)"/>
          <rect x="57" y="50" width="6" height="10" fill="#8f7ff0"/>
          <rect x="48" y="60" width="24" height="5" rx="1.5" fill="#8f7ff0"/>
          <rect x="44" y="65" width="32" height="6" rx="2" fill="#6c5dd3"/>
        </svg>
      </div>
    </div>
  </div>

  <!-- ===== Cartes statistiques (avec mini sparkline en aire) ===== -->
  <div class="row g-3 mb-4">
    <div class="col-md-3 col-sm-6">
      <div class="stat-card" style="--accent:#6c5dd3">
        <div class="d-flex align-items-center gap-3">
          <div class="stat-icon" style="background:#6c5dd31a;color:#6c5dd3"><i class="ri-trophy-line"></i></div>
          <div>
            <h3 class="mb-0 fw-bold" style="color:#6c5dd3">{{ statTotal }}</h3>
            <p class="mb-0 fs-12 text-muted">Total gagnants</p>
          </div>
        </div>
        <div class="stat-footer">
          <span class="stat-trend" [class.text-success]="statTotal > 0" [class.text-muted]="statTotal === 0">
            <i [class]="statTotal > 0 ? 'ri-arrow-right-up-line' : 'ri-subtract-line'"></i> 0%
          </span>
          <span class="fs-11 text-muted">Depuis le début</span>
        </div>
        <svg class="stat-spark-bg" viewBox="0 0 200 50" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkGradPurple" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#6c5dd3" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#6c5dd3" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,38 C20,20 35,42 55,30 C75,18 90,36 110,26 C130,16 150,34 170,22 C185,14 195,26 200,18 L200,50 L0,50 Z" fill="url(#sparkGradPurple)"/>
          <path d="M0,38 C20,20 35,42 55,30 C75,18 90,36 110,26 C130,16 150,34 170,22 C185,14 195,26 200,18" fill="none" stroke="#6c5dd3" stroke-width="2"/>
        </svg>
      </div>
    </div>

    <div class="col-md-3 col-sm-6">
      <div class="stat-card" style="--accent:#0ab39c">
        <div class="d-flex align-items-center gap-3">
          <div class="stat-icon" style="background:#0ab39c1a;color:#0ab39c"><i class="ri-calendar-check-line"></i></div>
          <div>
            <h3 class="mb-0 fw-bold text-success">{{ thisMonthCount }}</h3>
            <p class="mb-0 fs-12 text-muted">Ce mois-ci</p>
          </div>
        </div>
        <div class="stat-footer">
          <span class="stat-trend" [class.text-success]="thisMonthCount > 0" [class.text-muted]="thisMonthCount === 0">
            <i [class]="thisMonthCount > 0 ? 'ri-arrow-right-up-line' : 'ri-subtract-line'"></i> 0%
          </span>
          <span class="fs-11 text-muted">Gagnants tirés ce mois</span>
        </div>
        <svg class="stat-spark-bg" viewBox="0 0 200 50" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkGradGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0ab39c" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#0ab39c" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,30 C20,40 35,16 55,28 C75,40 90,20 110,24 C130,28 150,12 170,20 C185,26 195,22 200,30 L200,50 L0,50 Z" fill="url(#sparkGradGreen)"/>
          <path d="M0,30 C20,40 35,16 55,28 C75,40 90,20 110,24 C130,28 150,12 170,20 C185,26 195,22 200,30" fill="none" stroke="#0ab39c" stroke-width="2"/>
        </svg>
      </div>
    </div>

    <div class="col-md-3 col-sm-6">
      <div class="stat-card" style="--accent:#f06595">
        <div class="d-flex align-items-center gap-3">
          <div class="stat-icon" style="background:#f065951a;color:#f06595"><i class="ri-user-follow-line"></i></div>
          <div>
            <h3 class="mb-0 fw-bold" style="color:#f06595">{{ withUserCount }}</h3>
            <p class="mb-0 fs-12 text-muted">Comptes liés</p>
          </div>
        </div>
        <div class="stat-footer">
          <span class="stat-trend" [class.text-success]="withUserCount > 0" [class.text-muted]="withUserCount === 0">
            <i [class]="withUserCount > 0 ? 'ri-arrow-right-up-line' : 'ri-subtract-line'"></i> 0%
          </span>
          <span class="fs-11 text-muted">Comptes associés</span>
        </div>
        <svg class="stat-spark-bg" viewBox="0 0 200 50" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkGradPink" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#f06595" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#f06595" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,32 C20,26 35,38 55,30 C75,22 90,34 110,28 C130,22 150,32 170,26 C185,22 195,28 200,24 L200,50 L0,50 Z" fill="url(#sparkGradPink)"/>
          <path d="M0,32 C20,26 35,38 55,30 C75,22 90,34 110,28 C130,22 150,32 170,26 C185,22 195,28 200,24" fill="none" stroke="#f06595" stroke-width="2"/>
        </svg>
      </div>
    </div>

    <div class="col-md-3 col-sm-6">
      <div class="stat-card" style="--accent:#3b82f6">
        <div class="d-flex align-items-center gap-3">
          <div class="stat-icon" style="background:#3b82f61a;color:#3b82f6"><i class="ri-mail-line"></i></div>
          <div>
            <h3 class="mb-0 fw-bold" style="color:#3b82f6">{{ withEmailCount }}</h3>
            <p class="mb-0 fs-12 text-muted">Avec email</p>
          </div>
        </div>
        <div class="stat-footer">
          <span class="stat-trend" [class.text-success]="withEmailCount > 0" [class.text-muted]="withEmailCount === 0">
            <i [class]="withEmailCount > 0 ? 'ri-arrow-right-up-line' : 'ri-subtract-line'"></i> 0%
          </span>
          <span class="fs-11 text-muted">Emails enregistrés</span>
        </div>
        <svg class="stat-spark-bg" viewBox="0 0 200 50" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkGradBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,26 C20,34 35,20 55,26 C75,32 90,18 110,22 C130,26 150,14 170,20 C185,24 195,16 200,20 L200,50 L0,50 Z" fill="url(#sparkGradBlue)"/>
          <path d="M0,26 C20,34 35,20 55,26 C75,32 90,18 110,22 C130,26 150,14 170,20 C185,24 195,16 200,20" fill="none" stroke="#3b82f6" stroke-width="2"/>
        </svg>
      </div>
    </div>
  </div>

  <!-- ===== Liste des gagnants ===== -->
  <div class="card border-0 shadow-sm">
    <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2 py-3">
      <div class="list-icon"><i class="ri-grid-line"></i></div>
      <div class="flex-grow-1">
        <h6 class="mb-0 fw-semibold">
          Liste des gagnants
          <span class="badge bg-primary-subtle text-primary ms-1">{{ filtered.length }}</span>
        </h6>
        <p class="mb-0 fs-11 text-muted">Retrouvez et gérez tous vos gagnants ici.</p>
      </div>

      <div class="input-group input-group-sm" style="max-width:260px">
        <span class="input-group-text bg-white border-end-0"><i class="ri-search-line"></i></span>
        <input type="text" class="form-control border-start-0" placeholder="Nom, email, prix…"
               [(ngModel)]="search" (input)="applyFilter()" />
      </div>

      <button class="btn btn-sm btn-light border" (click)="showFilters = !showFilters">
        <i class="ri-filter-3-line me-1"></i>Filtres
      </button>

      <button class="btn btn-sm btn-primary-tijara" (click)="openAdd()">
        <i class="ri-add-line me-1"></i>Nouveau gagnant
      </button>
    </div>

    @if (showFilters) {
      <div class="px-3 pb-3 d-flex gap-2 flex-wrap">
        <select class="form-select form-select-sm" style="max-width:180px" [(ngModel)]="filterLinked" (change)="applyFilter()">
          <option value="all">Compte lié ou non</option>
          <option value="linked">Compte lié</option>
          <option value="unlinked">Sans compte</option>
        </select>
      </div>
    }

    <div class="card-body p-0">
      @if (loading) {
        <div class="text-center py-5"><div class="spinner-border" style="color:#6c5dd3"></div></div>
      } @else if (filtered.length === 0) {
        <div class="empty-state text-center">
          <svg viewBox="0 0 160 140" width="120" height="105" class="mx-auto d-block mb-2">
            <defs>
              <linearGradient id="giftGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#c9c3f7"/>
                <stop offset="100%" stop-color="#8f7ff0"/>
              </linearGradient>
            </defs>
            <ellipse cx="80" cy="122" rx="55" ry="8" fill="#8f7ff014"/>
            <g opacity="0.6">
              <path d="M20 30 l4 4 l-4 4 l-4 -4 Z" fill="#f7b84b"/>
              <circle cx="140" cy="35" r="3" fill="#0ab39c"/>
              <circle cx="130" cy="90" r="2.5" fill="#f06595"/>
              <path d="M18 90 l3 3 l-3 3 l-3 -3 Z" fill="#6c5dd3"/>
            </g>
            <rect x="35" y="55" width="90" height="55" rx="6" fill="url(#giftGrad)"/>
            <rect x="35" y="55" width="90" height="16" rx="4" fill="#7b6ff0"/>
            <rect x="72" y="40" width="16" height="70" fill="#6c5dd3"/>
            <path d="M80 40 c-14 0 -18 -14 -8 -18 c8 -3 12 8 8 18 Z" fill="#c9c3f7"/>
            <path d="M80 40 c14 0 18 -14 8 -18 c-8 -3 -12 8 -8 18 Z" fill="#c9c3f7"/>
          </svg>
          <h6 class="fw-semibold mb-1">Aucun gagnant pour le moment</h6>
          <p class="text-muted fs-13 mb-3">Vous n'avez pas encore ajouté de gagnant.</p>
          <button class="btn btn-primary-tijara" (click)="openAdd()">
            <i class="ri-add-line me-1"></i>Ajouter le premier gagnant
          </button>
          <div class="mt-2">
            <a href="javascript:void(0)" class="fs-12 text-muted text-decoration-underline">ou importez une liste de gagnants</a>
          </div>
        </div>
      } @else {
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">Gagnant</th>
                <th>Contact</th>
                <th>Prix</th>
                <th>Commande</th>
                <th class="text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (w of filtered; track w.id) {
                <tr>
                  <td class="ps-3">
                    <div class="d-flex align-items-center gap-2">
                      <div class="avatar-sm rounded-circle d-flex align-items-center justify-content-center fw-bold fs-13"
                           style="background:#6c5dd31a;color:#6c5dd3">
                        {{ getInitials(w.fullName || w.userName) }}
                      </div>
                      <div class="min-w-0">
                        <div class="fs-13 fw-semibold">{{ w.fullName || w.userName || '—' }}</div>
                        @if (w.idUser) { <div class="fs-11 text-muted">User #{{ w.idUser }}</div> }
                      </div>
                    </div>
                  </td>
                  <td class="fs-12">
                    @if (w.email) { <div><i class="ri-mail-line text-muted me-1"></i>{{ w.email }}</div> }
                    @if (w.phone) { <div class="text-muted"><i class="ri-phone-line"></i> {{ w.phone }}</div> }
                  </td>
                  <td>
                    @if (w.prizeTitle) {
                      <span class="badge bg-warning-subtle text-warning">
                        <i class="ri-gift-line me-1"></i>{{ w.prizeTitle }}
                      </span>
                    } @else if (w.idPrize) {
                      <span class="badge bg-light text-muted">Prix #{{ w.idPrize }}</span>
                    } @else { <span class="text-muted fs-11">—</span> }
                  </td>
                  <td class="fs-12">
                    @if (w.idOrder) {
                      <span class="badge bg-info-subtle text-info">#{{ w.idOrder }}</span>
                    } @else { <span class="text-muted">—</span> }
                  </td>
                  <td class="text-end pe-3">
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-light" (click)="openEdit(w)" title="Modifier">
                        <i class="ri-edit-2-line text-info"></i>
                      </button>
                      <button class="btn btn-light" (click)="remove(w)" title="Supprimer">
                        <i class="ri-delete-bin-line text-danger"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  </div>
</div>

@if (showForm) {
  <div class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,.5)" (click)="cancel($event)">
    <div class="modal-dialog modal-lg modal-dialog-centered" (click)="$event.stopPropagation()">
      <div class="modal-content border-0 shadow-lg">
        <div class="modal-header" style="background:#6c5dd31a">
          <h5 class="modal-title fw-bold" style="color:#6c5dd3">
            <i class="ri-trophy-line me-2"></i>{{ editingId ? 'Modifier le gagnant' : 'Nouveau gagnant' }}
          </h5>
          <button type="button" class="btn-close" (click)="cancel()"></button>
        </div>
        <div class="modal-body">
          @if (saveError) {
            <div class="alert alert-danger fs-13"><i class="ri-error-warning-line me-2"></i>{{ saveError }}</div>
          }
          <div class="row g-3">
            @if (editingId) {
              <div class="col-md-6">
                <label class="form-label fs-12 fw-semibold">Nom complet *</label>
                <input class="form-control form-control-sm" [(ngModel)]="form.fullName" placeholder="Ex : Saad Achraf" />
              </div>
              <div class="col-md-6">
                <label class="form-label fs-12 fw-semibold">Email</label>
                <input type="email" class="form-control form-control-sm" [(ngModel)]="form.email" />
              </div>
              <div class="col-md-4">
                <label class="form-label fs-12 fw-semibold">Téléphone</label>
                <input class="form-control form-control-sm" [(ngModel)]="form.phone" />
              </div>
              <div class="col-md-4">
                <label class="form-label fs-12 fw-semibold">ID utilisateur</label>
                <input type="number" min="0" class="form-control form-control-sm" [(ngModel)]="form.idUser" />
              </div>
              <div class="col-md-4">
                <label class="form-label fs-12 fw-semibold">ID prix</label>
                <input type="number" min="0" class="form-control form-control-sm" [(ngModel)]="form.idPrize" />
              </div>
            } @else {
              <div class="col-12">
                <div class="alert alert-info fs-13 mb-0">
                  <i class="ri-information-line me-2"></i>
                  Le gagnant est tiré au sort automatiquement, au hasard, parmi les acheteurs réels du deal lié à ce prix — il n'y a rien d'autre à saisir.
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label fs-12 fw-semibold">ID prix *</label>
                <input type="number" min="0" class="form-control form-control-sm" [(ngModel)]="form.idPrize" placeholder="ID du prix à tirer au sort" />
              </div>
            }
            <div class="col-md-6">
              <label class="form-label fs-12 fw-semibold">Commande liée</label>
              <input type="text" class="form-control form-control-sm" [value]="form.idOrder ? ('#' + form.idOrder) : 'Aucune commande trouvée pour ce deal'" disabled />
              <div class="form-text fs-11">Déduite automatiquement (commande passée par ce gagnant sur le deal du prix) — non modifiable ici.</div>
            </div>
            <div class="col-md-6 d-flex align-items-end">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="winner-active" [(ngModel)]="form.active" />
                <label class="form-check-label fs-13" for="winner-active">Actif</label>
              </div>
            </div>
            <div class="col-12">
              <label class="form-label fs-12 fw-semibold">Note interne</label>
              <textarea class="form-control form-control-sm" rows="2" [(ngModel)]="form.note"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-light" (click)="cancel()" [disabled]="saving">Annuler</button>
          <button class="btn btn-primary-tijara" (click)="save()" [disabled]="saving">
            @if (saving) { <span class="spinner-border spinner-border-sm me-1"></span> }
            <i class="ri-save-line me-1"></i> {{ editingId ? 'Enregistrer' : 'Tirer au sort' }}
          </button>
        </div>
      </div>
    </div>
  </div>
}
`,
  styles: [`
    .page-header {
      background: linear-gradient(135deg, #f7f7fd 0%, #ffffff 100%);
      border-radius: 16px;
      padding: 18px 22px;
    }
    .header-icon {
      width: 54px; height: 54px; border-radius: 14px;
      background: linear-gradient(135deg, #f7b84b33, #f7b84b14);
      color: #f7b84b;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px;
      box-shadow: 0 4px 10px rgba(247, 184, 75, .18);
    }
    .header-illustration { margin-right: -8px; }
    .list-icon {
      width: 38px; height: 38px; border-radius: 10px;
      background: #6c5dd31a; color: #6c5dd3;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .stat-card {
      background: #fff; border-radius: 14px; padding: 16px 18px 46px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
      border-left: 4px solid var(--accent);
      height: 100%;
      position: relative;
      overflow: hidden;
    }
    .stat-icon {
      width: 44px; height: 44px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0;
    }
    .stat-footer {
      display: flex; align-items: center; gap: 6px;
      margin-top: 10px; position: relative; z-index: 1;
    }
    .stat-trend { font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 2px; }
    .stat-spark-bg {
      position: absolute; left: 0; right: 0; bottom: 0;
      width: 100%; height: 40px; display: block;
    }
    .empty-state { padding: 32px 16px; }
    .btn-primary-tijara {
      background: #6c5dd3; border-color: #6c5dd3; color: #fff;
    }
    .btn-primary-tijara:hover { background: #5b4dc4; border-color: #5b4dc4; color: #fff; }

    /* ===== Adaptation Dark Mode ===== */
    :host-context([data-bs-theme="dark"]) {
      .page-header {
        background: linear-gradient(135deg, var(--bs-tertiary-bg) 0%, var(--bs-body-bg) 100%);
      }
      .stat-card {
        background: var(--bs-card-bg);
        box-shadow: 0 1px 3px rgba(0, 0, 0, .35);
      }
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
    }
  `],
})
export class WinnersAdminComponent implements OnInit {

  items: WinnerRow[] = [];
  search = '';
  loading = true;
  showFilters = false;
  filterLinked: 'all' | 'linked' | 'unlinked' = 'all';
  private searchDebounce: any = null;

  currentPage = 1;
  perPage     = 10;
  totalItems  = 0;
  lastPage    = 1;
  statTotal   = 0;

  showForm = false;
  saving   = false;
  saveError = '';
  editingId: number | null = null;
  form: any = { fullName: '', email: '', phone: '', idUser: null, idPrize: null, idOrder: null, dateWin: '', note: '', active: true };

  thisMonthCount = 0;
  withUserCount  = 0;
  withEmailCount = 0;

  get filtered(): WinnerRow[] {
    let list = this.items;

    if (this.filterLinked === 'linked') {
      list = list.filter(w => !!w.idUser);
    } else if (this.filterLinked === 'unlinked') {
      list = list.filter(w => !w.idUser);
    }

    if (this.search.trim()) {
      const s = this.search.trim().toLowerCase();
      list = list.filter(w =>
        w.fullName.toLowerCase().includes(s) ||
        w.email.toLowerCase().includes(s) ||
        w.phone.toLowerCase().includes(s)
      );
    }

    return list;
  }


  private mapWinner(w: any): WinnerRow {
    const idUser = w.IdUser ?? w.id_user ?? null;
    const idPrize = w.IdPrize ?? w.id_prize ?? null;
    const u = w.user ?? null;
    const p = w.prize ?? null;
    return {
      id:        +(w.IdWinner ?? w.id_winner ?? w.id ?? 0),
      idUser,
      idPrize,
      idOrder:   (w.IdOrder ?? w.idOrder ?? null) as number | null,
      fullName:  u ? `${u.FirstName || ''} ${u.LastName || ''}`.trim() : '',
      email:     u?.Email || '',
      phone:     u?.Telephone || '',
      dateWin:   this.toDateInput(w.DateWin ?? w.date_win),
      note:      '',
      active:    true,
      userName:  u?.Username || '',
      prizeTitle: p?.title || '',
    };
  }

  constructor(private api: TijaraApiService, private catalogAdmin: CatalogAdminService) {}

  ngOnInit(): void {
    this.load();
    this.loadStats();
  }

  private buildParams(): any {
    const params: any = { page: this.currentPage, per_page: this.perPage };
    if (this.search.trim()) params.search = this.search.trim();
    if (this.filterLinked !== 'all') params.linked = this.filterLinked;
    return params;
  }

  // Le backend renvoie desormais directement les relations 'user' et 'prize'
  // (eager-load cote WinnersController@index) — plus besoin de recharger
  // /users et /prizes a part et de faire le rapprochement cote front.
  load(): void {
    this.loading = true;
    this.catalogAdmin.adminList('winners', this.buildParams()).subscribe({
      next: (winners: any) => {
        const data: any[] = winners?.data ?? winners ?? [];
        this.items = (data || []).map((w: any) => this.mapWinner(w));
        this.totalItems  = winners?.total        ?? this.items.length;
        this.lastPage    = winners?.last_page    ?? 1;
        this.currentPage = winners?.current_page ?? this.currentPage;
        this.loading = false;
      },
      error: () => { this.loading = false; alert('Chargement impossible.'); }
    });
  }

  // KPI agrégés sur l'ensemble des gagnants (toutes pages), pas seulement la page affichée.
  loadStats(): void {
    this.catalogAdmin.adminList('winners', { per_page: 1 }).subscribe((res: any) => this.statTotal = res?.total ?? 0);
    this.fetchAllForStats(1, []);
  }

  private fetchAllForStats(page: number, acc: any[]): void {
    this.catalogAdmin.adminList('winners', { page, per_page: 50 }).subscribe({
      next: (res: any) => {
        const data: any[] = res?.data || [];
        const combined = acc.concat(data);
        const lastPage = res?.last_page ?? 1;
        if (page < lastPage && page < 20) {
          this.fetchAllForStats(page + 1, combined);
        } else {
          const mapped = combined.map((w: any) => this.mapWinner(w));
          const now = new Date();
          this.thisMonthCount = mapped.filter(w => {
            if (!w.dateWin) return false;
            const d = new Date(w.dateWin);
            return !isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          }).length;
          this.withUserCount  = mapped.filter(w => !!w.idUser).length;
          this.withEmailCount = mapped.filter(w => !!w.email).length;
        }
      },
      error: () => { /* KPI secondaires : on échoue silencieusement */ }
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

  applyFilter(): void { this.currentPage = 1; this.load(); }

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
    this.form = { fullName: '', email: '', phone: '', idUser: null, idPrize: null, idOrder: null, dateWin: '', note: '', active: true };
    this.showForm = true;
  }
  openEdit(w: WinnerRow): void {
    this.editingId = w.id; this.saveError = '';
    this.form = {
      fullName: w.fullName, email: w.email, phone: w.phone,
      idUser: w.idUser, idPrize: w.idPrize, idOrder: w.idOrder,
      dateWin: w.dateWin, note: w.note, active: w.active,
    };
    this.showForm = true;
  }
  cancel(_ev?: Event): void { this.showForm = false; this.saving = false; this.saveError = ''; }


  save(): void {
    if (!this.form.idPrize) { this.saveError = 'Sélectionnez un prix.'; return; }
    this.saving = true; this.saveError = '';

    if (this.editingId) {
      // Modification d'un gagnant déjà existant : l'admin peut toujours
      // forcer manuellement les champs (override), via PUT /winners/{id}.
      if (!this.form.idUser) { this.saveError = 'Sélectionnez un utilisateur.'; this.saving = false; return; }
      const payload = {
        IdUser: this.form.idUser, IdPrize: this.form.idPrize,
        DateWin: this.form.dateWin || new Date().toISOString().slice(0, 10),
      };
      this.catalogAdmin.adminUpdate('winners', this.editingId, payload).subscribe({
        next: () => { this.saving = false; this.showForm = false; this.load(); this.loadStats(); },
        error: (err: any) => { this.saving = false; this.saveError = err?.error?.message || 'Erreur d\'enregistrement.'; },
      });
      return;
    }

    // Création = tirage au sort : le backend choisit lui-même le gagnant
    // aléatoirement parmi les acheteurs réels du deal lié au prize choisi
    // (POST /winners n'accepte plus que IdPrize — IdUser/DateWin envoyés
    // ici étaient de toute façon ignorés côté backend).
    this.catalogAdmin.adminCreate('winners', { IdPrize: this.form.idPrize }).subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); this.loadStats(); },
      error: (err: any) => { this.saving = false; this.saveError = err?.error?.message || 'Tirage au sort impossible.'; },
    });
  }


  remove(w: WinnerRow): void {
    if (!confirm(`Supprimer le gagnant "${w.fullName || w.userName}" ?`)) return;
    this.catalogAdmin.adminDelete('winners', w.id).subscribe({
      next: () => { this.load(); this.loadStats(); },
      error: () => alert('Suppression impossible.'),
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  private toDateInput(d: any): string {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
  }
}