import { Component, OnInit } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import { expand, reduce } from 'rxjs/operators';
import { WalletsService } from 'src/app/core/services/wallets.service';
import { CatalogAdminService } from 'src/app/core/services/catalog-admin.service';

interface WalletRow {
  id: number;
  idUser: number;
  userName: string;
  email: string;
  icn: string;
  tokens: number;
  budget: number;
  blocked: number;
  transferred: number;
  active: boolean;
}

@Component({
  selector: 'app-wallets-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Wallets" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<div class="card border-0 shadow-sm">
  <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2 py-3">
    <h6 class="mb-0 fw-semibold flex-grow-1">
      <i class="ri-wallet-3-line me-2 text-info"></i>Wallets
      <span class="badge bg-info-subtle text-info ms-2">{{ totalItems }}</span>
    </h6>
    <div class="input-group input-group-sm" style="max-width:240px">
      <span class="input-group-text bg-white border-end-0"><i class="ri-search-line"></i></span>
      <input type="text" class="form-control border-start-0" placeholder="Client, email…"
             [(ngModel)]="search" (input)="onSearchChange()" />
    </div>
    <select class="form-select form-select-sm" style="max-width:160px" [(ngModel)]="filter" (change)="setFilter()">
      <option value="">Tous</option>
      <option value="active">Actifs</option>
      <option value="inactive">Inactifs</option>
    </select>
  </div>

  <div class="card-body p-0">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-info"></div></div>
    } @else if (rows.length === 0) {
      <div class="text-center py-5">
        <i class="ri-wallet-3-line display-3 text-muted opacity-50"></i>
        <p class="text-muted mt-2 mb-0">Aucun wallet ne correspond.</p>
      </div>
    } @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th class="ps-3">Utilisateur</th>
              <th>ICN</th>
              <th class="text-end">Jetons</th>
              <th class="text-end">Budget disponible</th>
              <th class="text-end">Bloqué</th>
              <th class="text-end">Transféré</th>
              <th class="text-center">Actif</th>
              <th class="text-end pe-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (w of rows; track w.id) {
              <tr>
                <td class="ps-3">
                  <div class="fs-13 fw-semibold">{{ w.userName }}</div>
                  <div class="fs-11 text-muted">{{ w.email }}</div>
                </td>
                <td class="fs-13">{{ w.icn || '—' }}</td>
                <td class="text-end fw-semibold">{{ w.tokens }}</td>
                <td class="text-end text-success fw-semibold">{{ w.budget | number:'1.2-3' }} TND</td>
                <td class="text-end text-warning">{{ w.blocked | number:'1.2-3' }} TND</td>
                <td class="text-end text-muted">{{ w.transferred | number:'1.2-3' }} TND</td>
                <td class="text-center">
                  <div class="form-check form-switch d-inline-block">
                    <input class="form-check-input" type="checkbox" role="switch"
                           [checked]="w.active" (change)="toggleActive(w)" />
                  </div>
                </td>
                <td class="text-end pe-3">
                  <button class="btn btn-sm btn-light" (click)="openEdit(w)"><i class="ri-edit-2-line"></i></button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-top">
        <span class="fs-12 text-muted">Page {{ page }} / {{ totalPages }} — {{ totalItems }} wallet(s)</span>
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

@if (editing) {
  <div class="modal d-block" style="background:rgba(0,0,0,.5)" (click)="closeEdit()">
    <div class="modal-dialog modal-dialog-centered" (click)="$event.stopPropagation()">
      <div class="modal-content">
        <div class="modal-header">
          <h6 class="modal-title">Modifier le wallet — {{ editing.userName }}</h6>
          <button class="btn-close" (click)="closeEdit()"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label fs-13">Jetons</label>
            <input type="number" class="form-control" [(ngModel)]="editForm.tokens" />
          </div>
          <div class="mb-3">
            <label class="form-label fs-13">Budget disponible (TND)</label>
            <input type="number" step="0.001" class="form-control" [(ngModel)]="editForm.budget" />
          </div>
          <div class="mb-3">
            <label class="form-label fs-13">Argent bloqué (TND)</label>
            <input type="number" step="0.001" class="form-control" [(ngModel)]="editForm.blocked" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-light" (click)="closeEdit()">Annuler</button>
          <button class="btn btn-primary" (click)="saveEdit()">Enregistrer</button>
        </div>
      </div>
    </div>
  </div>
}
`,
})
export class WalletsAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Wallets', active: true }];

  rows: WalletRow[] = [];
  search = '';
  filter = '';
  loading = true;
  private searchDebounce: any = null;

  page = 1;
  perPage = 10;
  totalItems = 0;
  totalPages = 1;

  editing: WalletRow | null = null;
  editForm: { tokens: number; budget: number; blocked: number } = { tokens: 0, budget: 0, blocked: 0 };

  private usersMap: Record<number, { name: string; email: string }> = {};

  constructor(private wallets: WalletsService, private catalogAdmin: CatalogAdminService) {}

  private fetchAllPages(path: string): Observable<any[]> {
    const PAGE_SIZE = 50;
    const SAFETY_MAX_PAGES = 200;
    const fetchPage = (page: number) =>
      this.catalogAdmin.adminList(path, { per_page: PAGE_SIZE, page });
    return fetchPage(1).pipe(
      expand((res: any) => {
        const current = Number(res?.current_page ?? 1);
        const last    = Number(res?.last_page ?? current);
        if (current >= last || current >= SAFETY_MAX_PAGES) return EMPTY;
        return fetchPage(current + 1);
      }),
      reduce((acc: any[], res: any) => acc.concat(res?.data || []), [] as any[])
    );
  }

  ngOnInit(): void {
    this.fetchAllPages('users').subscribe({
      next: (users) => {
        (users || []).forEach((u: any) => {
          this.usersMap[u.IdUser] = {
            name: `${u.FirstName || ''} ${u.LastName || ''}`.trim() || u.Username || '—',
            email: u.Email || '',
          };
        });
        this.load();
      },
      error: () => this.load(),
    });
  }

  private buildParams(): any {
    const params: any = { page: this.page, per_page: this.perPage };
    if (this.search.trim()) params.search = this.search.trim();
    if (this.filter === 'active')   params.Active = 1;
    if (this.filter === 'inactive') params.Active = 0;
    return params;
  }

  load(): void {
    this.loading = true;
    this.wallets.getWallets(this.buildParams()).subscribe({
      next: (res: any) => {
        this.rows = (res?.data || []).map((w: any) => this.mapRow(w));
        this.totalItems = res?.total        ?? this.rows.length;
        this.totalPages = res?.last_page    ?? 1;
        this.page       = res?.current_page ?? this.page;
        this.loading = false;
      },
      error: () => { this.loading = false; alert('Chargement impossible.'); }
    });
  }

  private mapRow(w: any): WalletRow {
    const u = this.usersMap[w.IdUser];
    return {
      id: w.IdWallet,
      idUser: w.IdUser,
      userName: u?.name || `Utilisateur #${w.IdUser}`,
      email: u?.email || '',
      icn: w.ICN,
      tokens: +(w.NbrJeton ?? 0),
      budget: +(w.MoneyBudget ?? 0),
      blocked: +(w.MoneyBlocked ?? 0),
      transferred: +(w.MoneyTransfered ?? 0),
      active: !!w.Active,
    };
  }

  onSearchChange(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.page = 1; this.load(); }, 400);
  }

  setFilter(): void { this.page = 1; this.load(); }
  goToPage(p: number): void { if (p >= 1 && p <= this.totalPages && p !== this.page) { this.page = p; this.load(); } }

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

  toggleActive(w: WalletRow): void {
    const newValue = !w.active;
    this.wallets.toggleActive(w.id, newValue).subscribe({
      next: () => { w.active = newValue; },
      error: () => alert('Action impossible.'),
    });
  }

  openEdit(w: WalletRow): void {
    this.editing = w;
    this.editForm = { tokens: w.tokens, budget: w.budget, blocked: w.blocked };
  }
  closeEdit(): void { this.editing = null; }

  saveEdit(): void {
    if (!this.editing) return;
    this.wallets.updateWallet(this.editing.id, {
      NbrJeton: this.editForm.tokens,
      MoneyBudget: this.editForm.budget,
      MoneyBlocked: this.editForm.blocked,
    }).subscribe({
      next: () => { this.closeEdit(); this.load(); },
      error: (err) => alert(err?.error?.message || 'Enregistrement impossible.'),
    });
  }
}
