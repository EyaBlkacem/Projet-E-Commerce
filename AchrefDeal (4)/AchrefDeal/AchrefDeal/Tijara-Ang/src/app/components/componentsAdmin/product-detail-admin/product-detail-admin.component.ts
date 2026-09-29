import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ProductsService } from 'src/app/core/services/products.service';
import { CategoriesService } from 'src/app/core/services/categories.service';
import { UsersVendorsService } from 'src/app/core/services/users-vendors.service';

interface ImageEntry {
  url:   string;
  index: number; // index réel dans ImageProduct côté backend (-1 = image générée, non supprimable)
}

interface ProductDetail {
  id:          number;
  name:        string;
  description: string;
  price:       string;
  stock:       number;
  images:      ImageEntry[];
  idCateg:     number | null;
  category:    string;
  idUser:      number | null;
  vendorName:  string;
  vendorVerified: boolean;
  vendorPhone: string;
  isActive:    boolean;
  viewCount:   number;
}

@Component({
  selector: 'app-product-detail-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Détail du produit" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

@if (loading) {
  <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
} @else if (!product) {
  <div class="card border-0 shadow-sm">
    <div class="card-body text-center py-5">
      <i class="ri-box-3-line display-3 text-muted opacity-50"></i>
      <h5 class="mt-3">Produit introuvable</h5>
      <a routerLink="/admin/products" class="btn btn-primary mt-2">Retour à la liste</a>
    </div>
  </div>
} @else {

  <!-- ═════ En-tête ═════ -->
  <div class="card border-0 shadow-sm mb-4">
    <div class="card-body d-flex flex-wrap align-items-start justify-content-between gap-3">
      <div class="d-flex align-items-center gap-2">
        <a routerLink="/admin/products" class="btn btn-light btn-sm rounded-circle" style="width:36px;height:36px">
          <i class="ri-arrow-left-line"></i>
        </a>
        <div>
          <h4 class="fw-bold mb-1">{{ product.name }}</h4>
          <span class="badge rounded-pill" [class]="product.isActive ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'">
            <i [class]="product.isActive ? 'ri-checkbox-circle-fill me-1' : 'ri-time-fill me-1'"></i>
            {{ product.isActive ? 'Approuvé' : 'En attente' }}
          </span>
          <span class="text-muted fs-12 ms-2">ID #{{ product.id }}</span>
        </div>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-sm" [class]="product.isActive ? 'btn-warning text-white' : 'btn-success'" (click)="toggleActive()">
          <i [class]="product.isActive ? 'ri-pause-circle-line me-1' : 'ri-play-circle-line me-1'"></i>
          {{ product.isActive ? 'Désapprouver' : 'Approuver' }}
        </button>
        <button *ngIf="!editMode" class="btn btn-primary btn-sm" (click)="startEdit()">
          <i class="ri-edit-line me-1"></i>Modifier
        </button>
        <button class="btn btn-outline-danger btn-sm" (click)="remove()">
          <i class="ri-delete-bin-line me-1"></i>Supprimer
        </button>
      </div>
    </div>
  </div>

  <div class="row g-4">
    <!-- ═════ Colonne principale ═════ -->
    <div class="col-lg-8">
      <div class="card border-0 shadow-sm">
        <div class="card-body">

          <!-- Image principale -->
          <div *ngIf="heroImageUrl" class="mb-3 text-center">
            <img [src]="heroImageUrl" alt="" class="img-fluid rounded-3" style="max-height:320px;object-fit:cover" (error)="onHeroImageError()" />
          </div>

          @if (!editMode) {
            <!-- ── Mode lecture ── -->
            <h6 class="fw-semibold text-muted fs-12 text-uppercase mb-2">Description complète</h6>
            <p class="fs-14 mb-4" style="white-space:pre-wrap">{{ product.description || 'Aucune description fournie.' }}</p>

            <div class="row g-3">
              <div class="col-6 col-md-4">
                <div class="p-3 rounded-3 bg-light">
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Prix</div>
                  <div class="fw-bold fs-18">{{ product.price }} <span class="fs-12 text-muted">TND</span></div>
                </div>
              </div>
              <div class="col-6 col-md-4">
                <div class="p-3 rounded-3 bg-light">
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Stock</div>
                  <div class="fw-bold fs-18">{{ product.stock }}</div>
                </div>
              </div>
              <div class="col-6 col-md-4">
                <div class="p-3 rounded-3 bg-light">
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Catégorie</div>
                  <div class="fs-14">{{ product.category || '—' }}</div>
                </div>
              </div>
              <div class="col-6 col-md-4">
                <div class="p-3 rounded-3 bg-light">
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Vues</div>
                  <div class="fs-14">{{ product.viewCount }}</div>
                </div>
              </div>
            </div>

            <!-- Galerie -->
            <h6 class="fw-semibold text-muted fs-12 text-uppercase mt-4 mb-2">Photos</h6>
            <div class="d-flex flex-wrap gap-2">
              @for (img of product.images; track img.index) {
                <div class="position-relative">
                  <img [src]="img.url" style="width:72px;height:72px;object-fit:cover;border-radius:8px" alt="" />
                  <button *ngIf="img.index >= 0" class="btn btn-sm btn-danger position-absolute top-0 end-0 rounded-circle p-0"
                          style="width:20px;height:20px;font-size:10px;line-height:1;transform:translate(35%,-35%)"
                          (click)="removeImage(img.index)" [disabled]="imageBusy" title="Supprimer cette photo">✕</button>
                </div>
              }
            </div>
            <div class="mt-2">
              <input type="file" accept="image/*" multiple class="form-control form-control-sm" style="max-width:280px"
                     (change)="onImageSelected($event)" [disabled]="imageBusy" />
              <div *ngIf="imageBusy" class="fs-12 text-muted mt-1">Envoi en cours...</div>
              <div *ngIf="imageError" class="fs-12 text-danger mt-1">{{ imageError }}</div>
            </div>

          } @else {
            <!-- ── Mode édition ── -->
            <div class="mb-3">
              <label class="form-label fs-12 fw-semibold text-muted">Nom du produit <span class="text-danger">*</span></label>
              <input type="text" class="form-control" [(ngModel)]="editForm.name" />
            </div>
            <div class="mb-3">
              <label class="form-label fs-12 fw-semibold text-muted">Description</label>
              <textarea class="form-control" rows="6" [(ngModel)]="editForm.description"></textarea>
            </div>
            <div class="row g-3 mb-3">
              <div class="col-6">
                <label class="form-label fs-12 fw-semibold text-muted">Prix (TND)</label>
                <input type="text" class="form-control" [(ngModel)]="editForm.price" />
              </div>
              <div class="col-6">
                <label class="form-label fs-12 fw-semibold text-muted">Stock</label>
                <input type="number" min="0" class="form-control" [(ngModel)]="editForm.stock" />
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label fs-12 fw-semibold text-muted">Catégorie</label>
              <select class="form-select" [(ngModel)]="editForm.idCateg">
                <option [ngValue]="null">—</option>
                @for (c of categoriesList; track c.IdCateg) {
                  <option [ngValue]="c.IdCateg">{{ c.TitleFr }}</option>
                }
              </select>
            </div>
            <div class="form-check form-switch mb-3">
              <input class="form-check-input" type="checkbox" role="switch" id="editIsActiveProduct" [(ngModel)]="editForm.isActive" />
              <label class="form-check-label fs-13" for="editIsActiveProduct">Produit approuvé</label>
            </div>

            <div *ngIf="saveError" class="alert alert-danger fs-13 py-2 px-3">{{ saveError }}</div>

            <div class="d-flex justify-content-end gap-2 mt-4">
              <button class="btn btn-light" (click)="cancelEdit()" [disabled]="saving">Annuler</button>
              <button class="btn btn-primary" (click)="save()" [disabled]="saving">
                <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
                <i *ngIf="!saving" class="ri-save-line me-1"></i>
                {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- ═════ Colonne latérale : Vendeur ═════ -->
    <div class="col-lg-4">
      <div class="card border-0 shadow-sm">
        <div class="card-body text-center">
          <div class="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold mx-auto mb-3"
               style="width:72px;height:72px;font-size:24px">
            {{ getInitials(product.vendorName) }}
          </div>
          <h6 class="fw-bold mb-1">
            {{ product.vendorName || '—' }}
            <i *ngIf="product.vendorVerified" class="ri-shield-check-fill text-success fs-13" title="Vendeur vérifié"></i>
          </h6>
          <p *ngIf="product.vendorPhone" class="text-muted fs-12 mt-2 mb-0">
            <i class="ri-phone-line me-1"></i>{{ product.vendorPhone }}
          </p>
          <a *ngIf="product.idUser" class="btn btn-light btn-sm mt-3" [routerLink]="['/admin/vendor-detail', product.idUser]">
            Voir la fiche vendeur
          </a>
        </div>
      </div>
    </div>
  </div>
}
`,
})
export class ProductDetailAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Produits' }, { label: 'Détail', active: true }];

  loading = true;
  product: ProductDetail | null = null;

  editMode  = false;
  editForm  = { name: '', description: '', price: '', stock: 0, idCateg: null as number | null, isActive: true };
  saving    = false;
  saveError = '';
  categoriesList: any[] = [];

  imageBusy  = false;
  imageError = '';
  heroImageErrored = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private products: ProductsService,
    private categories: CategoriesService,
    private usersVendors: UsersVendorsService,
  ) {}

  ngOnInit(): void {
    const id = +(this.route.snapshot.paramMap.get('id') || 0);
    if (!id) { this.loading = false; return; }
    this.load(id);
  }

  load(id: number): void {
    this.loading = true;
    this.products.getProduct(id).pipe(
      map((res: any) => res?.data ?? null)
    ).subscribe({
      next: (p: any) => {
        if (!p) { this.product = null; this.loading = false; return; }
        this.product = {
          id:             p.IdProduct,
          name:           p.TitleProduct ?? '—',
          description:    p.DescriptionProduct ?? '',
          price:          String(p.PriceProduct ?? '0'),
          stock:          +(p.QuantityProduct ?? 0),
          images:         this.allImages(p.ImageProduct, p.IdProduct),
          idCateg:        p.IdCateg ?? null,
          category:       '',
          idUser:         p.IdUser ?? null,
          vendorName:     '',
          vendorVerified: false,
          vendorPhone:    '',
          isActive:       !!p.Active,
          viewCount:      +(p.ViewCount ?? 0),
        };
        this.loading = false;
        this.resolveCategoryAndVendor(p.IdCateg, p.IdUser);
      },
      error: () => { this.loading = false; }
    });
  }

  private resolveCategoryAndVendor(idCateg: number | null, idUser: number | null): void {
    forkJoin({
      category: idCateg != null
        ? this.categories.getCategories({ per_page: 200 }).pipe(
            map((res: any) => {
              const cats = res?.data ?? res ?? [];
              const cat = (cats as any[]).find((c: any) => c.IdCateg === idCateg);
              return cat?.TitleFr || '';
            }),
            catchError(() => of(''))
          )
        : of(''),
      vendor: idUser != null
        ? this.usersVendors.getAdminUserDetails(idUser).pipe(
            map((res: any) => res?.data ?? res ?? null),
            catchError(() => of(null))
          )
        : of(null),
    }).subscribe(({ category, vendor }: { category: string; vendor: any }) => {
      if (!this.product) return;
      this.product.category = category;
      if (vendor) {
        this.product.vendorName = `${vendor.FirstName || ''} ${vendor.LastName || ''}`.trim() || vendor.Username || '';
        this.product.vendorVerified = !!vendor.IsBusinessAccount;
        this.product.vendorPhone = vendor.Telephone || '';
      }
    });
  }

  // ── Images ──
  get heroImageUrl(): string {
    if (this.heroImageErrored || !this.product?.images.length) return '';
    return this.product.images[0]?.url || '';
  }

  onHeroImageError(): void { this.heroImageErrored = true; }

  private allImages(raw: any, id: number): ImageEntry[] {
    let filenames: string[] = [];
    if (Array.isArray(raw)) {
      filenames = raw;
    } else if (typeof raw === 'string' && raw) {
      try {
        const parsed = JSON.parse(raw);
        filenames = Array.isArray(parsed) ? parsed : [raw];
      } catch {
        filenames = [raw];
      }
    }

    const entries: ImageEntry[] = filenames.map((f, i) => ({
      url: f.includes('assets/')
        ? `${this.products.assetBaseUrl}/${f.replace(/^\/+/, '')}`
        : `${this.products.assetBaseUrl}/assets/products/images/${f}`,
      index: i,
    }));

    if (!entries.length) {
      entries.push({ url: `${this.products.assetBaseUrl}/assets/products/images/product_${id}.jpg`, index: -1 });
    }
    return entries;
  }

  onImageSelected(ev: Event): void {
    if (!this.product) return;
    const input = ev.target as HTMLInputElement;
    const files = input.files;
    if (!files || !files.length) return;

    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('ImageProduct[]', f));

    this.imageBusy  = true;
    this.imageError = '';
    this.products.addProductMedia(this.product.id, formData).subscribe({
      next: () => { this.imageBusy = false; this.heroImageErrored = false; this.load(this.product!.id); },
      error: () => { this.imageBusy = false; this.imageError = "Échec de l'envoi des photos."; },
    });
    input.value = '';
  }

  removeImage(index: number): void {
    if (!this.product) return;
    if (!confirm('Supprimer cette photo ?')) return;
    this.imageBusy  = true;
    this.imageError = '';
    this.products.removeProductPhoto(this.product.id, index).subscribe({
      next: () => { this.imageBusy = false; this.heroImageErrored = false; this.load(this.product!.id); },
      error: () => { this.imageBusy = false; this.imageError = 'Suppression impossible.'; },
    });
  }

  // ── Actions ──
  toggleActive(): void {
    if (!this.product) return;
    const action$ = this.product.isActive
      ? this.products.rejectProductAdmin(this.product.id)
      : this.products.approveProduct(this.product.id);
    action$.subscribe({
      next:  () => { this.product!.isActive = !this.product!.isActive; },
      error: () => alert('Action impossible.'),
    });
  }

  remove(): void {
    if (!this.product) return;
    if (!confirm(`Supprimer le produit "${this.product.name}" ?`)) return;
    this.products.deleteProduct(this.product.id).subscribe({
      next:  () => this.router.navigate(['/admin/products']),
      error: () => alert('Suppression impossible. Réessayez.'),
    });
  }

  startEdit(): void {
    if (!this.product) return;
    this.editForm = {
      name:        this.product.name,
      description: this.product.description,
      price:       this.product.price,
      stock:       this.product.stock,
      idCateg:     this.product.idCateg,
      isActive:    this.product.isActive,
    };
    this.saveError = '';
    this.editMode   = true;
    if (!this.categoriesList.length) {
      this.categories.getCategories({ per_page: 200 }).subscribe({
        next: (res: any) => { this.categoriesList = res?.data ?? res ?? []; },
        error: () => { this.categoriesList = []; },
      });
    }
  }

  cancelEdit(): void {
    this.editMode  = false;
    this.saveError = '';
  }

  save(): void {
    if (!this.product) return;
    if (!this.editForm.name.trim()) { this.saveError = 'Le nom est obligatoire.'; return; }

    this.saving    = true;
    this.saveError = '';

    const payload: any = {
      TitleProduct:       this.editForm.name,
      DescriptionProduct: this.editForm.description,
      PriceProduct:       this.editForm.price,
      QuantityProduct:    +this.editForm.stock,
      IdCateg:            this.editForm.idCateg,
      Active:             this.editForm.isActive,
    };

    this.products.updateProduct(this.product.id, payload).subscribe({
      next: () => {
        const p = this.product!;
        p.name        = this.editForm.name;
        p.description = this.editForm.description;
        p.price       = this.editForm.price;
        p.stock       = +this.editForm.stock;
        p.idCateg     = this.editForm.idCateg;
        p.category    = this.categoriesList.find((c: any) => c.IdCateg === this.editForm.idCateg)?.TitleFr || p.category;
        p.isActive    = this.editForm.isActive;
        this.saving   = false;
        this.editMode = false;
      },
      error: (err) => {
        this.saving    = false;
        this.saveError = err?.error?.message || 'Mise à jour impossible. Réessayez.';
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }
}
