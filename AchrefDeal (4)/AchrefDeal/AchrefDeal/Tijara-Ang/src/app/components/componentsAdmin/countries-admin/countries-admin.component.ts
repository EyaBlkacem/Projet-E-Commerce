import { Component, OnInit } from '@angular/core';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { CatalogAdminService } from 'src/app/core/services/catalog-admin.service';

interface CountryRow {
  id: number;
  title: string;
  flag: string;
  code: string;
  phoneCode: string;
  active: boolean;
}

@Component({
  selector: 'app-countries-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Pays" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<div class="row g-3 mb-4">
  <div class="col-md-4">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #405189">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-primary-subtle d-flex align-items-center justify-content-center">
          <i class="ri-earth-line fs-22 text-primary"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-primary">{{ statTotal }}</h3>
        <p class="mb-0 fs-12 text-muted">Total pays</p></div>
      </div>
    </div>
  </div>
  <div class="col-md-4">
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
  <div class="col-md-4">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #f06548">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-danger-subtle d-flex align-items-center justify-content-center">
          <i class="ri-close-circle-line fs-22 text-danger"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-danger">{{ statTotal - statActive }}</h3>
        <p class="mb-0 fs-12 text-muted">Désactivés</p></div>
      </div>
    </div>
  </div>
</div>

<div class="card border-0 shadow-sm">
  <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2 py-3">
    <h6 class="mb-0 fw-semibold flex-grow-1">
      <i class="ri-earth-line me-2 text-primary"></i>Liste des pays
      <span class="badge bg-primary-subtle text-primary ms-2">{{ totalItems }}</span>
    </h6>
    <div class="input-group input-group-sm" style="max-width:240px">
      <span class="input-group-text bg-white border-end-0"><i class="ri-search-line"></i></span>
      <input type="text" class="form-control border-start-0" placeholder="Nom, code…"
             [(ngModel)]="search" (input)="onSearchChange()" />
      @if (search) {
        <button class="btn btn-light border-start-0" type="button" (click)="clearSearch()" title="Effacer">
          <i class="ri-close-line"></i>
        </button>
      }
    </div>
    <button class="btn btn-sm btn-primary" (click)="openAdd()">
      <i class="ri-add-line me-1"></i>Nouveau pays
    </button>
  </div>

  <div class="card-body p-0">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    } @else if (items.length === 0) {
      <div class="text-center py-5">
        <i class="ri-earth-line display-3 text-muted opacity-50"></i>
        <p class="text-muted mt-2 mb-3">Aucun pays.</p>
        <button class="btn btn-primary" (click)="openAdd()"><i class="ri-add-line"></i> Créer le premier</button>
      </div>
    } @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th class="ps-3" style="width:60px">Drapeau</th>
              <th>Pays</th>
              <th>Code ISO</th>
              <th>Indicatif</th>
              <th class="text-center">Statut</th>
              <th class="text-end pe-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (c of items; track c.id) {
              <tr>
                <td class="ps-3">
                  @if (c.flag) {
                    <img [src]="c.flag" alt="" width="40" height="28"
                         style="object-fit:cover;border-radius:4px" (error)="c.flag=''" />
                  } @else {
                    <div class="rounded bg-primary-subtle text-primary d-flex align-items-center justify-content-center"
                         style="width:40px;height:28px;font-size:10px">{{ c.code || '?' }}</div>
                  }
                </td>
                <td class="fs-13 fw-semibold">{{ c.title || '—' }}</td>
                <td class="fs-12"><code class="text-primary">{{ c.code || '—' }}</code></td>
                <td class="fs-12 fw-semibold">{{ c.phoneCode || '—' }}</td>
                <td class="text-center">
                  @if (c.active) { <span class="badge bg-success-subtle text-success">Actif</span> }
                  @else          { <span class="badge bg-secondary-subtle text-secondary">Inactif</span> }
                </td>
                <td class="text-end pe-3">
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-light" (click)="openEdit(c)" title="Modifier">
                      <i class="ri-edit-2-line text-info"></i>
                    </button>
                    <button class="btn btn-light" (click)="toggleActive(c)" [title]="c.active ? 'Désactiver' : 'Activer'">
                      <i [class]="c.active ? 'ri-pause-circle-line text-warning' : 'ri-play-circle-line text-success'"></i>
                    </button>
                    <button class="btn btn-light" (click)="remove(c)" title="Supprimer">
                      <i class="ri-delete-bin-line text-danger"></i>
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination numérique : la page demandée est envoyée au backend -->
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-top">
        <span class="fs-12 text-muted">Page {{ currentPage }} / {{ lastPage }} — {{ totalItems }} pays</span>
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
  <div class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,.5)" (click)="cancel($event)">
    <div class="modal-dialog modal-dialog-centered" (click)="$event.stopPropagation()">
      <div class="modal-content border-0 shadow-lg">
        <div class="modal-header bg-primary-subtle">
          <h5 class="modal-title fw-bold text-primary">
            <i class="ri-earth-line me-2"></i>{{ editingId ? 'Modifier le pays' : 'Nouveau pays' }}
          </h5>
          <button type="button" class="btn-close" (click)="cancel()"></button>
        </div>
        <div class="modal-body">
          @if (saveError) {
            <div class="alert alert-danger fs-13"><i class="ri-error-warning-line me-2"></i>{{ saveError }}</div>
          }
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label fs-12 fw-semibold">Nom *</label>
              <input class="form-control form-control-sm" [(ngModel)]="form.title" placeholder="Ex : Tunisie" />
            </div>
            <div class="col-md-4">
              <label class="form-label fs-12 fw-semibold">Code ISO</label>
              <input class="form-control form-control-sm" [(ngModel)]="form.code" placeholder="TN" maxlength="3" />
            </div>
            <div class="col-md-4">
              <label class="form-label fs-12 fw-semibold">Indicatif</label>
              <input class="form-control form-control-sm" [(ngModel)]="form.phoneCode" placeholder="+216" />
            </div>
            <div class="col-md-4 d-flex align-items-end">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="active-switch" [(ngModel)]="form.active" />
                <label class="form-check-label fs-13" for="active-switch">Actif</label>
              </div>
            </div>
            <div class="col-md-9">
              <label class="form-label fs-12 fw-semibold">URL drapeau</label>
              <input class="form-control form-control-sm" [(ngModel)]="form.flag" placeholder="https://…" />
            </div>
            <div class="col-md-3 d-flex align-items-end">
              @if (form.flag) {
                <img [src]="form.flag" alt="" width="60" height="40" style="object-fit:cover;border-radius:4px" (error)="$any($event.target).src=''" />
              }
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-light" (click)="cancel()" [disabled]="saving">Annuler</button>
          <button class="btn btn-primary" (click)="save()" [disabled]="saving">
            @if (saving) { <span class="spinner-border spinner-border-sm me-1"></span> }
            <i class="ri-save-line me-1"></i> Enregistrer
          </button>
        </div>
      </div>
    </div>
  </div>
}
`,
})
export class CountriesAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Pays', active: true }];

  items: CountryRow[] = [];
  search = '';
  loading = true;
  private searchDebounce: any = null;

  currentPage = 1;
  perPage     = 10;
  totalItems  = 0;
  lastPage    = 1;

  statTotal  = 0;
  statActive = 0;

  showForm = false;
  saving   = false;
  saveError = '';
  editingId: number | null = null;
  form = { title: '', flag: '', code: '', phoneCode: '', active: true };

  constructor(private api: TijaraApiService, private catalogAdmin: CatalogAdminService) {}

  ngOnInit(): void {
    this.load();
    this.loadStats();
  }

  private buildParams(): any {
    const params: any = { page: this.currentPage, per_page: this.perPage };
    if (this.search.trim()) params.search = this.search.trim();
    return params;
  }

  load(): void {
    this.loading = true;
    this.catalogAdmin.adminList('countries', this.buildParams()).subscribe({
      next: (res: any) => {
        const data: any[] = res?.data || [];
        this.items = (data || []).map((c: any) => ({
          id:        +(c.id_country ?? c.IdCountry ?? c.id ?? 0),
          title:      c.title       ?? c.Title       ?? '',
          flag:       c.flag        ?? c.Flag        ?? '',
          code:       c.code        ?? c.Code        ?? '',
          phoneCode:  c.phone_code  ?? c.PhoneCode   ?? '',
          active:   !!(c.active     ?? c.Active     ?? true),
        }));
        this.totalItems  = res?.total        ?? this.items.length;
        this.lastPage    = res?.last_page    ?? 1;
        this.currentPage = res?.current_page ?? this.currentPage;
        this.loading = false;
      },
      error: () => { this.loading = false; alert('Chargement impossible.'); }
    });
  }

  loadStats(): void {
    this.catalogAdmin.adminList('countries', { per_page: 1 }).subscribe((res: any) => this.statTotal = res?.total ?? 0);
    this.catalogAdmin.adminList('countries', { per_page: 1, Active: 1 }).subscribe((res: any) => this.statActive = res?.total ?? 0);
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
    this.form = { title: '', flag: '', code: '', phoneCode: '', active: true };
    this.showForm = true;
  }
  openEdit(c: CountryRow): void {
    this.editingId = c.id; this.saveError = '';
    this.form = { title: c.title, flag: c.flag, code: c.code, phoneCode: c.phoneCode, active: c.active };
    this.showForm = true;
  }
  cancel(_ev?: Event): void { this.showForm = false; this.saving = false; this.saveError = ''; }

  save(): void {
    if (!this.form.title.trim()) { this.saveError = 'Le nom est requis.'; return; }
    this.saving = true; this.saveError = '';
    const payload = { Title: this.form.title, Flag: this.form.flag, Code: this.form.code, PhoneCode: this.form.phoneCode, Active: this.form.active };
    const op = this.editingId
      ? this.catalogAdmin.adminUpdate('countries', this.editingId, payload)
      : this.catalogAdmin.adminCreate('countries', payload);
    op.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); this.loadStats(); },
      error: (err) => { this.saving = false; this.saveError = err?.error?.message || 'Erreur d\'enregistrement.'; },
    });
  }

  toggleActive(c: CountryRow): void {
    this.catalogAdmin.adminUpdate('countries', c.id, {
      Title: c.title, Flag: c.flag, Code: c.code, PhoneCode: c.phoneCode, Active: !c.active,
    }).subscribe({
      next: () => { c.active = !c.active; this.loadStats(); },
      error: () => alert('Action impossible.'),
    });
  }

  remove(c: CountryRow): void {
    if (!confirm(`Supprimer le pays "${c.title}" ?`)) return;
    this.catalogAdmin.adminDelete('countries', c.id).subscribe({
      next: () => { this.load(); this.loadStats(); },
      error: () => alert('Suppression impossible (le pays peut être référencé par des villes).'),
    });
  }
}