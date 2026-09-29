import { Component, OnInit } from '@angular/core';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { CatalogAdminService } from 'src/app/core/services/catalog-admin.service';

interface BrandRow {
  id: number;
  title: string;
  description: string;
  image: string;
  active: boolean;
  createdAt: string | null;
}

@Component({
  selector: 'app-brands-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Marques" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<div class="row g-3 mb-4">
  <div class="col-6 col-md-4">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #564ab1">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 d-flex align-items-center justify-content-center" style="background:#564ab120">
          <i class="ri-price-tag-3-line fs-22" style="color:#564ab1"></i>
        </div>
        <div><h3 class="mb-0 fw-bold" style="color:#564ab1">{{ statTotal }}</h3>
        <p class="mb-0 fs-12 text-muted">Total marques</p></div>
      </div>
    </div>
  </div>
  <div class="col-6 col-md-4">
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
  <div class="col-12 col-md-4">
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
      <i class="ri-price-tag-3-line me-2" style="color:#564ab1"></i>Liste des marques
      <span class="badge ms-2" style="background:#564ab120;color:#564ab1">{{ totalItems }}</span>
    </h6>
    <div class="input-group input-group-sm" style="max-width:240px">
      <span class="input-group-text bg-white border-end-0"><i class="ri-search-line"></i></span>
      <input type="text" class="form-control border-start-0" placeholder="Nom, description…"
             [(ngModel)]="search" (input)="onSearchChange()" />
      @if (search) {
        <button class="btn btn-light border-start-0" type="button" (click)="clearSearch()" title="Effacer">
          <i class="ri-close-line"></i>
        </button>
      }
    </div>
    <button class="btn btn-sm" style="background:#564ab1;color:white" (click)="openAdd()">
      <i class="ri-add-line me-1"></i>Nouvelle marque
    </button>
  </div>

  <div class="card-body p-0">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border" style="color:#564ab1"></div></div>
    } @else if (items.length === 0) {
      <div class="text-center py-5">
        <i class="ri-price-tag-line display-3 text-muted opacity-50"></i>
        <p class="text-muted mt-2 mb-3">Aucune marque.</p>
        <button class="btn btn-primary" (click)="openAdd()"><i class="ri-add-line"></i> Créer la première</button>
      </div>
    } @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th class="ps-3" style="width:80px">Logo</th>
              <th>Nom</th>
              <th>Description</th>
              <th class="text-center">Statut</th>
              <th>Créée le</th>
              <th class="text-end pe-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (b of items; track b.id) {
              <tr>
                <td class="ps-3">
                  @if (b.image) {
                    <img [src]="b.image" alt="" class="rounded" width="48" height="48"
                         style="object-fit:contain;background:#f5f7fb" (error)="b.image=''" />
                  } @else {
                    <div class="rounded d-flex align-items-center justify-content-center"
                         style="width:48px;height:48px;background:#564ab120;color:#564ab1">
                      <i class="ri-price-tag-3-line fs-20"></i>
                    </div>
                  }
                </td>
                <td class="fs-13 fw-semibold">{{ b.title || '—' }}</td>
                <td class="fs-12 text-muted text-truncate" style="max-width:300px">{{ b.description || '—' }}</td>
                <td class="text-center">
                  @if (b.active) {
                    <span class="badge bg-success-subtle text-success">Active</span>
                  } @else {
                    <span class="badge bg-secondary-subtle text-secondary">Inactive</span>
                  }
                </td>
                <td class="fs-12 text-muted">{{ formatDate(b.createdAt) }}</td>
                <td class="text-end pe-3">
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-light" (click)="openEdit(b)" title="Modifier">
                      <i class="ri-edit-2-line text-info"></i>
                    </button>
                    <button class="btn btn-light" (click)="toggleActive(b)" [title]="b.active ? 'Désactiver' : 'Activer'">
                      <i [class]="b.active ? 'ri-pause-circle-line text-warning' : 'ri-play-circle-line text-success'"></i>
                    </button>
                    <button class="btn btn-light" (click)="remove(b)" title="Supprimer">
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
        <span class="fs-12 text-muted">Page {{ currentPage }} / {{ lastPage }} — {{ totalItems }} marque(s)</span>
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
        <div class="modal-header" style="background:#564ab120">
          <h5 class="modal-title fw-bold" style="color:#564ab1">
            <i class="ri-price-tag-3-line me-2"></i>
            {{ editingId ? 'Modifier la marque' : 'Nouvelle marque' }}
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
              <input class="form-control form-control-sm" [(ngModel)]="form.title" placeholder="Ex : Samsung" />
            </div>
            <div class="col-12">
              <label class="form-label fs-12 fw-semibold">Description</label>
              <textarea class="form-control form-control-sm" rows="2" [(ngModel)]="form.description"></textarea>
            </div>
            <div class="col-md-9">
              <label class="form-label fs-12 fw-semibold">URL du logo</label>
              <input class="form-control form-control-sm" [(ngModel)]="form.image" placeholder="https://…" />
            </div>
            <div class="col-md-3 d-flex align-items-end">
              @if (form.image) {
                <img [src]="form.image" alt="" class="rounded" width="60" height="60"
                     style="object-fit:contain;background:#f5f7fb" (error)="$any($event.target).src=''" />
              }
            </div>
            <div class="col-12">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="active-switch" [(ngModel)]="form.active" />
                <label class="form-check-label fs-13" for="active-switch">Marque active</label>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-light" (click)="cancel()" [disabled]="saving">Annuler</button>
          <button class="btn" style="background:#564ab1;color:white" (click)="save()" [disabled]="saving">
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
export class BrandsAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Marques', active: true }];

  items: BrandRow[] = [];
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
  form = { title: '', description: '', image: '', active: true };

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
    this.catalogAdmin.adminList('brands', this.buildParams()).subscribe({
      next: (res: any) => {
        const data: any[] = res?.data || [];
        this.items = (data || []).map((b: any) => ({
          id:         +(b.id_brand ?? b.IdBrand ?? b.id ?? 0),
          title:       b.title       ?? b.Title       ?? '',
          description: b.description ?? b.Description ?? '',
          image:       b.image_url   ?? b.image ?? b.Image ?? '',
          active:    !!(b.active     ?? b.Active     ?? true),
          createdAt:   b.created_at  ?? b.CreatedAt  ?? null,
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
    this.catalogAdmin.adminList('brands', { per_page: 1 }).subscribe((res: any) => this.statTotal = res?.total ?? 0);
    this.catalogAdmin.adminList('brands', { per_page: 1, Active: 1 }).subscribe((res: any) => this.statActive = res?.total ?? 0);
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
    this.form = { title: '', description: '', image: '', active: true };
    this.showForm = true;
  }
  openEdit(b: BrandRow): void {
    this.editingId = b.id; this.saveError = '';
    this.form = { title: b.title, description: b.description, image: b.image, active: b.active };
    this.showForm = true;
  }
  cancel(_ev?: Event): void { this.showForm = false; this.saving = false; this.saveError = ''; }

  save(): void {
    if (!this.form.title.trim()) { this.saveError = 'Le nom est requis.'; return; }
    this.saving = true; this.saveError = '';
    const payload = { title: this.form.title, description: this.form.description, image: this.form.image, active: this.form.active };
    const op = this.editingId
      ? this.catalogAdmin.adminUpdate('brands', this.editingId, payload)
      : this.catalogAdmin.adminCreate('brands', payload);
    op.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); this.loadStats(); },
      error: (err) => { this.saving = false; this.saveError = err?.error?.message || 'Erreur d\'enregistrement.'; },
    });
  }

  toggleActive(b: BrandRow): void {
    this.catalogAdmin.adminUpdate('brands', b.id, { ...b, active: !b.active, Active: !b.active }).subscribe({
      next: () => { b.active = !b.active; this.loadStats(); },
      error: () => alert('Action impossible.'),
    });
  }

  remove(b: BrandRow): void {
    if (!confirm(`Supprimer la marque "${b.title}" ?`)) return;
    this.catalogAdmin.adminDelete('brands', b.id).subscribe({
      next: () => { this.load(); this.loadStats(); },
      error: () => alert('Suppression impossible.'),
    });
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
  }
}