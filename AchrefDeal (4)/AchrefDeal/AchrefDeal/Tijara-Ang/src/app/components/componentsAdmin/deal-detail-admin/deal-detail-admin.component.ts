import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { CategoriesService } from 'src/app/core/services/categories.service';
import { UsersVendorsService } from 'src/app/core/services/users-vendors.service';
import { DealsService } from 'src/app/core/services/deals.service';

interface DealDetail {
  id:             number;
  title:          string;
  description:    string;
  price:          string;
  discount:       number;
  image:          string;
  category:       string;
  idCateg:        number | null;
  location:       string;
  brand:          string;
  condition:      string;
  vendorName:     string;
  vendorVerified: boolean;
  vendorPhone:    string;
  shopName:       string;
  isActive:       boolean;
  date:           string | null;
  quantity:       number;
}

@Component({
  selector: 'app-deal-detail-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Détail du deal" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

@if (loading) {
  <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
} @else if (!deal) {
  <div class="card border-0 shadow-sm">
    <div class="card-body text-center py-5">
      <i class="ri-flashlight-line display-3 text-muted opacity-50"></i>
      <h5 class="mt-3">Deal introuvable</h5>
      <a routerLink="/admin/deals" class="btn btn-primary mt-2">Retour à la liste</a>
    </div>
  </div>
} @else {

  <!-- ═════ En-tête ═════ -->
  <div class="card border-0 shadow-sm mb-4">
    <div class="card-body d-flex flex-wrap align-items-start justify-content-between gap-3">
      <div class="d-flex align-items-center gap-2">
        <a routerLink="/admin/deals" class="btn btn-light btn-sm rounded-circle" style="width:36px;height:36px">
          <i class="ri-arrow-left-line"></i>
        </a>
        <div>
          <h4 class="fw-bold mb-1">{{ deal.title }}</h4>
          <span class="badge rounded-pill" [class]="deal.isActive ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'">
            <i [class]="deal.isActive ? 'ri-checkbox-circle-fill me-1' : 'ri-time-fill me-1'"></i>
            {{ deal.isActive ? 'Actif' : 'En attente' }}
          </span>
          <span class="text-muted fs-12 ms-2">ID #{{ deal.id }}</span>
        </div>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-sm" [class]="deal.isActive ? 'btn-warning text-white' : 'btn-success'" (click)="toggleActive()">
          <i [class]="deal.isActive ? 'ri-pause-circle-line me-1' : 'ri-play-circle-line me-1'"></i>
          {{ deal.isActive ? 'Désactiver' : 'Activer' }}
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
          <!-- Image -->
          <div *ngIf="deal.image" class="mb-4 text-center">
            <img [src]="deal.image" alt="" class="img-fluid rounded-3" style="max-height:320px;object-fit:cover" />
          </div>

          @if (!editMode) {
            <!-- ── Mode lecture : TOUS les détails ── -->
            <h6 class="fw-semibold text-muted fs-12 text-uppercase mb-2">Description complète</h6>
            <p class="fs-14 mb-4" style="white-space:pre-wrap">{{ deal.description || 'Aucune description fournie.' }}</p>

            <div class="row g-3">
              <div class="col-6 col-md-4">
                <div class="p-3 rounded-3 bg-light">
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Prix</div>
                  <div class="fw-bold fs-18">
                    {{ finalPrice() }} <span class="fs-12 text-muted">TND</span>
                    <span *ngIf="deal.discount > 0" class="text-muted text-decoration-line-through fs-12 ms-1">{{ deal.price }} TND</span>
                  </div>
                </div>
              </div>
              <div class="col-6 col-md-4">
                <div class="p-3 rounded-3 bg-light">
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Réduction</div>
                  <div class="fw-bold fs-18" [class.text-danger]="deal.discount > 0">{{ deal.discount > 0 ? deal.discount + '%' : '—' }}</div>
                </div>
              </div>
              <div class="col-6 col-md-4">
                <div class="p-3 rounded-3 bg-light">
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Catégorie</div>
                  <div class="fs-14">{{ deal.category || '—' }}</div>
                </div>
              </div>
              <div class="col-6 col-md-4">
                <div class="p-3 rounded-3 bg-light">
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Stock</div>
                  <div class="fs-14">{{ deal.quantity > 0 ? deal.quantity : 'Illimité' }}</div>
                </div>
              </div>
              <div class="col-6 col-md-4">
                <div class="p-3 rounded-3 bg-light">
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Date de publication</div>
                  <div class="fs-14">{{ formatDate(deal.date) }}</div>
                </div>
              </div>
              <div class="col-6 col-md-4">
                <div class="p-3 rounded-3 bg-light">
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Boutique</div>
                  <div class="fs-14">{{ deal.shopName || '—' }}</div>
                </div>
              </div>
              <div class="col-6 col-md-4">
                <div class="p-3 rounded-3 bg-light">
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Localisation</div>
                  <div class="fs-14">{{ deal.location || '—' }}</div>
                </div>
              </div>
              <div class="col-6 col-md-4">
                <div class="p-3 rounded-3 bg-light">
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Marque</div>
                  <div class="fs-14">{{ deal.brand || '—' }}</div>
                </div>
              </div>
              <div class="col-6 col-md-4">
                <div class="p-3 rounded-3 bg-light">
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">État</div>
                  <div class="fs-14">{{ deal.condition || '—' }}</div>
                </div>
              </div>
            </div>
          } @else {
            <!-- ── Mode édition : formulaire complet ── -->
            <div class="mb-3">
              <label class="form-label fs-12 fw-semibold text-muted">Titre <span class="text-danger">*</span></label>
              <input type="text" class="form-control" [(ngModel)]="editForm.title" />
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
                <label class="form-label fs-12 fw-semibold text-muted">Réduction (%)</label>
                <input type="number" min="0" max="100" class="form-control" [(ngModel)]="editForm.discount" />
              </div>
            </div>
            <div class="row g-3 mb-3">
              <div class="col-6">
                <label class="form-label fs-12 fw-semibold text-muted">Catégorie</label>
                <select class="form-select" [(ngModel)]="editForm.idCateg">
                  <option [ngValue]="null">—</option>
                  @for (c of categoriesList; track c.IdCateg) {
                    <option [ngValue]="c.IdCateg">{{ c.TitleFr }}</option>
                  }
                </select>
              </div>
              <div class="col-6">
                <label class="form-label fs-12 fw-semibold text-muted">Stock (0 = illimité)</label>
                <input type="number" min="0" class="form-control" [(ngModel)]="editForm.quantity" />
              </div>
            </div>
            <div class="row g-3 mb-3">
              <div class="col-4">
                <label class="form-label fs-12 fw-semibold text-muted">Localisation</label>
                <input type="text" class="form-control" [(ngModel)]="editForm.location" />
              </div>
              <div class="col-4">
                <label class="form-label fs-12 fw-semibold text-muted">Marque</label>
                <input type="text" class="form-control" [(ngModel)]="editForm.brand" />
              </div>
              <div class="col-4">
                <label class="form-label fs-12 fw-semibold text-muted">État</label>
                <input type="text" class="form-control" [(ngModel)]="editForm.condition" />
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label fs-12 fw-semibold text-muted">Image (URL)</label>
              <input type="text" class="form-control" [(ngModel)]="editForm.image" />
            </div>
            <div class="form-check form-switch mb-3">
              <input class="form-check-input" type="checkbox" role="switch" id="editIsActiveDetail" [(ngModel)]="editForm.isActive" />
              <label class="form-check-label fs-13" for="editIsActiveDetail">Deal actif</label>
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
            {{ getInitials(deal.vendorName) }}
          </div>
          <h6 class="fw-bold mb-1">
            {{ deal.vendorName || '—' }}
            <i *ngIf="deal.vendorVerified" class="ri-shield-check-fill text-success fs-13" title="Vendeur vérifié"></i>
          </h6>
          <p class="text-muted fs-12 mb-0">{{ deal.shopName || 'Vendeur' }}</p>
          <p *ngIf="deal.vendorPhone" class="text-muted fs-12 mt-2 mb-0">
            <i class="ri-phone-line me-1"></i>{{ deal.vendorPhone }}
          </p>
        </div>
      </div>
    </div>
  </div>
}
`,
})
export class DealDetailAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Deals' }, { label: 'Détail', active: true }];

  loading = true;
  deal: DealDetail | null = null;

  editMode  = false;
  editForm  = { title: '', description: '', price: '', discount: 0, category: '', idCateg: null as number | null, quantity: 0, image: '', location: '', brand: '', condition: '', isActive: true };
  saving    = false;
  saveError = '';
  categoriesList: any[] = [];

  constructor(private route: ActivatedRoute, private router: Router, private api: TijaraApiService, private categories: CategoriesService, private usersVendors: UsersVendorsService, private deals: DealsService) {}

  ngOnInit(): void {
    const id = +(this.route.snapshot.paramMap.get('id') || 0);
    if (!id) { this.loading = false; return; }
    this.load(id);
  }

 
  load(id: number): void {
    this.loading = true;
    this.deals.getDealDetails(id).pipe(
      map((res: any) => res?.data ?? null)
    ).subscribe({
      next: (d: any) => {
        if (!d) { this.deal = null; this.loading = false; return; }
        this.deal = {
          id:             d.IdDeal,
          title:           d.titleDeal       ?? '—',
          description:     d.descriptionDeal ?? '',
          price:           String(d.priceDeal ?? '0'),
          discount:       +(String(d.discountDeal ?? '0').replace('%', '')) || 0,
          image:           d.imageDeal ?? '',
          category:        '',
          idCateg:         d.idCateg ?? null,
          location:        d.locationDeal ?? '',
          brand:           d.brand ?? '',
         
          condition:       '',
          vendorName:      d.ownerdeals ?? '—',
          vendorVerified:  false,
          vendorPhone:     d.telephone ?? '',
          shopName:        '',
          isActive:       !!d.active,
          date:            d.datePublication ?? null,
          quantity:       +(d.quantity ?? 0),
        };
        this.loading = false;
        this.resolveCategoryAndVendor(d.idCateg, d.idUser);
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
      if (!this.deal) return;
      this.deal.category = category;
      if (vendor) {
        this.deal.vendorName = `${vendor.FirstName || ''} ${vendor.LastName || ''}`.trim() || vendor.Username || this.deal.vendorName;
        this.deal.vendorVerified = !!vendor.IsBusinessAccount;
        this.deal.vendorPhone = vendor.Telephone || this.deal.vendorPhone;
      }
    });
  }


  toggleActive(): void {
    if (!this.deal) return;
    this.deals.activateDeal(this.deal.id, !this.deal.isActive).subscribe({
      next:  () => { this.deal!.isActive = !this.deal!.isActive; },
      error: () => alert('Action impossible.'),
    });
  }


  remove(): void {
    if (!this.deal) return;
    if (!confirm(`Supprimer le deal "${this.deal.title}" ?`)) return;
    this.deals.deleteDealAdmin(this.deal.id).subscribe({
      next:  () => this.router.navigate(['/admin/deals']),
      error: () => alert('Suppression impossible. Réessayez.'),
    });
  }

  startEdit(): void {
    if (!this.deal) return;
    this.editForm = {
      title:       this.deal.title,
      description: this.deal.description,
      price:       this.deal.price,
      discount:    this.deal.discount,
      category:    this.deal.category,
      idCateg:     this.deal.idCateg,
      quantity:    this.deal.quantity,
      image:       this.deal.image,
      location:    this.deal.location,
      brand:       this.deal.brand,
      condition:   this.deal.condition,
      isActive:    this.deal.isActive,
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
    if (!this.deal) return;
    if (!this.editForm.title.trim()) { this.saveError = 'Le titre est obligatoire.'; return; }
  

    this.saving    = true;
    this.saveError = '';

    const payload: any = {
      titleDeal:       this.editForm.title,
      descriptionDeal: this.editForm.description,
      priceDeal:       this.editForm.price,
      discountDeal:    String(this.editForm.discount),
      quantity:        +this.editForm.quantity,
      active:          this.editForm.isActive,
      imageDeal:       this.editForm.image,
      locationDeal:    this.editForm.location,
      brand:           this.editForm.brand,
      idCateg:         this.editForm.idCateg,
     
    };

    this.deals.updateDealAdmin(this.deal.id, payload).subscribe({
      next: () => {
        const d = this.deal!;
        d.title       = this.editForm.title;
        d.description = this.editForm.description;
        d.price       = this.editForm.price;
        d.discount    = +this.editForm.discount;
        d.idCateg     = this.editForm.idCateg;
        d.category    = this.categoriesList.find((c: any) => c.IdCateg === this.editForm.idCateg)?.TitleFr || '';
        d.quantity    = +this.editForm.quantity;
        d.image       = this.editForm.image;
        d.location    = this.editForm.location;
        d.brand       = this.editForm.brand;
        d.condition   = this.editForm.condition;
        d.isActive    = this.editForm.isActive;
        this.saving   = false;
        this.editMode = false;
      },
      error: (err) => {
        this.saving    = false;
        this.saveError = err?.error?.message || "Mise à jour impossible. Réessayez.";
      }
    });
  }

  finalPrice(): string {
    if (!this.deal) return '0';
    const base = parseFloat(this.deal.price) || 0;
    if (!this.deal.discount) return base.toFixed(2);
    return (base * (1 - this.deal.discount / 100)).toFixed(2);
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }
}