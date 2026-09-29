import { Component, OnInit } from '@angular/core';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { CatalogAdminService } from 'src/app/core/services/catalog-admin.service';

interface CauseRow {
  id: number;
  title: string;
  description: string;
  email: string;
  type: string;
  active: boolean;
}

const TYPE_OPTIONS = [
  { value: 'order',   label: 'Commande',  color: 'info',    icon: 'ri-shopping-bag-3-line' },
  { value: 'product', label: 'Produit',   color: 'warning', icon: 'ri-box-3-line' },
  { value: 'vendor',  label: 'Vendeur',   color: 'success', icon: 'ri-store-2-line' },
  { value: 'payment', label: 'Paiement',  color: 'primary', icon: 'ri-bank-card-line' },
  { value: 'other',   label: 'Autre',     color: 'secondary', icon: 'ri-more-2-fill' },
];

@Component({
  selector: 'app-causes-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Causes de réclamation" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<div class="row g-3 mb-4">
  <div class="col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #f06548">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-danger-subtle d-flex align-items-center justify-content-center">
          <i class="ri-customer-service-2-line fs-22 text-danger"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-danger">{{ statTotal }}</h3>
        <p class="mb-0 fs-12 text-muted">Total causes</p></div>
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
  @for (t of typeStats; track t.value) {
    <div class="col-md-3">
      <div class="card border-0 shadow-sm h-100" [style.borderLeft]="'4px solid var(--vz-' + t.color + ')'">
        <div class="card-body d-flex align-items-center gap-3 py-3">
          <div class="avatar-md rounded-3 d-flex align-items-center justify-content-center"
               [class]="'bg-' + t.color + '-subtle'">
            <i class="fs-22" [class]="t.icon + ' text-' + t.color"></i>
          </div>
          <div><h3 class="mb-0 fw-bold" [class]="'text-' + t.color">{{ t.count }}</h3>
          <p class="mb-0 fs-12 text-muted">{{ t.label }}</p></div>
        </div>
      </div>
    </div>
  }
</div>

<div class="card border-0 shadow-sm">
  <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2 py-3">
    <h6 class="mb-0 fw-semibold flex-grow-1">
      <i class="ri-customer-service-2-line me-2 text-danger"></i>Liste des causes
      <span class="badge bg-danger-subtle text-danger ms-2">{{ totalItems }}</span>
    </h6>
    <div class="input-group input-group-sm" style="max-width:240px">
      <span class="input-group-text bg-white border-end-0"><i class="ri-search-line"></i></span>
      <input type="text" class="form-control border-start-0" placeholder="Titre, description…"
             [(ngModel)]="search" (input)="onSearchChange()" />
      @if (search) {
        <button class="btn btn-light border-start-0" type="button" (click)="clearSearch()" title="Effacer">
          <i class="ri-close-line"></i>
        </button>
      }
    </div>
    <select class="form-select form-select-sm" style="max-width:160px"
            [(ngModel)]="filterType" (change)="applyFilter()">
      <option value="">Tous types</option>
      @for (t of typeOptions; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
    </select>
    <button class="btn btn-sm btn-danger" (click)="openAdd()">
      <i class="ri-add-line me-1"></i>Nouvelle cause
    </button>
  </div>

  <div class="card-body p-0">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-danger"></div></div>
    } @else if (items.length === 0) {
      <div class="text-center py-5">
        <i class="ri-customer-service-2-line display-3 text-muted opacity-50"></i>
        <p class="text-muted mt-2 mb-3">Aucune cause.</p>
        <button class="btn btn-danger" (click)="openAdd()"><i class="ri-add-line"></i> Créer la première</button>
      </div>
    } @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th class="ps-3">Titre</th>
              <th>Type</th>
              <th>Description</th>
              <th>Email contact</th>
              <th class="text-center">Statut</th>
              <th class="text-end pe-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (c of items; track c.id) {
              <tr>
                <td class="ps-3 fs-13 fw-semibold">{{ c.title || '—' }}</td>
                <td>
                  @let t = typeOf(c.type);
                  <span class="badge" [class]="'bg-' + t.color + '-subtle text-' + t.color">
                    <i class="me-1" [class]="t.icon"></i>{{ t.label }}
                  </span>
                </td>
                <td class="fs-12 text-muted text-truncate" style="max-width:300px">{{ c.description || '—' }}</td>
                <td class="fs-12">{{ c.email || '—' }}</td>
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
        <span class="fs-12 text-muted">Page {{ currentPage }} / {{ lastPage }} — {{ totalItems }} cause(s)</span>
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
        <div class="modal-header bg-danger-subtle">
          <h5 class="modal-title fw-bold text-danger">
            <i class="ri-customer-service-2-line me-2"></i>{{ editingId ? 'Modifier la cause' : 'Nouvelle cause' }}
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
              <input class="form-control form-control-sm" [(ngModel)]="form.title" placeholder="Ex : Produit défectueux" />
            </div>
            <div class="col-md-4">
              <label class="form-label fs-12 fw-semibold">Type</label>
              <select class="form-select form-select-sm" [(ngModel)]="form.type">
                @for (t of typeOptions; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
              </select>
            </div>
            <div class="col-12">
              <label class="form-label fs-12 fw-semibold">Description</label>
              <textarea class="form-control form-control-sm" rows="3" [(ngModel)]="form.description"></textarea>
            </div>
            <div class="col-md-8">
              <label class="form-label fs-12 fw-semibold">Email contact</label>
              <input type="email" class="form-control form-control-sm" [(ngModel)]="form.email" placeholder="support@tijara.tn" />
            </div>
            <div class="col-md-4 d-flex align-items-end">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="cause-active" [(ngModel)]="form.active" />
                <label class="form-check-label fs-13" for="cause-active">Active</label>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-light" (click)="cancel()" [disabled]="saving">Annuler</button>
          <button class="btn btn-danger" (click)="save()" [disabled]="saving">
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
export class CausesAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Causes', active: true }];

  typeOptions = TYPE_OPTIONS;

  items: CauseRow[] = [];
  search = '';
  filterType = '';
  loading = true;
  private searchDebounce: any = null;

  currentPage = 1;
  perPage     = 10;
  totalItems  = 0;
  lastPage    = 1;

  statTotal  = 0;
  statActive = 0;
  typeStats: any[] = [];

  showForm = false;
  saving   = false;
  saveError = '';
  editingId: number | null = null;
  form = { title: '', description: '', email: '', type: 'other', active: true };

  typeOf(v: string) { return TYPE_OPTIONS.find(t => t.value === v) || TYPE_OPTIONS[4]; }

  constructor(private api: TijaraApiService, private catalogAdmin: CatalogAdminService) {}

  ngOnInit(): void {
    this.load();
    this.loadStats();
  }

  private buildParams(): any {
    const params: any = { page: this.currentPage, per_page: this.perPage };
    if (this.search.trim()) params.search = this.search.trim();
    if (this.filterType) params.GroupName = this.filterType;
    return params;
  }

  load(): void {
    this.loading = true;
    this.catalogAdmin.adminList('causes', this.buildParams()).subscribe({
      next: (res: any) => {
        const data: any[] = res?.data || [];
        this.items = (data || []).map((c: any) => ({
          id:          +(c.IdCauseReport ?? c.id_cause_report ?? c.id ?? 0),
          title:        c.TitleCauseFr  ?? c.title       ?? '',
          description:  c.description ?? c.Description ?? '',
          email:        c.email       ?? c.Email       ?? '',
          type:         c.GroupName   ?? c.type        ?? 'other',
          active:     !!(c.Active     ?? c.active     ?? true),
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
    this.catalogAdmin.adminList('causes', { per_page: 1 }).subscribe((res: any) => this.statTotal = res?.total ?? 0);
    this.catalogAdmin.adminList('causes', { per_page: 1, Active: 1 }).subscribe((res: any) => this.statActive = res?.total ?? 0);
    this.typeStats = TYPE_OPTIONS.slice(0, 2).map(t => ({ ...t, count: 0 }));
    TYPE_OPTIONS.slice(0, 2).forEach((t, i) => {
      this.catalogAdmin.adminList('causes', { per_page: 1, GroupName: t.value }).subscribe((res: any) => {
        this.typeStats[i] = { ...t, count: res?.total ?? 0 };
      });
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
    this.form = { title: '', description: '', email: '', type: 'other', active: true };
    this.showForm = true;
  }
  openEdit(c: CauseRow): void {
    this.editingId = c.id; this.saveError = '';
    this.form = { title: c.title, description: c.description, email: c.email, type: c.type, active: c.active };
    this.showForm = true;
  }
  cancel(_ev?: Event): void { this.showForm = false; this.saving = false; this.saveError = ''; }


  save(): void {
    if (!this.form.title.trim()) { this.saveError = 'Le titre est requis.'; return; }
    this.saving = true; this.saveError = '';
    const payload = {
      TitleCauseFr: this.form.title, TitleCauseEn: this.form.title, TitleCauseAr: this.form.title,
      GroupName: this.form.type, Active: this.form.active,
    };
    const op = this.editingId
      ? this.catalogAdmin.adminUpdate('causes', this.editingId, payload)
      : this.catalogAdmin.adminCreate('causes', payload);
    op.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); this.loadStats(); },
      error: (err: any) => { this.saving = false; this.saveError = err?.error?.message || 'Erreur d\'enregistrement.'; },
    });
  }

  toggleActive(c: CauseRow): void {
    this.catalogAdmin.adminUpdate('causes', c.id, {
      TitleCauseFr: c.title, TitleCauseEn: c.title, TitleCauseAr: c.title, GroupName: c.type, Active: !c.active,
    }).subscribe({
      next: () => { c.active = !c.active; this.loadStats(); },
      error: () => alert('Action impossible.'),
    });
  }
  remove(c: CauseRow): void {
    if (!confirm(`Supprimer la cause "${c.title}" ?`)) return;
    this.catalogAdmin.adminDelete('causes', c.id).subscribe({
      next: () => { this.load(); this.loadStats(); },
      error: () => alert('Suppression impossible.'),
    });
  }
}