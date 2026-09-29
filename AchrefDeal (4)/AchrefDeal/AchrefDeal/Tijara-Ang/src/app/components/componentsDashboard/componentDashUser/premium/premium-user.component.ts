import { Component, OnInit } from '@angular/core';
import { BoostPremiumService } from 'src/app/core/services/boost-premium.service';
import { PremiumPlan, PremiumStatus } from 'src/app/core/models/boost-premium.models';

@Component({
  selector: 'app-premium-user',
  standalone: false,
  template: `
<app-breadcrumbs title="Premium" [breadcrumbItems]="breadcrumbItems"></app-breadcrumbs>

<div class="card border-0 shadow-sm mb-4 text-white" style="background:linear-gradient(135deg,#405189,#6c5ce7)">
  <div class="card-body py-4"><h3 class="text-white mb-1"><i class="ri-vip-crown-2-line me-2"></i>Abonnement Premium</h3>
  <p class="text-white-50 mb-0">Profitez des avantages Premium sur Tijara.</p></div>
</div>

@if (status) {
  <div class="alert" [class.alert-success]="status.isPremium" [class.alert-secondary]="!status.isPremium">
    @if (status.isPremium) { <i class="ri-vip-crown-fill me-1"></i>Premium actif jusqu'au {{ status.premiumExpiry | date:'dd/MM/yyyy' }}.
      <button class="btn btn-sm btn-outline-danger ms-3" (click)="cancel()" [disabled]="cancelling">{{ cancelling ? 'Annulation...' : 'Annuler' }}</button>
    } @else if (status.subscription?.status === 'pending') { <i class="ri-time-line me-1"></i>Demande créée : paiement en attente de confirmation.
    } @else { <i class="ri-information-line me-1"></i>Vous n'avez pas d'abonnement Premium actif. }
  </div>
}
@if (message) { <div class="alert alert-success">{{ message }}</div> }
@if (error) { <div class="alert alert-danger">{{ error }}</div> }

@if (loading) { <div class="text-center py-5"><div class="spinner-border text-primary"></div></div> }
@else { <div class="row g-3">@for (plan of plans; track plan.id) {
  <div class="col-md-6 col-xl-4"><div class="card border-0 shadow-sm h-100 text-center">
    <div class="card-body"><i class="ri-vip-crown-2-line fs-1 text-warning"></i><h5 class="mt-2">{{ plan.name }}</h5>
      <h3 class="text-primary">{{ plan.price | number:'1.0-2' }} {{ plan.currency }}</h3><p class="text-muted mb-0">{{ plan.durationMonths }} mois</p></div>
    <div class="card-footer bg-white"><button class="btn btn-primary w-100" (click)="subscribe(plan)" [disabled]="hasOpenSubscription || subscribingId === plan.id">
      {{ hasOpenSubscription ? (status?.isPremium ? 'Premium actif' : 'Demande en attente') : (subscribingId === plan.id ? 'Création...' : 'Choisir ce plan') }}</button></div>
  </div></div>
}</div> }
`
})
export class PremiumUserComponent implements OnInit {
  breadcrumbItems = [{ label: 'Mon espace' }, { label: 'Premium', active: true }];
  plans: PremiumPlan[] = [];
  status: PremiumStatus | null = null;
  loading = true;
  subscribingId: number | null = null;
  cancelling = false;
  message = '';
  error = '';

  constructor(private premium: BoostPremiumService) {}
  ngOnInit(): void { this.refresh(); }

  get hasOpenSubscription(): boolean {
    const state = this.status?.subscription?.status;
    return this.status?.isPremium === true || state === 'pending' || state === 'active';
  }

  private refresh(): void {
    this.loading = true;
    this.premium.getPremiumPlans().subscribe({ next: p => { this.plans = p; this.loading = false; }, error: () => { this.loading = false; this.error = 'Plans Premium indisponibles.'; } });
    this.premium.getPremiumStatus().subscribe({ next: s => this.status = s, error: () => this.error = 'Statut Premium indisponible.' });
  }

  subscribe(plan: PremiumPlan): void {
    if (this.hasOpenSubscription) return;
    this.subscribingId = plan.id; this.error = ''; this.message = '';
    this.premium.subscribePremium(plan.id).subscribe({
      next: () => { this.subscribingId = null; this.message = 'Demande Premium créée. Elle sera active après confirmation du paiement.'; this.refresh(); },
      error: (e: any) => { this.subscribingId = null; this.error = e?.error?.message ?? 'Souscription impossible.'; }
    });
  }

  cancel(): void {
    const id = this.status?.subscription?.id;
    if (!id) return;
    this.cancelling = true; this.error = '';
    this.premium.cancelPremiumSubscription(id).subscribe({
      next: () => { this.cancelling = false; this.message = 'Renouvellement annulé : l’accès reste valable jusqu’à l’expiration.'; this.refresh(); },
      error: (e: any) => { this.cancelling = false; this.error = e?.error?.message ?? 'Annulation impossible.'; }
    });
  }
}
