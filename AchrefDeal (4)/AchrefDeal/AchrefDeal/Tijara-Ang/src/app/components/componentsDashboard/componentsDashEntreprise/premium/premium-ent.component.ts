import { Component, OnInit } from '@angular/core';
import { BoostPremiumService } from 'src/app/core/services/boost-premium.service';
import { PremiumPlan, PremiumStatus } from 'src/app/core/models/boost-premium.models';

@Component({
  selector: 'app-premium-ent',
  standalone: false,
  template: `
<app-breadcrumbs title="Abonnement Premium" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<div class="card border-0 shadow-sm mb-4 overflow-hidden"
     style="background:linear-gradient(135deg,#405189 0%,#6c5ce7 100%)">
  <div class="card-body text-white py-4">
    <div class="d-flex flex-wrap align-items-center gap-3">
      <div class="avatar-lg rounded-3 d-flex align-items-center justify-content-center"
           style="background:rgba(255,255,255,.2)">
        <i class="ri-vip-crown-2-line fs-1"></i>
      </div>
      <div class="flex-grow-1">
        <h3 class="text-white mb-1">Passez Premium</h3>
        <p class="text-white-50 mb-0">Debloquez des avantages exclusifs sur toute votre boutique.</p>
      </div>
    </div>
  </div>
</div>

@if (status) {
  <div class="alert" [class.alert-success]="status.isPremium" [class.alert-secondary]="!status.isPremium">
    @if (status.isPremium && status.subscription) {
      <i class="ri-vip-crown-fill me-1"></i>
      Premium actif (<strong>{{ status.subscription.plan?.name }}</strong>)
      jusqu'au {{ status.premiumExpiry | date:'dd/MM/yyyy' }}.
      <button class="btn btn-sm btn-outline-danger ms-3" (click)="cancel()" [disabled]="cancelling">
        {{ cancelling ? 'Annulation...' : 'Annuler l abonnement' }}
      </button>
    } @else if (status.subscription?.status === 'pending') {
      <i class="ri-time-line me-1"></i> Votre demande Premium est en attente de confirmation de paiement.
    } @else {
      <i class="ri-information-line me-1"></i> Vous n'avez pas d'abonnement Premium actif.
    }
  </div>
}

@if (feedback) { <div class="alert alert-success">{{ feedback }}</div> }
@if (feedbackError) { <div class="alert alert-danger">{{ feedbackError }}</div> }

@if (loading) {
  <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
} @else if (plans.length === 0) {
  <div class="card border-0 shadow-sm">
    <div class="card-body text-center py-5">
      <i class="ri-vip-crown-line display-3 text-muted opacity-50"></i>
      <p class="text-muted mt-2 mb-0">Aucun plan disponible pour le moment.</p>
    </div>
  </div>
} @else {
  <div class="row g-3">
    @for (p of plans; track p.id) {
      <div class="col-md-6 col-xl-4">
        <div class="card border-0 shadow-sm h-100 plan-card">
          <div class="card-header bg-primary-subtle text-center py-3">
            <h5 class="mb-0 fw-bold text-primary">
              <i class="ri-vip-crown-2-line me-1"></i>{{ p.name }}
            </h5>
          </div>
          <div class="card-body text-center">
            <div class="d-flex align-items-baseline justify-content-center gap-2 mb-2">
              <h2 class="mb-0 fw-bold text-success">{{ p.price | number:'1.0-2' }}</h2>
              <span class="text-muted">{{ p.currency }}</span>
            </div>
            <p class="text-muted fs-13 mb-3">
              <i class="ri-calendar-line"></i> {{ p.durationMonths }} mois
            </p>
          </div>
          <div class="card-footer bg-white border-top">
            @if (hasOpenSubscription) {
              <button class="btn btn-outline-secondary w-100" disabled>
                {{ status?.isPremium ? 'Deja abonne' : 'Demande en attente' }}
              </button>
            } @else {
              <button class="btn btn-primary w-100" (click)="subscribe(p)" [disabled]="subscribingId === p.id">
                <i class="ri-shopping-cart-line me-1"></i>
                {{ subscribingId === p.id ? 'Abonnement en cours...' : 'S abonner' }}
              </button>
            }
          </div>
        </div>
      </div>
    }
  </div>
}
`,
  styles: [`.plan-card { transition: transform .15s, box-shadow .15s; }
            .plan-card:hover { transform: translateY(-4px); box-shadow: 0 .8rem 1.5rem rgba(0,0,0,.12) !important; }`]
})
export class PremiumEntComponent implements OnInit {
  breadCrumbItems = [{ label: 'Vendeur' }, { label: 'Premium', active: true }];

  plans: PremiumPlan[] = [];
  status: PremiumStatus | null = null;
  loading = true;
  subscribingId: number | null = null;
  cancelling = false;
  feedback = '';
  feedbackError = '';

  get hasOpenSubscription(): boolean {
    const state = this.status?.subscription?.status;
    return this.status?.isPremium === true || state === 'pending' || state === 'active';
  }

  constructor(private boostPremiumService: BoostPremiumService) {}

  ngOnInit(): void {
    this.loadStatus();
    this.loadPlans();
  }

  private loadPlans(): void {
    this.loading = true;
    this.boostPremiumService.getPremiumPlans().subscribe({
      next: (plans: any) => { this.plans = plans; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  private loadStatus(): void {
    this.boostPremiumService.getPremiumStatus().subscribe({ next: (s: any) => this.status = s });
  }

  subscribe(p: PremiumPlan): void {
    this.subscribingId = p.id;
    this.feedback = '';
    this.feedbackError = '';
    this.boostPremiumService.subscribePremium(p.id).subscribe({
      next: () => {
        this.subscribingId = null;
        this.feedback = 'Votre demande a été créée. L’abonnement sera activé lorsque le paiement sera confirmé.';
        this.loadStatus();
      },
      error: (err) => {
        this.subscribingId = null;
        this.feedbackError = err?.error?.message ?? 'Erreur lors de la souscription.';
      }
    });
  }

  cancel(): void {
    if (!this.status?.subscription?.id) return;
    this.cancelling = true;
    this.boostPremiumService.cancelPremiumSubscription(this.status.subscription.id).subscribe({
      next: () => { this.cancelling = false; this.feedback = 'Renouvellement annulé. Votre accès reste actif jusqu’à son expiration.'; this.loadStatus(); },
      error: (err: any) => { this.cancelling = false; this.feedbackError = err?.error?.message ?? 'Erreur lors de l annulation.'; }
    });
  }
}
