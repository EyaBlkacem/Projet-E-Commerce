import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { UsersVendorsService } from 'src/app/core/services/users-vendors.service';

interface UserRow {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  isPremium: boolean;
  createdAt: string | null;
  photo: string;
}

@Component({
  selector: 'app-users-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Utilisateurs" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<div class="row g-3 mb-4">
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #405189">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-primary-subtle d-flex align-items-center justify-content-center">
          <i class="ri-user-3-line fs-22 text-primary"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-primary">{{ statTotal }}</h3>
        <p class="mb-0 fs-12 text-muted">Total utilisateurs</p></div>
      </div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #0ab39c">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-success-subtle d-flex align-items-center justify-content-center">
          <i class="ri-checkbox-circle-line fs-22 text-success"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-success">{{ statActive }}</h3>
        <p class="mb-0 fs-12 text-muted">Actifs</p></div>
      </div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #f7b84b">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-warning-subtle d-flex align-items-center justify-content-center">
          <i class="ri-vip-crown-line fs-22 text-warning"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-warning">{{ statPremium }}</h3>
        <p class="mb-0 fs-12 text-muted">Premium</p></div>
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
      <i class="ri-user-3-line me-2 text-primary"></i>Liste des utilisateurs
      <span class="badge bg-primary-subtle text-primary ms-2">{{ totalItems }}</span>
    </h6>
    <div class="input-group input-group-sm" style="max-width:260px">
      <span class="input-group-text bg-white border-end-0"><i class="ri-search-line"></i></span>
      <input type="text" class="form-control border-start-0" placeholder="Nom, prénom, email, téléphone…"
             [(ngModel)]="search" (input)="onSearchChange()" />
      @if (search) {
        <button class="btn btn-light border-start-0" type="button" (click)="clearSearch()" title="Effacer">
          <i class="ri-close-line"></i>
        </button>
      }
    </div>
    <div class="btn-group btn-group-sm">
      <button class="btn" [class.btn-primary]="filter===''"        [class.btn-light]="filter!==''"        (click)="setFilter('')">Tous</button>
      <button class="btn" [class.btn-primary]="filter==='active'"  [class.btn-light]="filter!=='active'"  (click)="setFilter('active')">Actifs</button>
      <button class="btn" [class.btn-primary]="filter==='blocked'" [class.btn-light]="filter!=='blocked'" (click)="setFilter('blocked')">Bloqués</button>
      <button class="btn" [class.btn-primary]="filter==='premium'" [class.btn-light]="filter!=='premium'" (click)="setFilter('premium')">Premium</button>
    </div>
  </div>

  <div class="card-body p-0">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    } @else if (users.length === 0) {
      <div class="text-center py-5">
        <i class="ri-user-search-line display-3 text-muted opacity-50"></i>
        <p class="text-muted mt-2 mb-0">Aucun utilisateur ne correspond.</p>
      </div>
    } @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th class="ps-3">#</th>
              <th>Utilisateur</th>
              <th>Téléphone</th>
              <th class="text-center">Statut</th>
              <th class="text-center">Premium</th>
              <th>Inscrit le</th>
              <th class="text-end pe-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (u of users; track u.id) {
              <tr>
                <td class="ps-3 fs-12 text-muted">#{{ u.id }}</td>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    @if (u.photo) {
                      <img [src]="u.photo" (error)="u.photo = ''" class="avatar-sm rounded-circle" style="object-fit:cover" />
                    } @else {
                      <div class="avatar-sm rounded-circle bg-primary-subtle text-primary
                                  d-flex align-items-center justify-content-center fw-bold fs-13">
                        {{ getInitials(u.fullName) }}
                      </div>
                    }
                    <div class="min-w-0">
                      <div class="fs-13 fw-semibold text-truncate">{{ u.fullName || '—' }}</div>
                      <div class="fs-11 text-muted text-truncate">{{ u.email }}</div>
                    </div>
                  </div>
                </td>
                <td class="fs-13">{{ u.phone || '—' }}</td>
                <td class="text-center">
                  @if (u.isActive) {
                    <span class="badge bg-success-subtle text-success">Actif</span>
                  } @else {
                    <span class="badge bg-danger-subtle text-danger">Bloqué</span>
                  }
                </td>
                <td class="text-center">
                  @if (u.isPremium) {
                    <i class="ri-vip-crown-fill text-warning fs-18"></i>
                  } @else {
                    <i class="ri-vip-crown-line text-muted fs-18 opacity-50"></i>
                  }
                </td>
                <td class="fs-12 text-muted">{{ formatDate(u.createdAt) }}</td>
                <td class="text-end pe-3">
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-light" (click)="view(u)" title="Détails">
                      <i class="ri-eye-line text-info"></i>
                    </button>
                    <button class="btn btn-light" (click)="togglePremium(u)" title="Premium">
                      <i class="ri-vip-crown-line" [class.text-warning]="u.isPremium" [class.text-muted]="!u.isPremium"></i>
                    </button>
                    <button class="btn btn-light" (click)="toggleActive(u)" [title]="u.isActive ? 'Bloquer' : 'Activer'">
                      <i [class]="u.isActive ? 'ri-lock-line text-warning' : 'ri-shield-check-line text-success'"></i>
                    </button>
                    <button class="btn btn-light" (click)="delete(u)" title="Supprimer">
                      <i class="ri-delete-bin-line text-danger"></i>
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
          Page {{ currentPage }} / {{ lastPage }} — {{ totalItems }} utilisateur(s)
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
export class UsersAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Utilisateurs', active: true }];

  users: UserRow[] = [];
  loading = true;

  search = '';
  filter = '';
  private searchDebounce: any = null;

  currentPage = 1;
  perPage     = 10;
  totalItems  = 0;
  lastPage    = 1;

  statTotal   = 0;
  statActive  = 0;
  statPremium = 0;
  statBlocked = 0;

  constructor(private api: TijaraApiService, private usersVendors: UsersVendorsService, private router: Router) {}

  ngOnInit(): void {
    this.load();
    this.loadStats();
  }

  private buildParams(): any {
    const params: any = { page: this.currentPage, per_page: this.perPage };
    if (this.search.trim()) params.search = this.search.trim();
    if (this.filter === 'active')  params.Active = 1;
    if (this.filter === 'blocked') params.Active = 0;
    if (this.filter === 'premium') params.IsPremuim = 1;
    return params;
  }

  private mapRow(u: any): UserRow {
    return {
      id:          u.IdUser,
      fullName:    `${u.FirstName || ''} ${u.LastName || ''}`.trim() || u.Username || '—',
      email:       u.Email || '',
      phone:       u.Telephone || '',
      role:        u.IdRole === 3 ? 'admin' : u.IdRole === 2 ? 'vendor' : 'user',
      isActive:    !!u.Active,
      isVerified:  !!u.IsVerified,
      isPremium:   !!u.IsPremuim,
      createdAt:   u.CreationDate || null,
      photo:       `${this.usersVendors.assetBaseUrl}/assets/users/profiles/user_${u.IdUser}.jpg`,
    };
  }

  load(): void {
    this.loading = true;
    this.usersVendors.getAdminAllUsers(this.buildParams()).subscribe({
      next: (res: any) => {
        this.users      = (res?.data || []).map((u: any) => this.mapRow(u));
        this.totalItems = res?.total        ?? this.users.length;
        this.lastPage   = res?.last_page    ?? 1;
        this.currentPage= res?.current_page ?? this.currentPage;
        this.loading = false;
      },
      error: () => { this.loading = false; alert('Chargement impossible.'); }
    });
  }

  loadStats(): void {
    this.usersVendors.getAdminAllUsers({ per_page: 1 }).subscribe((res: any) => this.statTotal = res?.total ?? 0);
    this.usersVendors.getAdminAllUsers({ per_page: 1, Active: 1 }).subscribe((res: any) => this.statActive = res?.total ?? 0);
    this.usersVendors.getAdminAllUsers({ per_page: 1, Active: 0 }).subscribe((res: any) => this.statBlocked = res?.total ?? 0);
    this.usersVendors.getAdminAllUsers({ per_page: 1, IsPremuim: 1 }).subscribe((res: any) => this.statPremium = res?.total ?? 0);
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

  view(u: UserRow): void { this.router.navigate(['/admin/user-detail', u.id]); }

  toggleActive(u: UserRow): void {
    const newValue = u.isActive ? 0 : 1;
    this.usersVendors.updateAdminUser(u.id, { Active: newValue }).subscribe({
      next: () => { u.isActive = !u.isActive; this.loadStats(); },
      error: () => alert('Action impossible.'),
    });
  }
  togglePremium(u: UserRow): void {
    const newValue = u.isPremium ? 0 : 1;
    this.usersVendors.updateAdminUser(u.id, { IsPremuim: newValue }).subscribe({
      next: () => { u.isPremium = !u.isPremium; this.loadStats(); },
      error: () => alert('Action impossible.'),
    });
  }
  delete(u: UserRow): void {
    if (!confirm(`Supprimer définitivement ${u.fullName} ?`)) return;
    this.usersVendors.deleteAdminUser(u.id).subscribe({
      next: () => { this.load(); this.loadStats(); },
      error: (err) => alert('Suppression impossible : ' + (err?.error?.message || err?.message || '')),
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
