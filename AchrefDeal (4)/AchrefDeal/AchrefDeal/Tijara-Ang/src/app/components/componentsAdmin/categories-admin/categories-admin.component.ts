import { Component, OnInit } from '@angular/core';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { CategoriesService } from 'src/app/core/services/categories.service';

interface CategoryRow {
  id: number;
  idparent: number;
  nameFr: string;
  nameEn: string;
  nameAr: string;
  description: string;
  image: string;
  active: boolean;
  children: CategoryRow[];
}

@Component({
  selector: 'app-categories-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Catégories" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<div class="row g-3 mb-4">
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #405189">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-primary-subtle d-flex align-items-center justify-content-center">
          <i class="ri-folder-3-line fs-22 text-primary"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-primary">{{ statRoots }}</h3>
        <p class="mb-0 fs-12 text-muted">Catégories principales</p></div>
      </div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #299cdb">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-info-subtle d-flex align-items-center justify-content-center">
          <i class="ri-node-tree fs-22 text-info"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-info">{{ statTotal - statRoots }}</h3>
        <p class="mb-0 fs-12 text-muted">Sous-catégories</p></div>
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
        <p class="mb-0 fs-12 text-muted">Actives</p></div>
      </div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #f7b84b">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-warning-subtle d-flex align-items-center justify-content-center">
          <i class="ri-image-2-line fs-22 text-warning"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-warning">{{ withImageCount }}</h3>
        <p class="mb-0 fs-12 text-muted">Avec image</p></div>
      </div>
    </div>
  </div>
</div>

<div class="card border-0 shadow-sm">
  <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2 py-3">
    <h6 class="mb-0 fw-semibold flex-grow-1">
      <i class="ri-folder-3-line me-2 text-primary"></i>Catégories &amp; sous-catégories
      <span class="badge bg-primary-subtle text-primary ms-2">{{ totalItems }}</span>
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
    <button class="btn btn-sm btn-primary" (click)="openAdd(null)">
      <i class="ri-add-line me-1"></i>Nouvelle catégorie
    </button>
  </div>

  <div class="card-body p-0">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    } @else if (roots.length === 0) {
      <div class="text-center py-5">
        <i class="ri-folder-line display-3 text-muted opacity-50"></i>
        <p class="text-muted mt-2 mb-3">Aucune catégorie.</p>
        <button class="btn btn-primary" (click)="openAdd(null)"><i class="ri-add-line"></i> Créer la première</button>
      </div>
    } @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th class="ps-3" style="width:80px">Image</th>
              <th>Nom (FR)</th>
              <th>Nom (EN)</th>
              <th>Nom (AR)</th>
              <th class="text-center">Statut</th>
              <th class="text-end pe-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (c of roots; track c.id) {
              <tr class="table-parent-row">
                <td class="ps-3">
                  <button class="btn btn-sm btn-link p-0 me-1 text-body" (click)="toggleExpand(c.id)" title="Déplier/Replier">
                    <i [class]="isExpanded(c.id) ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'"></i>
                  </button>
                  @if (c.image) {
                    <img [src]="c.image" alt="" class="rounded" width="40" height="40"
                         style="object-fit:cover" (error)="c.image=''" />
                  } @else {
                    <div class="rounded bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center"
                         style="width:40px;height:40px">
                      <i class="ri-folder-3-line fs-18"></i>
                    </div>
                  }
                </td>
                <td class="fs-13 fw-semibold">
                  {{ c.nameFr || '—' }}
                  @if (c.children.length) {
                    <span class="badge bg-info-subtle text-info ms-1">{{ c.children.length }} sous-catégorie(s)</span>
                  }
                </td>
                <td class="fs-12 text-muted">{{ c.nameEn || '—' }}</td>
                <td class="fs-12 text-muted" dir="rtl">{{ c.nameAr || '—' }}</td>
                <td class="text-center">
                  @if (c.active) {
                    <span class="badge bg-success-subtle text-success">Active</span>
                  } @else {
                    <span class="badge bg-secondary-subtle text-secondary">Inactive</span>
                  }
                </td>
                <td class="text-end pe-3">
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-light" (click)="openAdd(c)" title="Ajouter une sous-catégorie">
                      <i class="ri-add-line text-primary"></i>
                    </button>
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
              @if (isExpanded(c.id)) {
                @for (sc of c.children; track sc.id) {
                  <tr class="table-child-row">
                    <td class="ps-3">
                      <span class="ms-4"></span>
                      @if (sc.image) {
                        <img [src]="sc.image" alt="" class="rounded" width="34" height="34"
                             style="object-fit:cover" (error)="sc.image=''" />
                      } @else {
                        <div class="rounded bg-info-subtle text-info d-inline-flex align-items-center justify-content-center"
                             style="width:34px;height:34px">
                          <i class="ri-price-tag-3-line fs-16"></i>
                        </div>
                      }
                    </td>
                    <td class="fs-13">
                      <i class="ri-corner-down-right-line text-muted me-1"></i>{{ sc.nameFr || '—' }}
                    </td>
                    <td class="fs-12 text-muted">{{ sc.nameEn || '—' }}</td>
                    <td class="fs-12 text-muted" dir="rtl">{{ sc.nameAr || '—' }}</td>
                    <td class="text-center">
                      @if (sc.active) {
                        <span class="badge bg-success-subtle text-success">Active</span>
                      } @else {
                        <span class="badge bg-secondary-subtle text-secondary">Inactive</span>
                      }
                    </td>
                    <td class="text-end pe-3">
                      <div class="btn-group btn-group-sm">
                        <button class="btn btn-light" (click)="openEdit(sc)" title="Modifier">
                          <i class="ri-edit-2-line text-info"></i>
                        </button>
                        <button class="btn btn-light" (click)="toggleActive(sc)" [title]="sc.active ? 'Désactiver' : 'Activer'">
                          <i [class]="sc.active ? 'ri-pause-circle-line text-warning' : 'ri-play-circle-line text-success'"></i>
                        </button>
                        <button class="btn btn-light" (click)="remove(sc)" title="Supprimer">
                          <i class="ri-delete-bin-line text-danger"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination numérique (catégories racines) : la page demandée est envoyée au backend -->
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-top">
        <span class="fs-12 text-muted">
          Page {{ currentPage }} / {{ lastPage }} — {{ totalItems }} catégorie(s) principale(s)
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

<!-- Modal -->
@if (showForm) {
  <div class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,.5)" (click)="cancel($event)">
    <div class="modal-dialog modal-lg modal-dialog-centered" (click)="$event.stopPropagation()">
      <div class="modal-content border-0 shadow-lg">
        <div class="modal-header bg-primary-subtle">
          <h5 class="modal-title fw-bold text-primary">
            <i class="ri-folder-3-line me-2"></i>
            {{ editingId ? 'Modifier' : (form.idparent ? 'Nouvelle sous-catégorie' : 'Nouvelle catégorie') }}
          </h5>
          <button type="button" class="btn-close" (click)="cancel()"></button>
        </div>
        <div class="modal-body">
          @if (saveError) {
            <div class="alert alert-danger fs-13"><i class="ri-error-warning-line me-2"></i>{{ saveError }}</div>
          }

          <div class="row g-3">
            <div class="col-12">
              <label class="form-label fs-12 fw-semibold">Catégorie parente</label>
              <select class="form-select form-select-sm" [(ngModel)]="form.idparent">
                <option [ngValue]="0">— Aucune (catégorie principale) —</option>
                @for (r of roots; track r.id) {
                  @if (r.id !== editingId) {
                    <option [ngValue]="r.id">{{ r.nameFr }}</option>
                  }
                }
              </select>
              <div class="form-text fs-11">Laisser sur « Aucune » pour créer une catégorie principale, ou choisir un parent pour créer une sous-catégorie.</div>
            </div>
            <div class="col-md-4">
              <label class="form-label fs-12 fw-semibold">Nom (FR) *</label>
              <input class="form-control form-control-sm" [(ngModel)]="form.nameFr" />
            </div>
            <div class="col-md-4">
              <label class="form-label fs-12 fw-semibold">Nom (EN)</label>
              <input class="form-control form-control-sm" [(ngModel)]="form.nameEn" />
            </div>
            <div class="col-md-4">
              <label class="form-label fs-12 fw-semibold">Nom (AR)</label>
              <input class="form-control form-control-sm" [(ngModel)]="form.nameAr" dir="rtl" />
            </div>
            <div class="col-12">
              <label class="form-label fs-12 fw-semibold">Description</label>
              <textarea class="form-control form-control-sm" rows="2" [(ngModel)]="form.description"></textarea>
            </div>
            <div class="col-md-9">
              <label class="form-label fs-12 fw-semibold">Image</label>
              <input type="file" accept="image/*" class="form-control form-control-sm" (change)="onImageSelected($event)" />
              <div class="form-text fs-11">Fichier image (jpg, png…) — laisser vide pour conserver l'image actuelle.</div>
            </div>
            <div class="col-md-3 d-flex align-items-end">
              @if (imagePreview) {
                <img [src]="imagePreview" alt="" class="rounded" width="60" height="60"
                     style="object-fit:cover" />
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
  styles: [`
    .table-child-row td { background: var(--bs-tertiary-bg, #f8f9fb); }

    /* ===== Adaptation Dark Mode ===== */
    [data-bs-theme="dark"] {
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
export class CategoriesAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Catégories', active: true }];

  // Liste plate (telle que renvoyée par /categories) + arbre reconstruit côté front
  items: CategoryRow[] = [];
  roots: CategoryRow[] = [];
  expandedIds = new Set<number>();

  search = '';
  loading = true;

  showForm = false;
  saving   = false;
  saveError = '';
  editingId: number | null = null;
  form: { nameFr: string; nameEn: string; nameAr: string; description: string; idparent: number } = {
    nameFr: '', nameEn: '', nameAr: '', description: '', idparent: 0,
  };
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  private existingImage: string | null = null;

  withImageCount = 0;

  statTotal  = 0;
  statRoots  = 0;
  statActive = 0;

  currentPage = 1;
  perPage     = 10;
  totalItems  = 0;
  lastPage    = 1;

  constructor(private api: TijaraApiService, private categories: CategoriesService) {}

  ngOnInit(): void {
    this.load();
    this.loadStats();
  }

  private searchDebounce: any = null;

  // Pagination numérique des catégories RACINES uniquement (idparent=0),
  // envoyée au backend — chaque racine renvoyée inclut déjà ses enfants
  // (CategoriesController::index -> ->with('children')), donc l'arbre
  // affiché pour la page en cours reste complet.
  load(): void {
    this.loading = true;
    const params: any = { idparent: 0, page: this.currentPage, per_page: this.perPage };
    if (this.search.trim()) params.search = this.search.trim();
    this.categories.getCategoriesAdmin(params).subscribe({
      next: (res: any) => {
        const rows = res?.data || res || [];
        this.items      = (rows as any[]).map((c: any) => this.mapRow(c));
        this.totalItems = res?.total        ?? this.items.length;
        this.lastPage   = res?.last_page    ?? 1;
        this.currentPage= res?.current_page ?? this.currentPage;
        this.buildTree();
        this.withImageCount = this.items.filter(c => !!c.image).length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadStats(): void {
    this.categories.getCategoriesAdmin({ per_page: 1 }).subscribe((res: any) => this.statTotal = res?.total ?? 0);
    this.categories.getCategoriesAdmin({ per_page: 1, idparent: 0 }).subscribe((res: any) => this.statRoots = res?.total ?? 0);
    this.categories.getCategoriesAdmin({ per_page: 1, active: 1 }).subscribe((res: any) => this.statActive = res?.total ?? 0);
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

  private mapRow(c: any): CategoryRow {
    return {
      id:          c.IdCateg,
      idparent:    +(c.idparent ?? 0),
      nameFr:      c.TitleFr ?? '',
      nameEn:      c.TitleEn ?? '',
      nameAr:      c.TitleAr ?? '',
      description: c.Description ?? '',
      image:       c.image_url ?? c.Image ?? '',
      active:      !!c.Active,
      children:    [],
    };
  }

  // Le backend renvoie une liste PLATE (racines + sous-catégories mélangées,
  // chacune avec idparent). On reconstruit l'arbre à 2 niveaux ici, plutôt
  // que de multiplier les appels /categories-roots + /categories/{id}/children.
  private buildTree(): void {
    const byId = new Map<number, CategoryRow>();
    this.items.forEach(c => byId.set(c.id, { ...c, children: [] }));

    const roots: CategoryRow[] = [];
    byId.forEach(c => {
      if (c.idparent && byId.has(c.idparent)) {
        byId.get(c.idparent)!.children.push(c);
      } else {
        roots.push(c);
      }
    });
    this.roots = roots;
  }

  toggleExpand(id: number): void {
    if (this.expandedIds.has(id)) this.expandedIds.delete(id);
    else this.expandedIds.add(id);
  }
  isExpanded(id: number): boolean { return this.expandedIds.has(id); }

  onSearchChange(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.currentPage = 1; this.load(); }, 400);
  }

  clearSearch(): void {
    this.search = '';
    this.currentPage = 1;
    this.load();
  }

  openAdd(parent: CategoryRow | null): void {
    this.editingId = null; this.saveError = '';
    this.form = { nameFr: '', nameEn: '', nameAr: '', description: '', idparent: parent ? parent.id : 0 };
    this.selectedFile = null; this.imagePreview = null; this.existingImage = null;
    if (parent) this.expandedIds.add(parent.id);
    this.showForm = true;
  }
  openEdit(c: CategoryRow): void {
    this.editingId = c.id; this.saveError = '';
    this.form = { nameFr: c.nameFr, nameEn: c.nameEn, nameAr: c.nameAr, description: c.description, idparent: c.idparent };
    this.selectedFile = null; this.imagePreview = c.image || null; this.existingImage = c.image || null;
    this.showForm = true;
  }
  cancel(_ev?: Event): void { this.showForm = false; this.saving = false; this.saveError = ''; }

  onImageSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.selectedFile = file;
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { this.imagePreview = reader.result as string; };
      reader.readAsDataURL(file);
    } else {
      this.imagePreview = this.existingImage;
    }
  }

  save(): void {
    if (!this.form.nameFr.trim()) { this.saveError = 'Le nom (FR) est requis.'; return; }
    this.saving = true; this.saveError = '';

    const fd = new FormData();
    fd.append('TitleFr', this.form.nameFr);
    fd.append('TitleEn', this.form.nameEn || this.form.nameFr);
    fd.append('TitleAr', this.form.nameAr || '');
    fd.append('Description', this.form.description || '');
    fd.append('idparent', String(this.form.idparent || 0));
    if (!this.editingId) fd.append('Active', '1');
    if (this.selectedFile) fd.append('Image', this.selectedFile);

    const op = this.editingId
      ? this.categories.updateCategoryWithImage(this.editingId, fd)
      : this.categories.createCategoryWithImage(fd);
    op.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); this.loadStats(); },
      error: (err) => { this.saving = false; this.saveError = err?.error?.message || 'Erreur d\'enregistrement.'; },
    });
  }

  toggleActive(c: CategoryRow): void {
    this.categories.toggleCategory(c.id).subscribe({
      next: (res: any) => { c.active = res?.Active ?? !c.active; this.loadStats(); }
    });
  }

  remove(c: CategoryRow): void {
    const label = c.children?.length
      ? `Supprimer la catégorie "${c.nameFr}" ? Ses ${c.children.length} sous-catégorie(s) seront rattachées à la racine.`
      : `Supprimer la catégorie "${c.nameFr}" ?`;
    if (!confirm(label)) return;
    this.categories.deleteCategory(c.id).subscribe({
      next: () => { this.load(); this.loadStats(); },
      error: () => alert('Suppression impossible (catégorie peut-être référencée).'),
    });
  }
}
