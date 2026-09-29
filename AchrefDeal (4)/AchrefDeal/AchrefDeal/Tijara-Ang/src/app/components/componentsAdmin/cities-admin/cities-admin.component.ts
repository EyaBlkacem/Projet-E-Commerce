import { Component, OnInit } from '@angular/core';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { CatalogAdminService } from 'src/app/core/services/catalog-admin.service';

interface CityRow {
  id: number;
  title: string;
  titleEn: string;
  titleAr: string;
  idCountry: number;
  countryName: string;
  image: string;
  active: boolean;
}

@Component({
  selector: 'app-cities-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Villes" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<div class="row g-3 mb-4">
  <div class="col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #0ab39c">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-success-subtle d-flex align-items-center justify-content-center">
          <i class="ri-building-line fs-22 text-success"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-success">{{ statTotal }}</h3>
        <p class="mb-0 fs-12 text-muted">Total villes</p></div>
      </div>
    </div>
  </div>
  <div class="col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #405189">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-primary-subtle d-flex align-items-center justify-content-center">
          <i class="ri-earth-line fs-22 text-primary"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-primary">{{ countries.length }}</h3>
        <p class="mb-0 fs-12 text-muted">Pays disponibles</p></div>
      </div>
    </div>
  </div>
  <div class="col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #0ab39c">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-success-subtle d-flex align-items-center justify-content-center">
          <i class="ri-checkbox-circle-line fs-22 text-success"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-success">{{ statActive }}</h3>
        <p class="mb-0 fs-12 text-muted">Actives</p></div>
      </div>
    </div>
  </div>
  <div class="col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #f06548">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-danger-subtle d-flex align-items-center justify-content-center">
          <i class="ri-close-circle-line fs-22 text-danger"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-danger">{{ statTotal - statActive }}</h3>
        <p class="mb-0 fs-12 text-muted">Désactivées</p></div>
      </div>
    </div>
  </div>
</div>

<div class="card border-0 shadow-sm">
  <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2 py-3">
    <h6 class="mb-0 fw-semibold flex-grow-1">
      <i class="ri-building-line me-2 text-success"></i>Liste des villes
      <span class="badge bg-success-subtle text-success ms-2">{{ totalItems }}</span>
    </h6>
    <div class="input-group input-group-sm" style="max-width:240px">
      <span class="input-group-text bg-white border-end-0"><i class="ri-search-line"></i></span>
      <input type="text" class="form-control border-start-0" placeholder="Nom (FR/EN/AR)…"
             [(ngModel)]="search" (input)="onSearchChange()" />
      @if (search) {
        <button class="btn btn-light border-start-0" type="button" (click)="clearSearch()" title="Effacer">
          <i class="ri-close-line"></i>
        </button>
      }
    </div>
    <select class="form-select form-select-sm" style="max-width:180px"
            [(ngModel)]="filterCountry" (change)="applyFilter()">
      <option [ngValue]="0">Tous les pays</option>
      @for (c of countries; track c.id) { <option [ngValue]="c.id">{{ c.title }}</option> }
    </select>
    <button class="btn btn-sm btn-success" (click)="openAdd()">
      <i class="ri-add-line me-1"></i>Nouvelle ville
    </button>
  </div>

  <div class="card-body p-0">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-success"></div></div>
    } @else if (items.length === 0) {
      <div class="text-center py-5">
        <i class="ri-building-line display-3 text-muted opacity-50"></i>
        <p class="text-muted mt-2 mb-3">Aucune ville.</p>
        <button class="btn btn-success" (click)="openAdd()"><i class="ri-add-line"></i> Créer la première</button>
      </div>
    } @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th class="ps-3" style="width:80px">Image</th>
              <th>Ville (FR)</th>
              <th>EN</th>
              <th>AR</th>
              <th>Pays</th>
              <th class="text-center">Statut</th>
              <th class="text-end pe-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (c of items; track c.id) {
              <tr>
                <td class="ps-3">
                  @if (c.image) {
                    <img [src]="c.image" alt="" class="rounded" width="48" height="48"
                         style="object-fit:cover" (error)="c.image=''" />
                  } @else {
                    <div class="rounded bg-success-subtle text-success d-flex align-items-center justify-content-center"
                         style="width:48px;height:48px">
                      <i class="ri-building-line fs-20"></i>
                    </div>
                  }
                </td>
                <td class="fs-13 fw-semibold">{{ c.title || '—' }}</td>
                <td class="fs-12 text-muted">{{ c.titleEn || '—' }}</td>
                <td class="fs-12 text-muted" dir="rtl">{{ c.titleAr || '—' }}</td>
                <td class="fs-12">
                  @if (c.countryName) {
                    <span class="badge bg-primary-subtle text-primary"><i class="ri-earth-line me-1"></i>{{ c.countryName }}</span>
                  } @else { <span class="text-muted">—</span> }
                </td>
                <td class="text-center">
                  @if (c.active) { <span class="badge bg-success-subtle text-success">Active</span> }
                  @else          { <span class="badge bg-secondary-subtle text-secondary">Inactive</span> }
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
        <span class="fs-12 text-muted">Page {{ currentPage }} / {{ lastPage }} — {{ totalItems }} ville(s)</span>
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
    <div class="modal-dialog modal-lg modal-dialog-centered" (click)="$event.stopPropagation()">
      <div class="modal-content border-0 shadow-lg">
        <div class="modal-header bg-success-subtle">
          <h5 class="modal-title fw-bold text-success">
            <i class="ri-building-line me-2"></i>{{ editingId ? 'Modifier la ville' : 'Nouvelle ville' }}
          </h5>
          <button type="button" class="btn-close" (click)="cancel()"></button>
        </div>
        <div class="modal-body">
          @if (saveError) {
            <div class="alert alert-danger fs-13"><i class="ri-error-warning-line me-2"></i>{{ saveError }}</div>
          }
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fs-12 fw-semibold">Nom (FR) *</label>
              <input class="form-control form-control-sm" [(ngModel)]="form.title" placeholder="Ex : Tunis" />
            </div>
            <div class="col-md-6">
              <label class="form-label fs-12 fw-semibold">Pays *</label>
              <select class="form-select form-select-sm" [(ngModel)]="form.idCountry">
                <option [ngValue]="0">— Sélectionner —</option>
                @for (c of countries; track c.id) { <option [ngValue]="c.id">{{ c.title }}</option> }
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label fs-12 fw-semibold">Nom (EN)</label>
              <input class="form-control form-control-sm" [(ngModel)]="form.titleEn" />
            </div>
            <div class="col-md-6">
              <label class="form-label fs-12 fw-semibold">Nom (AR)</label>
              <input class="form-control form-control-sm" [(ngModel)]="form.titleAr" dir="rtl" />
            </div>
            <div class="col-md-9">
              <label class="form-label fs-12 fw-semibold">URL image</label>
              <input class="form-control form-control-sm" [(ngModel)]="form.image" placeholder="https://…" />
            </div>
            <div class="col-md-3 d-flex align-items-end">
              @if (form.image) {
                <img [src]="form.image" alt="" class="rounded" width="60" height="60" style="object-fit:cover" (error)="$any($event.target).src=''" />
              }
            </div>
            <div class="col-12">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="city-active" [(ngModel)]="form.active" />
                <label class="form-check-label fs-13" for="city-active">Ville active</label>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-light" (click)="cancel()" [disabled]="saving">Annuler</button>
          <button class="btn btn-success" (click)="save()" [disabled]="saving">
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
export class CitiesAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Villes', active: true }];

  items: CityRow[]    = [];
  countries: { id: number; title: string }[] = [];
  search = '';
  filterCountry = 0;
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
  form = { title: '', titleEn: '', titleAr: '', idCountry: 0, image: '', active: true };

  constructor(private api: TijaraApiService, private catalogAdmin: CatalogAdminService) {}

  ngOnInit(): void {
    this.loadCountries();
    this.load();
    this.loadStats();
  }

  // Référentiel pays (~200 max) : chargé une fois, sert de lookup pour le
  // select + la résolution du nom de pays par ville — ce n'est pas la
  // ressource paginée elle-même (voir countries-admin pour ça).
  loadCountries(): void {
    this.catalogAdmin.adminList('countries', { per_page: 300 }).subscribe((res: any) => {
      const countriesArr: any[] = res?.data || res || [];
      this.countries = (countriesArr || []).map((c: any) => ({
        id:    +(c.id_country ?? c.IdCountry ?? c.id ?? 0),
        title:  c.title       ?? c.Title     ?? '',
      })).filter((c: any) => c.id > 0);
    });
  }

  private buildParams(): any {
    const params: any = { page: this.currentPage, per_page: this.perPage };
    if (this.search.trim()) params.search = this.search.trim();
    if (this.filterCountry > 0) params.IdCountry = this.filterCountry;
    return params;
  }

  load(): void {
    this.loading = true;
    this.catalogAdmin.adminList('cities', this.buildParams()).subscribe({
      next: (res: any) => {
        const citiesArr: any[] = res?.data || [];
        const cmap = new Map(this.countries.map(c => [c.id, c.title]));
        this.items = (citiesArr || []).map((c: any) => {
          const idCountry = +(c.id_country ?? c.IdCountry ?? 0);
          return {
            id:        +(c.id_city ?? c.IdCity ?? c.id ?? 0),
            title:      c.title    ?? c.Title    ?? '',
            titleEn:    c.title_en ?? c.TitleEn  ?? '',
            titleAr:    c.title_ar ?? c.TitleAr  ?? '',
            idCountry,
            countryName: cmap.get(idCountry) || '',
            image:      c.image    ?? c.Image    ?? '',
            active:   !!(c.active  ?? c.Active  ?? true),
          };
        });
        this.totalItems  = res?.total        ?? this.items.length;
        this.lastPage    = res?.last_page    ?? 1;
        this.currentPage = res?.current_page ?? this.currentPage;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadStats(): void {
    this.catalogAdmin.adminList('cities', { per_page: 1 }).subscribe((res: any) => this.statTotal = res?.total ?? 0);
    this.catalogAdmin.adminList('cities', { per_page: 1, Active: 1 }).subscribe((res: any) => this.statActive = res?.total ?? 0);
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
    this.form = { title: '', titleEn: '', titleAr: '', idCountry: 0, image: '', active: true };
    this.showForm = true;
  }
  openEdit(c: CityRow): void {
    this.editingId = c.id; this.saveError = '';
    this.form = { title: c.title, titleEn: c.titleEn, titleAr: c.titleAr, idCountry: c.idCountry, image: c.image, active: c.active };
    this.showForm = true;
  }
  cancel(_ev?: Event): void { this.showForm = false; this.saving = false; this.saveError = ''; }

  save(): void {
    if (!this.form.title.trim()) { this.saveError = 'Le nom est requis.'; return; }
    if (!this.form.idCountry)    { this.saveError = 'Choisissez un pays.';    return; }
    this.saving = true; this.saveError = '';
    const payload = {
      Title: this.form.title, IdCountry: this.form.idCountry, TitleEn: this.form.titleEn,
      TitleAr: this.form.titleAr, Image: this.form.image, Active: this.form.active,
    };
    const op = this.editingId
      ? this.catalogAdmin.adminUpdate('cities', this.editingId, payload)
      : this.catalogAdmin.adminCreate('cities', payload);
    op.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); this.loadStats(); },
      error: (err) => { this.saving = false; this.saveError = err?.error?.message || 'Erreur d\'enregistrement.'; },
    });
  }

  toggleActive(c: CityRow): void {
    this.catalogAdmin.adminUpdate('cities', c.id, {
      Title: c.title, IdCountry: c.idCountry, TitleEn: c.titleEn, TitleAr: c.titleAr, Image: c.image, Active: !c.active,
    }).subscribe({
      next: () => { c.active = !c.active; this.loadStats(); },
      error: () => alert('Action impossible.'),
    });
  }
  remove(c: CityRow): void {
    if (!confirm(`Supprimer la ville "${c.title}" ?`)) return;
    this.catalogAdmin.adminDelete('cities', c.id).subscribe({
      next: () => { this.load(); this.loadStats(); },
      error: () => alert('Suppression impossible.'),
    });
  }
}