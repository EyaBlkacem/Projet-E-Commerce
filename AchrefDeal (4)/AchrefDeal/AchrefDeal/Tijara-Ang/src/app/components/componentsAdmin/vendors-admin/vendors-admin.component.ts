import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { UsersVendorsService } from 'src/app/core/services/users-vendors.service';

interface VendorRow {
  id: number;
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string | null;
  avatar: string;
}

@Component({
  selector: 'app-vendors-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Gestion Vendeurs" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<div class="row g-3 mb-4">
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #0ab39c">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-success-subtle d-flex align-items-center justify-content-center">
          <i class="ri-store-2-line fs-22 text-success"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-success">{{ statTotal }}</h3>
        <p class="mb-0 fs-12 text-muted">Total vendeurs</p></div>
      </div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #0ab39c">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-success-subtle d-flex align-items-center justify-content-center">
          <i class="ri-checkbox-circle-line fs-22 text-success"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-success">{{ statApproved }}</h3>
        <p class="mb-0 fs-12 text-muted">Approuvés</p></div>
      </div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #f7b84b">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-warning-subtle d-flex align-items-center justify-content-center">
          <i class="ri-time-line fs-22 text-warning"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-warning">{{ statPending }}</h3>
        <p class="mb-0 fs-12 text-muted">À valider</p></div>
      </div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #f06548">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-danger-subtle d-flex align-items-center justify-content-center">
          <i class="ri-shield-cross-line fs-22 text-danger"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-danger">{{ statBlocked }}</h3>
        <p class="mb-0 fs-12 text-muted">Bloqués</p></div>
      </div>
    </div>
  </div>
</div>

<div class="card border-0 shadow-sm">
  <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2 py-3">
    <h6 class="mb-0 fw-semibold flex-grow-1">
      <i class="ri-store-2-line me-2 text-success"></i>Liste des vendeurs
      <span class="badge bg-success-subtle text-success ms-2">{{ totalItems }}</span>
    </h6>
    <div class="input-group input-group-sm" style="max-width:260px">
      <span class="input-group-text bg-white border-end-0"><i class="ri-search-line"></i></span>
      <input type="text" class="form-control border-start-0" placeholder="Boutique, nom, email, téléphone…"
             [(ngModel)]="search" (input)="onSearchChange()" />
      @if (search) {
        <button class="btn btn-light border-start-0" type="button" (click)="clearSearch()" title="Effacer">
          <i class="ri-close-line"></i>
        </button>
      }
    </div>
    <div class="btn-group btn-group-sm">
      <button class="btn" [class.btn-primary]="filter===''"         [class.btn-light]="filter!==''"         (click)="setFilter('')">Tous</button>
      <button class="btn" [class.btn-primary]="filter==='approved'" [class.btn-light]="filter!=='approved'" (click)="setFilter('approved')">Approuvés</button>
      <button class="btn" [class.btn-primary]="filter==='pending'"  [class.btn-light]="filter!=='pending'"  (click)="setFilter('pending')">À valider</button>
      <button class="btn" [class.btn-primary]="filter==='blocked'"  [class.btn-light]="filter!=='blocked'"  (click)="setFilter('blocked')">Bloqués</button>
    </div>
  </div>

  <div class="card-body p-0">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-success"></div></div>
    } @else if (vendors.length === 0) {
      <div class="text-center py-5">
        <i class="ri-store-line display-3 text-muted opacity-50"></i>
        <p class="text-muted mt-2 mb-0">Aucun vendeur ne correspond.</p>
      </div>
    } @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th class="ps-3">#</th>
              <th>Boutique</th>
              <th>Propriétaire</th>
              <th>Téléphone</th>
              <th class="text-center">Validation</th>
              <th class="text-center">Statut</th>
              <th>Inscrit le</th>
              <th class="text-end pe-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (v of vendors; track v.id) {
              <tr>
                <td class="ps-3 fs-12 text-muted">#{{ v.id }}</td>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    @if (v.avatar) {
                      <img [src]="v.avatar" (error)="v.avatar=''" alt=""
                           class="avatar-sm rounded-3" style="object-fit:cover" />
                    } @else {
                      <div class="avatar-sm rounded-3 bg-success-subtle text-success
                                  d-flex align-items-center justify-content-center fw-bold fs-13">
                        {{ getInitials(v.shopName) }}
                      </div>
                    }
                    <div class="min-w-0">
                      <div class="fs-13 fw-semibold text-truncate">{{ v.shopName || '—' }}</div>
                      <div class="fs-11 text-muted text-truncate">{{ v.email }}</div>
                    </div>
                  </div>
                </td>
                <td class="fs-13">{{ v.ownerName }}</td>
                <td class="fs-13">{{ v.phone || '—' }}</td>
                <td class="text-center">
                  @if (v.isApproved) {
                    <span class="badge bg-success-subtle text-success"><i class="ri-shield-check-line me-1"></i>Validé</span>
                  } @else {
                    <span class="badge bg-warning-subtle text-warning">En attente</span>
                  }
                </td>
                <td class="text-center">
                  @if (v.isActive) {
                    <span class="badge bg-success-subtle text-success">Actif</span>
                  } @else {
                    <span class="badge bg-danger-subtle text-danger">Bloqué</span>
                  }
                </td>
                <td class="fs-12 text-muted">{{ formatDate(v.createdAt) }}</td>
                <td class="text-end pe-3">
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-light" (click)="view(v)" title="Détails">
                      <i class="ri-eye-line text-info"></i>
                    </button>
                    @if (!v.isApproved) {
                      <button class="btn btn-light" (click)="approve(v)" title="Approuver">
                        <i class="ri-check-line text-success"></i>
                      </button>
                    }
                    <button class="btn btn-light" (click)="toggleActive(v)" [title]="v.isActive ? 'Bloquer' : 'Activer'">
                      <i [class]="v.isActive ? 'ri-lock-line text-warning' : 'ri-shield-check-line text-success'"></i>
                    </button>
                    <button class="btn btn-light" (click)="reject(v)" title="Rejeter">
                      <i class="ri-close-line text-danger"></i>
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination numérique : la page demandée est envoyée au backend, pas de découpage côté Angular -->
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-top">
        <span class="fs-12 text-muted">
          Page {{ currentPage }} / {{ lastPage }} — {{ totalItems }} vendeur(s)
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
`,
})
export class VendorsAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Gestion Vendeurs', active: true }];

  vendors: VendorRow[] = [];
  loading = true;

  search = '';
  filter = '';
  private searchDebounce: any = null;

  currentPage = 1;
  perPage     = 10;
  totalItems  = 0;
  lastPage    = 1;

  statTotal    = 0;
  statApproved = 0;
  statPending  = 0;
  statBlocked  = 0;

  constructor(private api: TijaraApiService, private usersVendors: UsersVendorsService, private router: Router) {}

  ngOnInit(): void {
    this.load();
    this.loadStats();
  }

  private buildParams(): any {
    const params: any = { page: this.currentPage, per_page: this.perPage };
    if (this.search.trim()) params.search = this.search.trim();
    if (this.filter === 'approved') params.IsBusinessAccount = 1;
    if (this.filter === 'pending')  params.IsBusinessAccount = 0;
    if (this.filter === 'blocked')  params.Active = 0;
    return params;
  }

  private mapRow(u: any): VendorRow {
    return {
      id:         u.IdUser,
      shopName:   `${u.FirstName || ''} ${u.LastName || ''}`.trim() || u.Username || u.Email,
      ownerName:  `${u.FirstName || ''} ${u.LastName || ''}`.trim() || '—',
      email:      u.Email || '',
      phone:      u.Telephone || '',
      isActive:   !!u.Active,
      isApproved: !!u.IsBusinessAccount,
      createdAt:  u.CreationDate || null,
      avatar:     `${this.usersVendors.assetBaseUrl}/assets/users/profiles/user_${u.IdUser}.jpg`,
    };
  }

  load(): void {
    this.loading = true;
    this.usersVendors.getAllVendors(this.buildParams()).subscribe({
      next: (res: any) => {
        this.vendors     = (res?.data || []).map((u: any) => this.mapRow(u));
        this.totalItems  = res?.total        ?? this.vendors.length;
        this.lastPage    = res?.last_page    ?? 1;
        this.currentPage = res?.current_page ?? this.currentPage;
        this.loading = false;
      },
      error: () => { this.loading = false; alert('Chargement impossible.'); }
    });
  }

  loadStats(): void {
    this.usersVendors.getAllVendors({ per_page: 1 }).subscribe((res: any) => this.statTotal = res?.total ?? 0);
    this.usersVendors.getAllVendors({ per_page: 1, IsBusinessAccount: 1 }).subscribe((res: any) => this.statApproved = res?.total ?? 0);
    this.usersVendors.getAllVendors({ per_page: 1, IsBusinessAccount: 0 }).subscribe((res: any) => this.statPending = res?.total ?? 0);
    this.usersVendors.getAllVendors({ per_page: 1, Active: 0 }).subscribe((res: any) => this.statBlocked = res?.total ?? 0);
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

  setFilter(f: string): void {
    this.filter = f;
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

    const delta = 1; // pages visibles de chaque côté de la page courante
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

  view(v: VendorRow): void { this.router.navigate(['/admin/vendor-detail', v.id]); }

  approve(v: VendorRow): void {
    this.usersVendors.approveVendor(v.id).subscribe({
      next: () => { v.isApproved = true; this.loadStats(); },
      error: () => alert('Approbation impossible.'),
    });
  }
  reject(v: VendorRow): void {
    if (!confirm(`Retirer le statut vendeur validé de ${v.shopName} ?`)) return;
    this.usersVendors.rejectVendor(v.id).subscribe({
      next: () => { v.isApproved = false; this.loadStats(); },
      error: () => alert('Action impossible.'),
    });
  }
  toggleActive(v: VendorRow): void {
    const newValue = v.isActive ? 0 : 1;
    this.usersVendors.updateAdminUser(v.id, { Active: newValue }).subscribe({
      next: () => { v.isActive = !v.isActive; this.loadStats(); },
      error: () => alert('Action impossible.'),
    });
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
  }
  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }
}
