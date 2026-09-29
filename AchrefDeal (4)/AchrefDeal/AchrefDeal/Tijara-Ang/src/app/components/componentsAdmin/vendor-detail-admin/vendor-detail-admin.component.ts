import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { CategoriesService } from 'src/app/core/services/categories.service';
import { DealsService } from 'src/app/core/services/deals.service';
import { UsersVendorsService } from 'src/app/core/services/users-vendors.service';

@Component({
  selector: 'app-vendor-detail-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Détail vendeur" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

@if (loading) {
  <div class="text-center py-5"><div class="spinner-border text-success"></div></div>
} @else if (!vendor) {
  <div class="card border-0 shadow-sm">
    <div class="card-body text-center py-5">
      <i class="ri-store-line display-3 text-muted opacity-50"></i>
      <h5 class="mt-3">Vendeur introuvable</h5>
      <a routerLink="/admin/vendors" class="btn btn-success mt-2">Retour</a>
    </div>
  </div>
} @else {
  <!-- Profile -->
  <div class="card border-0 shadow-sm mb-4 overflow-hidden">
    <div style="background:linear-gradient(135deg,#0ab39c 0%,#405189 100%); height:120px"></div>
    <div class="card-body" style="margin-top:-60px">
      <div class="d-flex flex-wrap align-items-end gap-3">
        <div class="rounded-3 bg-white p-1 shadow" style="width:120px;height:120px">
          @if (vendor.avatar) {
            <img [src]="vendor.avatar" (error)="vendor.avatar=''" alt=""
                 class="rounded-3" style="width:100%;height:100%;object-fit:cover" />
          } @else {
            <div class="rounded-3 bg-success-subtle text-success
                        d-flex align-items-center justify-content-center fw-bold"
                 style="width:100%;height:100%;font-size:32px">
              {{ getInitials(vendor.shopName) }}
            </div>
          }
        </div>
        <div class="flex-grow-1">
          <h3 class="mb-1">{{ vendor.shopName }}
            @if (vendor.isApproved) {
              <i class="ri-shield-check-fill text-success ms-2" title="Validé"></i>
            }
          </h3>
          <p class="text-muted mb-2">
            <i class="ri-user-line me-1"></i>{{ vendor.ownerName }}
            <span class="ms-3"><i class="ri-mail-line me-1"></i>{{ vendor.email }}</span>
            @if (vendor.phone) { <span class="ms-3"><i class="ri-phone-line me-1"></i>{{ vendor.phone }}</span> }
          </p>
          @if (vendor.isApproved) {
            <span class="badge bg-success-subtle text-success me-1">Validé</span>
          } @else {
            <span class="badge bg-warning-subtle text-warning me-1">À valider</span>
          }
          @if (vendor.isActive) {
            <span class="badge bg-success-subtle text-success">Actif</span>
          } @else {
            <span class="badge bg-danger-subtle text-danger">Bloqué</span>
          }
        </div>
        <div class="d-flex gap-2 flex-wrap">
          @if (!vendor.isApproved) {
            <button class="btn btn-success" (click)="approve()">
              <i class="ri-check-line me-1"></i>Approuver
            </button>
          }
          <button class="btn btn-outline-warning" (click)="toggleActive()">
            <i [class]="vendor.isActive ? 'ri-lock-line' : 'ri-shield-check-line'"></i>
            {{ vendor.isActive ? 'Bloquer' : 'Activer' }}
          </button>
          <button class="btn btn-outline-danger" (click)="reject()">
            <i class="ri-close-line me-1"></i>Rejeter
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="row g-3 mb-4">
    <div class="col-md-4">
      <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #0ab39c">
        <div class="card-body py-3">
          <p class="mb-0 fs-12 text-muted">Total annonces</p>
          <h3 class="mb-0 fw-bold text-success">{{ stats.total_deals || 0 }}</h3>
        </div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #405189">
        <div class="card-body py-3">
          <p class="mb-0 fs-12 text-muted">Annonces actives</p>
          <h3 class="mb-0 fw-bold text-primary">{{ stats.active_deals || 0 }}</h3>
        </div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #f7b84b">
        <div class="card-body py-3">
          <p class="mb-0 fs-12 text-muted">En attente</p>
          <h3 class="mb-0 fw-bold text-warning">{{ (stats.total_deals || 0) - (stats.active_deals || 0) }}</h3>
        </div>
      </div>
    </div>
  </div>

  <!-- Products -->
  <div class="card border-0 shadow-sm">
    <div class="card-header bg-transparent py-3">
      <h6 class="mb-0 fw-semibold">
        <i class="ri-shopping-bag-3-line me-2 text-success"></i>
        Annonces du vendeur ({{ products.length }})
      </h6>
    </div>
    <div class="card-body p-0">
      @if (products.length === 0) {
        <p class="text-center text-muted fs-13 py-4 mb-0">Aucune annonce publiée.</p>
      } @else {
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">N°</th>
                <th>Titre</th>
                <th>Catégorie</th>
                <th class="text-end">Prix</th>
                <th class="text-center">Statut</th>
                <th class="pe-3">Publié le</th>
              </tr>
            </thead>
            <tbody>
              @for (p of products; track p.id_deal) {
                <tr>
                  <td class="ps-3 fw-semibold text-success fs-13">#{{ p.id_deal }}</td>
                  <td class="fs-13">{{ p.title_deal || '—' }}</td>
                  <td class="fs-12 text-muted">{{ p.category_name || '—' }}</td>
                  <td class="text-end fs-13 fw-semibold">{{ p.price_deal }} TND</td>
                  <td class="text-center">
                    @if (p.active === 1) {
                      <span class="badge bg-success-subtle text-success">Actif</span>
                    } @else {
                      <span class="badge bg-warning-subtle text-warning">En attente</span>
                    }
                  </td>
                  <td class="pe-3 fs-12 text-muted">{{ formatDate(p.date_publication) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  </div>
}
`,
})
export class VendorDetailAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Vendeur', active: true }];

  loading = true;
  vendor: any = null;
  products: any[] = [];
  stats: any = {};
  categoryNames: Record<number, string> = {};

  constructor(private route: ActivatedRoute, private router: Router, private api: TijaraApiService, private categories: CategoriesService, private deals: DealsService, private usersVendors: UsersVendorsService) {}

  ngOnInit(): void {
    const id = +(this.route.snapshot.paramMap.get('id') || 0);
    if (!id) { this.loading = false; return; }
    this.categories.getCategories({ per_page: 200 }).subscribe({
      next: (res: any) => {
        (res?.data || res || []).forEach((c: any) => {
          this.categoryNames[c.IdCateg] = c.TitleFr || c.TitleEn || '';
        });
        this.loadVendor(id);
      },
      error: () => this.loadVendor(id),
    });
  }

  private loadVendor(id: number): void {
    this.usersVendors.getAdminVendorDetails(id).subscribe({
      next: (res: any) => {
        const v = res?.data || {};
        this.vendor = {
          id:          v.IdUser,
          shopName:    `${v.FirstName || ''} ${v.LastName || ''}`.trim() || v.Username || v.Email,
          ownerName:   `${v.FirstName || ''} ${v.LastName || ''}`.trim() || '—',
          email:       v.Email,
          phone:       v.Telephone,
          isActive:    !!v.Active,
          isApproved:  !!v.IsBusinessAccount,
          
          avatar:      `${this.usersVendors.assetBaseUrl}/assets/users/profiles/user_${v.IdUser}.jpg`,
        };
        
        this.deals.getDeals({ idUser: v.IdUser, per_page: 200 }).subscribe({
          next: (dealsRes: any) => {
            const rows = dealsRes?.data ?? dealsRes ?? [];
            this.products = rows.map((d: any) => ({
              id_deal:          d.idDeal ?? d.id,
              title_deal:       d.titleDeal,
              category_name:    this.categoryNames[d.idCateg] || '—',
              price_deal:       d.priceDeal,
              active:           d.active ? 1 : 0,
              date_publication: d.datePublication,
            }));
            this.stats = {
              total_deals:  this.products.length,
              active_deals: this.products.filter((p: any) => p.active === 1).length,
            };
          },
          error: () => { this.products = []; this.stats = {}; },
        });
        this.loading  = false;
      },
      error: () => { this.loading = false; }
    });
  }

  approve(): void {
    this.usersVendors.approveVendor(this.vendor.id).subscribe({
      next: () => { this.vendor.isApproved = true; this.vendor.isActive = true; },
      error: () => alert('Approbation impossible.'),
    });
  }
  reject(): void {
    if (!confirm('Rejeter ce vendeur ?')) return;
    this.usersVendors.rejectVendor(this.vendor.id).subscribe({
      next: () => { this.vendor.isApproved = false; this.vendor.isActive = false; },
      error: () => alert('Action impossible.'),
    });
  }
  toggleActive(): void {
    this.usersVendors.toggleAdminUser(this.vendor.id).subscribe({
      next: () => this.vendor.isActive = !this.vendor.isActive,
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