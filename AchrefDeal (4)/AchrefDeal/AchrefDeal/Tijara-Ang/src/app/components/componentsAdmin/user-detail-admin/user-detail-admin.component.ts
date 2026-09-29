import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { DealsService } from 'src/app/core/services/deals.service';
import { InvoicesService } from 'src/app/core/services/invoices.service';
import { OrdersService } from 'src/app/core/services/orders.service';
import { UsersVendorsService } from 'src/app/core/services/users-vendors.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-user-detail-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Détail utilisateur" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

@if (loading) {
  <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
} @else if (!user) {
  <div class="card border-0 shadow-sm">
    <div class="card-body text-center py-5">
      <i class="ri-user-search-line display-3 text-muted opacity-50"></i>
      <h5 class="mt-3">Utilisateur introuvable</h5>
      <a routerLink="/admin/users" class="btn btn-primary mt-2">Retour</a>
    </div>
  </div>
} @else {
  <!-- Profile card -->
  <div class="card border-0 shadow-sm mb-4 overflow-hidden">
    <div style="background:linear-gradient(135deg,#405189 0%,#0ab39c 100%); height:120px"></div>
    <div class="card-body" style="margin-top:-60px">
      <div class="d-flex flex-wrap align-items-end gap-3">
        <div class="rounded-circle bg-white p-1 shadow" style="width:120px;height:120px">
          @if (user.avatar) {
            <img [src]="user.avatar" (error)="user.avatar=''" alt=""
                 class="rounded-circle" style="width:100%;height:100%;object-fit:cover" />
          } @else {
            <div class="rounded-circle bg-primary-subtle text-primary
                        d-flex align-items-center justify-content-center fw-bold"
                 style="width:100%;height:100%;font-size:36px">
              {{ getInitials(user.fullName) }}
            </div>
          }
        </div>
        <div class="flex-grow-1">
          <h3 class="mb-1">{{ user.fullName }}
            @if (user.isPremium) { <i class="ri-vip-crown-fill text-warning ms-2"></i> }
          </h3>
          <p class="text-muted mb-2">
            <i class="ri-mail-line me-1"></i>{{ user.email }}
            @if (user.phone) { <span class="ms-3"><i class="ri-phone-line me-1"></i>{{ user.phone }}</span> }
          </p>
          <span class="badge bg-primary-subtle text-primary me-1">{{ user.role }}</span>
          @if (user.isActive) {
            <span class="badge bg-success-subtle text-success">Actif</span>
          } @else {
            <span class="badge bg-danger-subtle text-danger">Bloqué</span>
          }
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-warning" (click)="togglePremium()">
            <i class="ri-vip-crown-line me-1"></i>{{ user.isPremium ? 'Retirer Premium' : 'Activer Premium' }}
          </button>
          <button class="btn btn-outline-danger" (click)="toggleActive()">
            <i [class]="user.isActive ? 'ri-lock-line' : 'ri-shield-check-line'"></i>
            {{ user.isActive ? 'Bloquer' : 'Activer' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="row g-3 mb-4">
    <div class="col-md-3">
      <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #405189">
        <div class="card-body py-3">
          <p class="mb-0 fs-12 text-muted">Commandes passées</p>
          <h3 class="mb-0 fw-bold text-primary">{{ stats.total_orders }}</h3>
        </div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #299cdb">
        <div class="card-body py-3">
          <p class="mb-0 fs-12 text-muted">Factures émises</p>
          <h3 class="mb-0 fw-bold text-info">{{ stats.total_invoices }}</h3>
        </div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #0ab39c">
        <div class="card-body py-3">
          <p class="mb-0 fs-12 text-muted">Total payé (TND)</p>
          <h3 class="mb-0 fw-bold text-success">{{ stats.total_paid | number:'1.0-0' }}</h3>
        </div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #f06548">
        <div class="card-body py-3">
          <p class="mb-0 fs-12 text-muted">Réclamations</p>
          <h3 class="mb-0 fw-bold text-danger">{{ stats.total_reclam }}</h3>
        </div>
      </div>
    </div>
  </div>

  <!-- Orders -->
  <div class="card border-0 shadow-sm">
    <div class="card-header bg-transparent py-3">
      <h6 class="mb-0 fw-semibold">
        <i class="ri-shopping-bag-3-line me-2 text-primary"></i>
        Commandes ({{ orders.length }})
      </h6>
    </div>
    <div class="card-body p-0">
      @if (orders.length === 0) {
        <p class="text-center text-muted fs-13 py-4 mb-0">Aucune commande passée par cet utilisateur.</p>
      } @else {
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">N°</th>
                <th>Produit</th>
                <th class="text-end">Prix</th>
                <th class="text-center">Statut</th>
                <th class="pe-3">Date</th>
              </tr>
            </thead>
            <tbody>
              @for (o of orders; track o.id) {
                <tr>
                  <td class="ps-3 fw-semibold text-primary fs-13">#{{ o.id }}</td>
                  <td class="fs-13">{{ o.deal_title || '—' }}</td>
                  <td class="text-end fs-13 fw-semibold">{{ o.price | number:'1.2-3' }} TND</td>
                  <td class="text-center"><span class="badge" [class]="statusClass(o.active)">{{ statusLabel(o.active) }}</span></td>
                  <td class="pe-3 fs-12 text-muted">{{ formatDate(o.date) }}</td>
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
export class UserDetailAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Utilisateur', active: true }];

  loading = true;
  user: any = null;
  orders: any[] = [];
  stats = { total_orders: 0, total_invoices: 0, total_paid: 0, total_reclam: 0 };

  constructor(private route: ActivatedRoute, private router: Router, private api: TijaraApiService, private deals: DealsService, private invoices: InvoicesService, private ordersApi: OrdersService, private usersVendors: UsersVendorsService) {}

  ngOnInit(): void {
    const id = +(this.route.snapshot.paramMap.get('id') || 0);
    if (!id) { this.loading = false; return; }
    this.usersVendors.getAdminUserDetails(id).subscribe({
      next: (res: any) => {
        const u = res?.data || {};
        const idRole = u.IdRole;
        this.user = {
          id:        u.IdUser,
          fullName:  `${u.FirstName || ''} ${u.LastName || ''}`.trim() || u.Username || u.Email || '—',
          email:     u.Email,
          phone:     u.Telephone,
          role:      idRole === 3 ? 'admin' : idRole === 2 ? 'vendor' : 'user',
          isActive:  !!u.Active,
          isPremium: !!u.IsPremuim,
          isApproved:true,
          createdAt: u.CreationDate,

          avatar:    `${this.usersVendors.assetBaseUrl}/assets/users/profiles/user_${u.IdUser}.jpg`,
        };
        
        this.ordersApi.getOrders({ IdUser: u.IdUser, per_page: 200 }).subscribe({
          next: (ordersRes: any) => {
            const rows = ordersRes?.data ?? ordersRes ?? [];
            const withTitles$ = rows.map((o: any) =>
              (o.IdDeal
                ? this.deals.getDeal(o.IdDeal).pipe(catchError(() => of(null)))
                : of(null)
              )
            );
            (withTitles$.length ? forkJoin(withTitles$) : of([] as any[])).subscribe((deals: any) => {
              this.orders = rows.map((o: any, i: number) => ({
                id:         o.IdOrder,
                deal_title: deals[i]?.titleDeal ?? deals[i]?.data?.titleDeal ?? '—',
                price:      deals[i]?.priceDeal ?? deals[i]?.data?.priceDeal ?? 0,
                active:     o.Active,
                date:       o.DateTimeCommand,
              }));
              this.stats.total_orders = this.orders.length;
            });
          },
          error: () => { this.orders = []; },
        });
        this.invoices.getAdminInvoices({ IdUser: u.IdUser, per_page: 200 }).subscribe({
          next: (invRes: any) => {
            const rows = invRes?.data ?? invRes ?? [];
            this.stats.total_invoices = rows.length;
            this.stats.total_paid = rows
              .filter((f: any) => f.Status === 'paid')
              .reduce((sum: number, f: any) => sum + (+(f.Total ?? 0)), 0);
          },
          error: () => {},
        });
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  toggleActive(): void {
    this.usersVendors.toggleAdminUser(this.user.id).subscribe({
      next: () => this.user.isActive = !this.user.isActive,
      error: () => alert('Action impossible.'),
    });
  }
  togglePremium(): void {
    this.usersVendors.toggleUserPremium(this.user.id).subscribe({
      next: () => this.user.isPremium = !this.user.isPremium,
      error: () => alert('Action impossible.'),
    });
  }

  statusClass(a: number): string {
    return a === 2 ? 'bg-success-subtle text-success'
         : a === 3 ? 'bg-info-subtle text-info'
         : a === 0 ? 'bg-danger-subtle text-danger'
                   : 'bg-warning-subtle text-warning';
  }
  statusLabel(a: number): string {
    return a === 2 ? 'Livrée' : a === 3 ? 'Confirmée' : a === 0 ? 'Annulée' : 'En attente';
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