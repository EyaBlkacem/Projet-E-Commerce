import { Component, OnInit } from '@angular/core';
import { PublicCatalogService } from 'src/app/core/services/public-catalog.service';

interface Coupon {
  id: number;
  title: string;
  description: string;
  price: number;
  dateStart: string | null;
  dateEnd: string | null;
  numberOfCoupon: number;
  used: number;
}

@Component({
  selector: 'app-coupons-user',
  standalone: false,
  template: `
<app-breadcrumbs title="Mes coupons" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<div class="card border-0 shadow-sm mb-4 overflow-hidden"
     style="background:linear-gradient(135deg,#f06548 0%,#f7b84b 100%)">
  <div class="card-body text-white py-4">
    <div class="d-flex flex-wrap align-items-center gap-3">
      <div class="avatar-lg rounded-3 d-flex align-items-center justify-content-center"
           style="background:rgba(255,255,255,.2)">
        <i class="ri-coupon-2-line fs-1"></i>
      </div>
      <div class="flex-grow-1">
        <h3 class="text-white mb-1">Profitez de coupons exclusifs 🎟️</h3>
        <p class="text-white-50 mb-0">Économisez sur vos achats grâce aux coupons disponibles.</p>
      </div>
    </div>
  </div>
</div>

@if (loading) {
  <div class="text-center py-5"><div class="spinner-border text-danger"></div></div>
} @else if (coupons.length === 0) {
  <div class="card border-0 shadow-sm">
    <div class="card-body text-center py-5">
      <i class="ri-coupon-line display-3 text-muted opacity-50"></i>
      <p class="text-muted mt-2 mb-0">Aucun coupon disponible pour le moment.</p>
    </div>
  </div>
} @else {
  <div class="row g-3">
    @for (c of coupons; track c.id) {
      <div class="col-md-6 col-xl-4">
        <div class="card border-0 shadow-sm h-100 position-relative overflow-hidden">
          <div style="position:absolute;top:-30px;right:-30px;width:90px;height:90px;background:#f0654822;border-radius:50%"></div>
          <div class="card-body">
            <div class="d-flex align-items-start gap-2 mb-2">
              <i class="ri-coupon-2-fill text-danger fs-22"></i>
              <h6 class="mb-0 fw-bold flex-grow-1">{{ c.title }}</h6>
            </div>
            <p class="text-muted fs-12 mb-3">{{ c.description || 'Coupon promotionnel' }}</p>
            <div class="text-center py-3 mb-3"
                 style="background:#fff3cd;border:2px dashed #f7b84b;border-radius:8px">
              <h2 class="mb-0 fw-bold text-danger">{{ c.price | number:'1.0-2' }} TND</h2>
              <div class="fs-11 text-muted">de remise</div>
            </div>
            <div class="d-flex justify-content-between fs-11 text-muted mb-2">
              @if (c.dateEnd) {
                <span><i class="ri-time-line"></i> Expire {{ formatDate(c.dateEnd) }}</span>
              }
              @if (c.numberOfCoupon > 0) {
                <span><i class="ri-stock-line"></i> {{ c.numberOfCoupon - c.used }} restants</span>
              }
            </div>
          </div>
          <div class="card-footer bg-white border-top">
            <button class="btn btn-danger w-100" (click)="claim(c)">
              <i class="ri-gift-line me-1"></i>Réclamer
            </button>
          </div>
        </div>
      </div>
    }
  </div>
}
`,
})
export class CouponsUserComponent implements OnInit {
  breadCrumbItems = [{ label: 'Compte' }, { label: 'Coupons', active: true }];

  coupons: Coupon[] = [];
  loading = true;

  constructor(private publicCatalogService: PublicCatalogService) {}

  ngOnInit(): void {
    this.publicCatalogService.getPublicCoupons().subscribe({
      next: (data: any[]) => {
        this.coupons = (data || []).map((c: any) => ({
          id:             +(c.id_coupon ?? c.idCoupon ?? 0),
          title:           c.title       ?? '',
          description:     c.description ?? '',
          price:          +(c.price       ?? 0),
          dateStart:       c.date_start  ?? c.dateStart ?? null,
          dateEnd:         c.date_end    ?? c.dateEnd   ?? null,
          numberOfCoupon:+(c.number_of_coupon ?? c.numberOfCoupon ?? 0),
          used:           +(c.used        ?? 0),
        }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  claim(c: Coupon): void {
    alert(`Coupon "${c.title}" ajouté à votre compte. Code à utiliser au paiement.`);
  }
  formatDate(d: string | null): string {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
  }
}
