import { Component, OnInit } from '@angular/core';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { BoostsService } from 'src/app/core/services/boosts.service';

interface BoostRow {
  id: number;
  type: 'product' | 'ad';
  itemTitle: string;
  packName: string;
  vendorName: string;
  startDate: string;
  endDate: string;
  daysLeft: number;
}

@Component({
  selector: 'app-boosts-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Supervision des boosts" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<div class="card border-0 shadow-sm">
  <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2 py-2">
    <h6 class="mb-0 fw-semibold flex-grow-1">
      Boosts actuellement actifs
      <span class="badge bg-primary-subtle text-primary ms-2">{{ items.length }}</span>
    </h6>
    <select class="form-select form-select-sm" style="max-width:160px" [(ngModel)]="filterType" (change)="applyFilter()">
      <option value="all">Tous</option>
      <option value="product">Produits</option>
      <option value="ad">Annonces</option>
    </select>
  </div>

  <div class="card-body p-0">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    } @else if (filtered.length === 0) {
      <p class="text-muted text-center py-5 mb-0">Aucun boost actif en ce moment.</p>
    } @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th class="ps-3">Élément boosté</th>
              <th>Pack</th>
              <th>Vendeur</th>
              <th>Période</th>
              <th class="text-center">Restant</th>
              <th class="text-end pe-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (b of filtered; track b.id + b.type) {
              <tr>
                <td class="ps-3">
                  <span class="badge me-1" [class]="b.type === 'product' ? 'bg-warning-subtle text-warning' : 'bg-info-subtle text-info'">
                    {{ b.type === 'product' ? 'Produit' : 'Annonce' }}
                  </span>
                  {{ b.itemTitle }}
                </td>
                <td>{{ b.packName }}</td>
                <td>{{ b.vendorName }}</td>
                <td class="fs-12">{{ b.startDate }} → {{ b.endDate }}</td>
                <td class="text-center">
                  <span class="badge" [class]="b.daysLeft <= 1 ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'">
                    {{ b.daysLeft }} j
                  </span>
                </td>
                <td class="text-end pe-3">
                  <button class="btn btn-sm btn-light" title="Désactiver ce boost" (click)="deactivate(b)">
                    <i class="ri-stop-circle-line text-danger"></i>
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
  `,
})
export class BoostsAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Boosts', active: true }];

  items: BoostRow[] = [];
  filtered: BoostRow[] = [];
  filterType: 'all' | 'product' | 'ad' = 'all';
  loading = true;

  constructor(private api: TijaraApiService, private boosts: BoostsService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.boosts.getActiveBoosts().subscribe({
      next: (res: any) => {
        const rows: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        const now = new Date();
        this.items = rows.map((r: any) => {
          const b = r.boost;
          const type: 'product' | 'ad' = r.type;
          const item = type === 'product' ? b.product : b.ad;
          const end = new Date(b.EndDate);
          const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
          return {
            id:         type === 'product' ? b.IdProductBoost : b.IdAdBoost,
            type,
            itemTitle:  item?.titleDeal || item?.Title || item?.title || `#${type === 'product' ? b.IdProduct : b.IdAd}`,
            packName:   b.pack?.Name || b.pack?.Title || '—',
            vendorName: b.user?.Username || b.user?.Email || `Utilisateur #${b.IdUser}`,
            startDate:  b.StartDate ? new Date(b.StartDate).toLocaleDateString('fr-FR') : '—',
            endDate:    b.EndDate   ? new Date(b.EndDate).toLocaleDateString('fr-FR')   : '—',
            daysLeft,
          };
        });
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.items = []; this.filtered = []; this.loading = false; },
    });
  }

  applyFilter(): void {
    this.filtered = this.filterType === 'all' ? this.items : this.items.filter(b => b.type === this.filterType);
  }

  deactivate(b: BoostRow): void {
    if (!confirm(`Désactiver ce boost sur "${b.itemTitle}" ?`)) return;
    const req = b.type === 'product' ? this.boosts.deactivateProductBoost(b.id) : this.boosts.deactivateAdBoost(b.id);
    req.subscribe({
      next: () => this.load(),
      error: () => alert('Désactivation impossible.'),
    });
  }
}
