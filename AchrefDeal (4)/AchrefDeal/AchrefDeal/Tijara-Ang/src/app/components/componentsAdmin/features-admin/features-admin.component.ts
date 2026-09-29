import { Component, OnInit } from '@angular/core';
import { FeaturesService } from 'src/app/core/services/features.service';
import { CategoriesService } from 'src/app/core/services/categories.service';

interface FeatureRow {
  id: number;
  title: string;
  description: string;
  unit: string;
  active: boolean;
  valuesCount: number;
  categoriesCount: number;
}

interface ValueRow {
  id: number;
  value: string;
  idFeature: number;
  active: boolean;
}

interface LinkRow {
  id: number;
  idCategory: number;
  idFeature: number;
  categoryName: string;
  featureName: string;
}

@Component({
  selector: 'app-features-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Caractéristiques" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<ul class="nav nav-tabs mb-3">
  <li class="nav-item">
    <a class="nav-link" [class.active]="tab==='features'" href="javascript:void(0)" (click)="tab='features'">
      <i class="ri-list-settings-line me-1"></i>Caractéristiques
    </a>
  </li>
  <li class="nav-item">
    <a class="nav-link" [class.active]="tab==='links'" href="javascript:void(0)" (click)="tab='links'; loadLinks()">
      <i class="ri-links-line me-1"></i>Liaisons par catégorie
    </a>
  </li>
</ul>

@if (tab === 'features') {
  <div class="card border-0 shadow-sm">
    <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2 py-3">
      <h6 class="mb-0 fw-semibold flex-grow-1">
        Liste des caractéristiques <span class="badge bg-primary-subtle text-primary ms-2">{{ features.length }}</span>
      </h6>
      <button class="btn btn-sm btn-primary" (click)="openAddFeature()">
        <i class="ri-add-line me-1"></i>Nouvelle caractéristique
      </button>
    </div>
    <div class="card-body p-0">
      @if (loading) {
        <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      } @else if (features.length === 0) {
        <p class="text-muted text-center py-5 mb-0">Aucune caractéristique pour le moment.</p>
      } @else {
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">Nom</th>
                <th>Unité</th>
                <th class="text-center">Valeurs</th>
                <th class="text-center">Catégories liées</th>
                <th class="text-center">Statut</th>
                <th class="text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (f of features; track f.id) {
                <tr>
                  <td class="ps-3">
                    <div class="fw-semibold">{{ f.title }}</div>
                    @if (f.description) { <div class="fs-12 text-muted">{{ f.description }}</div> }
                  </td>
                  <td class="fs-13 text-muted">{{ f.unit || '—' }}</td>
                  <td class="text-center">
                    <button class="btn btn-sm btn-light" (click)="openValues(f)">
                      {{ f.valuesCount }} <i class="ri-arrow-right-s-line"></i>
                    </button>
                  </td>
                  <td class="text-center">{{ f.categoriesCount }}</td>
                  <td class="text-center">
                    @if (f.active) { <span class="badge bg-success-subtle text-success">Active</span> }
                    @else { <span class="badge bg-secondary-subtle text-secondary">Inactive</span> }
                  </td>
                  <td class="text-end pe-3">
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-light" (click)="openEditFeature(f)" title="Modifier">
                        <i class="ri-edit-2-line text-info"></i>
                      </button>
                      <button class="btn btn-light" (click)="toggleFeature(f)" [title]="f.active ? 'Désactiver' : 'Activer'">
                        <i [class]="f.active ? 'ri-pause-circle-line text-warning' : 'ri-play-circle-line text-success'"></i>
                      </button>
                      <button class="btn btn-light" (click)="removeFeature(f)" title="Supprimer">
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
}

@if (tab === 'links') {
  <div class="card border-0 shadow-sm">
    <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2 py-3">
      <h6 class="mb-0 fw-semibold flex-grow-1">
        Caractéristiques par catégorie <span class="badge bg-primary-subtle text-primary ms-2">{{ links.length }}</span>
      </h6>
      <select class="form-select form-select-sm" style="max-width:220px" [(ngModel)]="newLinkCategId">
        <option [ngValue]="null">Choisir une catégorie…</option>
        @for (c of categories; track c.id) { <option [ngValue]="c.id">{{ c.title }}</option> }
      </select>
      <select class="form-select form-select-sm" style="max-width:220px" [(ngModel)]="newLinkFeatureId">
        <option [ngValue]="null">Choisir une caractéristique…</option>
        @for (f of features; track f.id) { <option [ngValue]="f.id">{{ f.title }}</option> }
      </select>
      <button class="btn btn-sm btn-primary" [disabled]="!newLinkCategId || !newLinkFeatureId" (click)="addLink()">
        <i class="ri-link-m me-1"></i>Lier
      </button>
    </div>
    <div class="card-body p-0">
      @if (loadingLinks) {
        <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      } @else if (links.length === 0) {
        <p class="text-muted text-center py-5 mb-0">Aucune liaison catégorie / caractéristique pour le moment.</p>
      } @else {
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">Catégorie</th>
                <th>Caractéristique</th>
                <th class="text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (l of links; track l.id) {
                <tr>
                  <td class="ps-3">{{ l.categoryName }}</td>
                  <td>{{ l.featureName }}</td>
                  <td class="text-end pe-3">
                    <button class="btn btn-sm btn-light" (click)="removeLink(l)" title="Délier">
                      <i class="ri-link-unlink-m text-danger"></i>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  </div>
}

<!-- Modal Feature -->
@if (showFeatureForm) {
  <div class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,.5)" (click)="cancelFeature($event)">
    <div class="modal-dialog modal-dialog-centered" (click)="$event.stopPropagation()">
      <div class="modal-content border-0 shadow-lg">
        <div class="modal-header">
          <h5 class="modal-title fw-bold">{{ editingFeatureId ? 'Modifier' : 'Nouvelle' }} caractéristique</h5>
          <button type="button" class="btn-close" (click)="cancelFeature()"></button>
        </div>
        <div class="modal-body">
          @if (featureFormError) { <div class="alert alert-danger fs-13">{{ featureFormError }}</div> }
          <div class="mb-2">
            <label class="form-label fs-12 fw-semibold">Nom *</label>
            <input class="form-control form-control-sm" [(ngModel)]="featureForm.TitleFeature" placeholder="ex : RAM" />
          </div>
          <div class="mb-2">
            <label class="form-label fs-12 fw-semibold">Description</label>
            <textarea class="form-control form-control-sm" rows="2" [(ngModel)]="featureForm.DescriptionFeature"></textarea>
          </div>
          <div class="mb-2">
            <label class="form-label fs-12 fw-semibold">Unité</label>
            <input class="form-control form-control-sm" [(ngModel)]="featureForm.UnitFeature" placeholder="ex : Go, cm, kg…" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-light" (click)="cancelFeature()" [disabled]="savingFeature">Annuler</button>
          <button class="btn btn-primary" (click)="saveFeature()" [disabled]="savingFeature">
            @if (savingFeature) { <span class="spinner-border spinner-border-sm me-1"></span> }
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  </div>
}

<!-- Modal Values -->
@if (showValuesModal) {
  <div class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,.5)" (click)="closeValues($event)">
    <div class="modal-dialog modal-dialog-centered" (click)="$event.stopPropagation()">
      <div class="modal-content border-0 shadow-lg">
        <div class="modal-header">
          <h5 class="modal-title fw-bold">Valeurs — {{ valuesFeature?.title }}</h5>
          <button type="button" class="btn-close" (click)="closeValues()"></button>
        </div>
        <div class="modal-body">
          @if (loadingValues) {
            <div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div></div>
          } @else {
            <ul class="list-group mb-3">
              @for (v of values; track v.id) {
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  {{ v.value }}
                  <button class="btn btn-sm btn-light" (click)="removeValue(v)"><i class="ri-delete-bin-line text-danger"></i></button>
                </li>
              } @empty {
                <li class="list-group-item text-muted fs-13">Aucune valeur pour le moment.</li>
              }
            </ul>
            <div class="d-flex gap-2">
              <input class="form-control form-control-sm" [(ngModel)]="newValueText" placeholder="Nouvelle valeur (ex : 8 Go)" />
              <button class="btn btn-sm btn-primary flex-shrink-0" [disabled]="!newValueText.trim()" (click)="addValue()">
                <i class="ri-add-line"></i>
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  </div>
}
  `,
})
export class FeaturesAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Caractéristiques', active: true }];

  tab: 'features' | 'links' = 'features';
  loading = true;

  features: FeatureRow[] = [];
  categories: { id: number; title: string }[] = [];

  showFeatureForm = false;
  editingFeatureId: number | null = null;
  featureForm: any = { TitleFeature: '', DescriptionFeature: '', UnitFeature: '' };
  featureFormError = '';
  savingFeature = false;

  links: LinkRow[] = [];
  loadingLinks = false;
  newLinkCategId: number | null = null;
  newLinkFeatureId: number | null = null;

  showValuesModal = false;
  valuesFeature: FeatureRow | null = null;
  values: ValueRow[] = [];
  loadingValues = false;
  newValueText = '';

  constructor(private features_: FeaturesService, private categoriesApi: CategoriesService) {}

  ngOnInit(): void {
    this.categoriesApi.getCategories({ per_page: 200 }).subscribe({
      next: (res: any) => {
        const rows: any[] = res?.data ?? res ?? [];
        this.categories = rows.map((c: any) => ({ id: c.IdCateg, title: c.TitleFr || c.TitleEn || '' }));
      },
      error: () => { this.categories = []; },
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.features_.getFeatures({ per_page: 200 }).subscribe({
      next: (res: any) => {
        const rows: any[] = res?.data ?? res ?? [];
        this.features = rows.map((f: any) => ({
          id: f.IdFeature,
          title: f.TitleFeature ?? '',
          description: f.DescriptionFeature ?? '',
          unit: f.UnitFeature ?? '',
          active: !!f.Active,
          valuesCount: f.features_values_count ?? 0,
          categoriesCount: f.feature_categories_count ?? 0,
        }));
        this.loading = false;
      },
      error: () => { this.features = []; this.loading = false; },
    });
  }

  openAddFeature(): void {
    this.editingFeatureId = null; this.featureFormError = '';
    this.featureForm = { TitleFeature: '', DescriptionFeature: '', UnitFeature: '' };
    this.showFeatureForm = true;
  }
  openEditFeature(f: FeatureRow): void {
    this.editingFeatureId = f.id; this.featureFormError = '';
    this.featureForm = { TitleFeature: f.title, DescriptionFeature: f.description, UnitFeature: f.unit };
    this.showFeatureForm = true;
  }
  cancelFeature(_ev?: Event): void { this.showFeatureForm = false; this.savingFeature = false; this.featureFormError = ''; }

  saveFeature(): void {
    if (!this.featureForm.TitleFeature.trim()) { this.featureFormError = 'Le nom est obligatoire.'; return; }
    this.savingFeature = true;
    const req = this.editingFeatureId
      ? this.features_.updateFeature(this.editingFeatureId, this.featureForm)
      : this.features_.createFeature(this.featureForm);
    req.subscribe({
      next: () => { this.savingFeature = false; this.showFeatureForm = false; this.load(); },
      error: (err: any) => { this.savingFeature = false; this.featureFormError = err?.error?.message || 'Enregistrement impossible.'; },
    });
  }

  toggleFeature(f: FeatureRow): void {
    this.features_.toggleFeature(f.id).subscribe({
      next: () => this.load(),
      error: () => alert('Action impossible.'),
    });
  }

  removeFeature(f: FeatureRow): void {
    if (!confirm(`Supprimer la caractéristique "${f.title}" ?`)) return;
    this.features_.deleteFeature(f.id).subscribe({
      next: () => this.load(),
      error: () => alert('Suppression impossible (peut-être encore liée à des catégories ou des annonces).'),
    });
  }

  // ── Liaisons catégorie / caractéristique ──
  loadLinks(): void {
    this.loadingLinks = true;
    this.features_.getFeatureCategories({ per_page: 200 }).subscribe({
      next: (res: any) => {
        const rows: any[] = res?.data ?? res ?? [];
        const catMap = new Map(this.categories.map(c => [c.id, c.title]));
        const featMap = new Map(this.features.map(f => [f.id, f.title]));
        this.links = rows.map((l: any) => ({
          id: l.IdFC,
          idCategory: l.IdCategory,
          idFeature: l.IdFeature,
          categoryName: catMap.get(l.IdCategory) || `Catégorie #${l.IdCategory}`,
          featureName: featMap.get(l.IdFeature) || `Caractéristique #${l.IdFeature}`,
        }));
        this.loadingLinks = false;
      },
      error: () => { this.links = []; this.loadingLinks = false; },
    });
  }

  addLink(): void {
    if (!this.newLinkCategId || !this.newLinkFeatureId) return;
    this.features_.linkFeatureToCategory(this.newLinkCategId, this.newLinkFeatureId).subscribe({
      next: () => { this.newLinkCategId = null; this.newLinkFeatureId = null; this.loadLinks(); },
      error: () => alert('Liaison impossible (peut-être déjà existante).'),
    });
  }

  removeLink(l: LinkRow): void {
    if (!confirm('Retirer cette liaison ?')) return;
    this.features_.unlinkFeatureFromCategory(l.id).subscribe({
      next: () => this.loadLinks(),
      error: () => alert('Suppression impossible.'),
    });
  }

  // ── Valeurs d'une caractéristique ──
  openValues(f: FeatureRow): void {
    this.valuesFeature = f;
    this.showValuesModal = true;
    this.loadingValues = true;
    this.newValueText = '';
    this.features_.getFeatureValues({ IdFeature: f.id, per_page: 200 }).subscribe({
      next: (res: any) => {
        const rows: any[] = res?.data ?? res ?? [];
        this.values = rows.map((v: any) => ({ id: v.IdFV, value: v.ValueFeature ?? '', idFeature: v.IdFeature, active: !!v.Active }));
        this.loadingValues = false;
      },
      error: () => { this.values = []; this.loadingValues = false; },
    });
  }
  closeValues(_ev?: Event): void { this.showValuesModal = false; this.valuesFeature = null; }

  addValue(): void {
    if (!this.valuesFeature || !this.newValueText.trim()) return;
    this.features_.createFeatureValue({ ValueFeature: this.newValueText.trim(), IdFeature: this.valuesFeature.id, Active: 1 }).subscribe({
      next: (v: any) => {
        this.values.push({ id: v.IdFV, value: v.ValueFeature, idFeature: v.IdFeature, active: true });
        this.newValueText = '';
        const f = this.features.find(x => x.id === this.valuesFeature!.id);
        if (f) f.valuesCount++;
      },
      error: () => alert('Ajout impossible.'),
    });
  }

  removeValue(v: ValueRow): void {
    if (!confirm('Supprimer cette valeur ?')) return;
    this.features_.deleteFeatureValue(v.id).subscribe({
      next: () => {
        this.values = this.values.filter(x => x.id !== v.id);
        const f = this.features.find(x => x.id === v.idFeature);
        if (f) f.valuesCount--;
      },
      error: () => alert('Suppression impossible (peut-être déjà utilisée par une annonce/produit).'),
    });
  }
}
