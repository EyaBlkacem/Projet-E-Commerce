import { Component, OnInit } from '@angular/core';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { VerificationService } from 'src/app/core/services/verification.service';

interface VerificationRow {
  id: number;
  username: string;
  email: string;
  isBusiness: boolean;
  isVerified: boolean;
}

@Component({
  selector: 'app-verification-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Vérification d'identité" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<div class="card border-0 shadow-sm">
  <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2 py-2">
    <h6 class="mb-0 fw-semibold flex-grow-1">
      Demandes de vérification
      <span class="badge bg-primary-subtle text-primary ms-2">{{ totalItems }}</span>
    </h6>
    <div class="input-group input-group-sm" style="max-width:220px">
      <span class="input-group-text bg-white border-end-0"><i class="ri-search-line"></i></span>
      <input type="text" class="form-control border-start-0" placeholder="Utilisateur, email…"
             [(ngModel)]="search" (input)="onSearchChange()" />
    </div>
    <div class="btn-group btn-group-sm">
      <button class="btn" [class.btn-primary]="status==='pending'" [class.btn-light]="status!=='pending'"
              (click)="setStatus('pending')">En attente</button>
      <button class="btn" [class.btn-primary]="status==='verified'" [class.btn-light]="status!=='verified'"
              (click)="setStatus('verified')">Vérifiés</button>
      <button class="btn" [class.btn-primary]="status==='all'" [class.btn-light]="status!=='all'"
              (click)="setStatus('all')">Tous</button>
    </div>
  </div>

  <div class="card-body p-0">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    } @else if (items.length === 0) {
      <p class="text-muted text-center py-5 mb-0">Aucune demande {{ status === 'pending' ? 'en attente' : '' }}.</p>
    } @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th class="ps-3">Utilisateur</th>
              <th>Type de compte</th>
              <th class="text-center">Statut</th>
              <th class="text-end pe-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (u of items; track u.id) {
              <tr>
                <td class="ps-3">
                  <div class="fw-semibold">{{ u.username }}</div>
                  <div class="fs-12 text-muted">{{ u.email }}</div>
                </td>
                <td>
                  <span class="badge" [class]="u.isBusiness ? 'bg-info-subtle text-info' : 'bg-secondary-subtle text-secondary'">
                    {{ u.isBusiness ? 'Entreprise (Patente)' : 'Particulier (CIN)' }}
                  </span>
                </td>
                <td class="text-center">
                  @if (u.isVerified) { <span class="badge bg-success-subtle text-success">Vérifié</span> }
                  @else { <span class="badge bg-warning-subtle text-warning">En attente</span> }
                </td>
                <td class="text-end pe-3">
                  <button class="btn btn-sm btn-light" (click)="openDetail(u)" title="Voir le document">
                    <i class="ri-eye-line text-info"></i>
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination numérique : la page demandée est envoyée au backend -->
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-top">
        <span class="fs-12 text-muted">Page {{ page }} / {{ totalPages }} — {{ totalItems }} demande(s)</span>
        <nav>
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" [class.disabled]="page <= 1">
              <button class="page-link" (click)="goToPage(page - 1)"><i class="ri-arrow-left-s-line"></i></button>
            </li>
            @for (p of getPageNumbers(); track $index) {
              @if (p === '...') {
                <li class="page-item disabled"><span class="page-link">…</span></li>
              } @else {
                <li class="page-item" [class.active]="p === page">
                  <button class="page-link" (click)="goToPage(asNumber(p))">{{ p }}</button>
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

@if (detail) {
  <div class="modal-backdrop-custom" (click)="closeDetail()">
    <div class="modal-panel" (click)="$event.stopPropagation()">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">{{ detail.Username }}</h5>
        <button class="btn btn-sm btn-light" (click)="closeDetail()"><i class="ri-close-line"></i></button>
      </div>
      <p class="text-muted mb-1">{{ detail.Email }}</p>
      <p class="mb-2">
        <span class="fw-semibold">{{ detail.DocumentType === 'Patente' ? 'Matricule Fiscal' : 'N° CIN' }} :</span>
        {{ detail.NumeroIdentite || '—' }}
      </p>
      @if (detail.PhotoIdentite) {
        <img [src]="assetBaseUrl + '/assets/verifications/' + detail.PhotoIdentite"
             class="img-fluid rounded border mb-3" style="max-height:320px;object-fit:contain" alt="Document" />
      } @else {
        <p class="text-muted fst-italic mb-3">Aucun document joint.</p>
      }
      @if (!detail.IsVerified) {
        <div class="d-flex gap-2">
          <button class="btn btn-success flex-grow-1" [disabled]="saving" (click)="verify(detail)">
            <i class="ri-check-line me-1"></i>Vérifier
          </button>
          <button class="btn btn-outline-danger flex-grow-1" [disabled]="saving" (click)="reject(detail)">
            <i class="ri-close-line me-1"></i>Rejeter
          </button>
        </div>
      } @else {
        <div class="alert alert-success mb-0">
          <i class="ri-checkbox-circle-line me-1"></i>Ce compte est déjà vérifié.
        </div>
      }
    </div>
  </div>
}

<style>
  .modal-backdrop-custom {
    position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 1050;
    display: flex; align-items: center; justify-content: center; padding: 1rem;
  }
  .modal-panel {
    background: var(--vz-body-bg); border-radius: .5rem; padding: 1.5rem;
    max-width: 480px; width: 100%; max-height: 90vh; overflow-y: auto;
  }
</style>
  `,
})
export class VerificationAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Vérifications', active: true }];

  items: VerificationRow[] = [];
  status: 'pending' | 'verified' | 'all' = 'pending';
  search = '';
  loading = true;
  saving = false;
  detail: any = null;
  private searchDebounce: any = null;

  page = 1;
  perPage = 10;
  totalItems = 0;
  totalPages = 1;

  get assetBaseUrl(): string { return this.verification.assetBaseUrl; }

  constructor(private api: TijaraApiService, private verification: VerificationService) {}

  ngOnInit(): void { this.load(); }

  setStatus(s: 'pending' | 'verified' | 'all'): void {
    this.status = s;
    this.page = 1;
    this.load();
  }

  onSearchChange(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.page = 1; this.load(); }, 400);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
    this.load();
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

  load(): void {
    this.loading = true;
    const params: any = { page: this.page, per_page: this.perPage };
    if (this.search.trim()) params.search = this.search.trim();
    this.verification.getVerifications(this.status, params).subscribe({
      next: (res: any) => {
        const rows: any[] = res?.data ?? res ?? [];
        this.items = rows.map((u: any) => ({
          id:         u.IdUser,
          username:   u.Username || u.Email || `Utilisateur #${u.IdUser}`,
          email:      u.Email || '',
          isBusiness: !!u.BusinessVerificationPicture,
          isVerified: !!u.IsVerified,
        }));
        this.totalItems = res?.total        ?? this.items.length;
        this.totalPages = res?.last_page    ?? 1;
        this.page       = res?.current_page ?? this.page;
        this.loading = false;
      },
      error: () => { this.items = []; this.loading = false; },
    });
  }

  openDetail(u: VerificationRow): void {
    this.verification.getVerificationDetail(u.id).subscribe({
      next: (res: any) => { this.detail = res; },
      error: () => alert('Impossible de charger ce document.'),
    });
  }
  closeDetail(): void { this.detail = null; }

  verify(u: any): void {
    this.saving = true;
    this.verification.verifyUser(u.IdUser).subscribe({
      next: () => { this.saving = false; this.closeDetail(); this.load(); },
      error: () => { this.saving = false; alert('Vérification impossible.'); },
    });
  }

  reject(u: any): void {
    const reason = prompt('Raison du rejet (optionnel) :') || undefined;
    this.saving = true;
    this.verification.rejectVerification(u.IdUser, reason).subscribe({
      next: () => { this.saving = false; this.closeDetail(); this.load(); },
      error: () => { this.saving = false; alert('Rejet impossible.'); },
    });
  }
}
