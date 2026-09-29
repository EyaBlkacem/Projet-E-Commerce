import { Component, OnInit } from '@angular/core';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { PremiumService } from 'src/app/core/services/premium.service';

interface SubRow {
  id: number;
  userName: string;
  userEmail: string;
  planName: string;
  price: string;
  status: string;
  paymentStatus: string;
  startDate: string;
  endDate: string;
}

interface PlanRow {
  id: number;
  name: string;
  slug: string;
  durationMonths: number;
  price: string;
  currency: string;
  active: boolean;
  subsCount: number;
}

@Component({
  selector: 'app-premium-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Premium" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<ul class="nav nav-tabs mb-3">
  <li class="nav-item">
    <a class="nav-link" [class.active]="tab==='subs'" href="javascript:void(0)" (click)="tab='subs'; loadSubs()">
      Abonnements
      @if (pendingCount > 0) {
        <span class="badge bg-danger rounded-pill ms-1">{{ pendingCount }}</span>
      }
    </a>
  </li>
  <li class="nav-item">
    <a class="nav-link" [class.active]="tab==='plans'" href="javascript:void(0)" (click)="tab='plans'; loadPlans()">
      Plans
    </a>
  </li>
</ul>

@if (tab === 'subs') {
  <div class="card border-0 shadow-sm">
    <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2 py-2">
      <h6 class="mb-0 fw-semibold flex-grow-1">
        Abonnements <span class="badge bg-primary-subtle text-primary ms-2">{{ totalSubs }}</span>
      </h6>
      <div class="input-group input-group-sm" style="max-width:220px">
        <span class="input-group-text bg-white border-end-0"><i class="ri-search-line"></i></span>
        <input type="text" class="form-control border-start-0" placeholder="Nom, email…"
               [(ngModel)]="search" (input)="onSearchChange()" />
      </div>
      <select class="form-select form-select-sm" style="max-width:180px" [(ngModel)]="filterStatus" (change)="subsPage=1; loadSubs()">
        <option value="">Tous les statuts</option>
        <option value="pending">En attente</option>
        <option value="active">Actif</option>
        <option value="cancelled">Annulé</option>
        <option value="expired">Expiré</option>
      </select>
    </div>
    <div class="card-body p-0">
      @if (loading) {
        <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      } @else if (subs.length === 0) {
        <p class="text-muted text-center py-5 mb-0">Aucun abonnement.</p>
      } @else {
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">Utilisateur</th>
                <th>Plan</th>
                <th>Période</th>
                <th class="text-center">Statut</th>
                <th class="text-center">Paiement</th>
                <th class="text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (s of subs; track s.id) {
                <tr>
                  <td class="ps-3">
                    <div class="fw-semibold">{{ s.userName }}</div>
                    <div class="fs-12 text-muted">{{ s.userEmail }}</div>
                  </td>
                  <td>{{ s.planName }} <span class="text-muted fs-12">({{ s.price }})</span></td>
                  <td class="fs-12">{{ s.startDate }} → {{ s.endDate }}</td>
                  <td class="text-center"><span class="badge" [class]="statusClass(s.status)">{{ s.status }}</span></td>
                  <td class="text-center"><span class="badge" [class]="statusClass(s.paymentStatus)">{{ s.paymentStatus }}</span></td>
                  <td class="text-end pe-3">
                    <div class="btn-group btn-group-sm">
                      @if (s.status === 'pending') {
                        <button class="btn btn-light" title="Activer" (click)="activate(s)">
                          <i class="ri-check-line text-success"></i>
                        </button>
                      }
                      @if (s.status === 'active') {
                        <button class="btn btn-light" title="Annuler" (click)="cancel(s)">
                          <i class="ri-close-circle-line text-warning"></i>
                        </button>
                        <button class="btn btn-light" title="Expirer maintenant" (click)="expire(s)">
                          <i class="ri-time-line text-danger"></i>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination numérique : la page demandée est envoyée au backend -->
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-top">
          <span class="fs-12 text-muted">Page {{ subsPage }} / {{ subsTotalPages }} — {{ totalSubs }} abonnement(s)</span>
          <nav>
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" [class.disabled]="subsPage <= 1">
                <button class="page-link" (click)="goToSubsPage(subsPage - 1)"><i class="ri-arrow-left-s-line"></i></button>
              </li>
              @for (p of getPageNumbers(); track $index) {
                @if (p === '...') {
                  <li class="page-item disabled"><span class="page-link">…</span></li>
                } @else {
                  <li class="page-item" [class.active]="p === subsPage">
                    <button class="page-link" (click)="goToSubsPage(asNumber(p))">{{ p }}</button>
                  </li>
                }
              }
              <li class="page-item" [class.disabled]="subsPage >= subsTotalPages">
                <button class="page-link" (click)="goToSubsPage(subsPage + 1)"><i class="ri-arrow-right-s-line"></i></button>
              </li>
            </ul>
          </nav>
        </div>
      }
    </div>
  </div>
}

@if (tab === 'plans') {
  <div class="card border-0 shadow-sm">
    <div class="card-header bg-transparent d-flex align-items-center gap-2 py-2">
      <h6 class="mb-0 fw-semibold flex-grow-1">
        Plans Premium <span class="badge bg-primary-subtle text-primary ms-2">{{ plans.length }}</span>
      </h6>
      <button class="btn btn-sm btn-success" (click)="openAddPlan()"><i class="ri-add-line me-1"></i>Nouveau plan</button>
    </div>
    <div class="card-body p-0">
      @if (loading) {
        <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      } @else {
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">Nom</th>
                <th>Durée</th>
                <th>Prix</th>
                <th class="text-center">Abonnés</th>
                <th class="text-center">Statut</th>
                <th class="text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (p of plans; track p.id) {
                <tr>
                  <td class="ps-3">
                    <div class="fw-semibold">{{ p.name }}</div>
                    <div class="fs-12 text-muted">{{ p.slug }}</div>
                  </td>
                  <td>{{ p.durationMonths }} mois</td>
                  <td>{{ p.price }} {{ p.currency }}</td>
                  <td class="text-center">{{ p.subsCount }}</td>
                  <td class="text-center">
                    @if (p.active) { <span class="badge bg-success-subtle text-success">Actif</span> }
                    @else { <span class="badge bg-secondary-subtle text-secondary">Inactif</span> }
                  </td>
                  <td class="text-end pe-3">
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-light" (click)="openEditPlan(p)" title="Modifier">
                        <i class="ri-edit-2-line text-info"></i>
                      </button>
                      <button class="btn btn-light" (click)="togglePlan(p)" [title]="p.active ? 'Désactiver' : 'Activer'">
                        <i [class]="p.active ? 'ri-pause-circle-line text-warning' : 'ri-play-circle-line text-success'"></i>
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

@if (showPlanForm) {
  <div class="modal-backdrop-custom" (click)="showPlanForm=false">
    <div class="modal-panel" (click)="$event.stopPropagation()">
      <h5 class="mb-3">{{ editingPlanId ? 'Modifier le plan' : 'Nouveau plan' }}</h5>
      <div class="mb-2">
        <label class="form-label fs-12 fw-semibold text-muted">Nom</label>
        <input class="form-control" [(ngModel)]="planForm.Name" />
      </div>
      <div class="mb-2">
        <label class="form-label fs-12 fw-semibold text-muted">Slug (unique)</label>
        <input class="form-control" [(ngModel)]="planForm.Slug" [disabled]="!!editingPlanId" />
      </div>
      <div class="row g-2 mb-2">
        <div class="col-6">
          <label class="form-label fs-12 fw-semibold text-muted">Durée (mois)</label>
          <input type="number" class="form-control" [(ngModel)]="planForm.DurationMonths" />
        </div>
        <div class="col-6">
          <label class="form-label fs-12 fw-semibold text-muted">Prix (TND)</label>
          <input type="number" class="form-control" [(ngModel)]="planForm.Price" />
        </div>
      </div>
      @if (planFormError) { <p class="text-danger fs-13">{{ planFormError }}</p> }
      <div class="d-flex gap-2 mt-3">
        <button class="btn btn-light flex-grow-1" (click)="showPlanForm=false">Annuler</button>
        <button class="btn btn-success flex-grow-1" [disabled]="savingPlan" (click)="savePlan()">Enregistrer</button>
      </div>
    </div>
  </div>
}

<style>
  .modal-backdrop-custom {
    position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 1050;
    display: flex; align-items: center; justify-content: center; padding: 1rem;
  }
  .modal-panel {
    background: var(--vz-body-bg); border-radius: .5rem; padding: 1.5rem;
    max-width: 420px; width: 100%; max-height: 90vh; overflow-y: auto;
  }
</style>
  `,
})
export class PremiumAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Premium', active: true }];

  tab: 'subs' | 'plans' = 'subs';
  loading = true;
  filterStatus = '';

  subs: SubRow[] = [];
  plans: PlanRow[] = [];
  pendingCount = 0;
  search = '';
  private searchDebounce: any = null;

  subsPage = 1;
  subsPageSize = 10;
  totalSubs = 0;
  subsTotalPages = 1;

  showPlanForm = false;
  savingPlan = false;
  editingPlanId: number | null = null;
  planForm: any = { Name: '', Slug: '', DurationMonths: 1, Price: 0 };
  planFormError = '';

  constructor(private api: TijaraApiService, private premium: PremiumService) {}

  ngOnInit(): void { this.loadSubs(); this.loadPendingCount(); }

  loadPendingCount(): void {
    this.premium.getPendingRequestsCount().subscribe({
      next: (res: any) => this.pendingCount = res?.count ?? 0,
      error: () => this.pendingCount = 0,
    });
  }

  loadSubs(): void {
    this.loading = true;
    const params: any = { page: this.subsPage, per_page: this.subsPageSize };
    if (this.filterStatus) params.Status = this.filterStatus;
    if (this.search.trim()) params.search = this.search.trim();
    this.premium.getPremiumSubscriptions(params).subscribe({
      next: (res: any) => {
        const paginator = res?.data?.data !== undefined ? res.data : res;
        const rows: any[] = paginator?.data ?? [];
        this.subs = rows.map((s: any) => ({
          id:            s.IdPremiumSubscription,
          userName:      s.user?.Username || s.user?.Email || `Utilisateur #${s.IdUser}`,
          userEmail:     s.user?.Email || '',
          planName:      s.plan?.Name || '—',
          price:         `${s.Price} ${s.Currency}`,
          status:        s.Status,
          paymentStatus: s.PaymentStatus,
          startDate:     s.StartDate ? new Date(s.StartDate).toLocaleDateString('fr-FR') : '—',
          endDate:       s.EndDate   ? new Date(s.EndDate).toLocaleDateString('fr-FR')   : '—',
        }));
        this.totalSubs      = paginator?.total        ?? this.subs.length;
        this.subsTotalPages = paginator?.last_page    ?? 1;
        this.subsPage       = paginator?.current_page ?? this.subsPage;
        this.loading = false;
      },
      error: () => { this.subs = []; this.loading = false; },
    });
  }

  onSearchChange(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.subsPage = 1; this.loadSubs(); }, 400);
  }

  goToSubsPage(p: number): void {
    if (p < 1 || p > this.subsTotalPages || p === this.subsPage) return;
    this.subsPage = p;
    this.loadSubs();
  }

  /** Génère la liste des numéros de page à afficher, avec ellipses ("...") pour les longues listes. */
  getPageNumbers(): (number | string)[] {
    const total = this.subsTotalPages;
    const current = this.subsPage;
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

  loadPlans(): void {
    this.loading = true;
    this.premium.getPremiumPlans().subscribe({
      next: (res: any) => {
        const rows: any[] = res?.data ?? [];
        this.plans = rows.map((p: any) => ({
          id: p.IdPremiumPlan, name: p.Name, slug: p.Slug,
          durationMonths: p.DurationMonths, price: p.Price, currency: p.Currency,
          active: !!p.Active, subsCount: p.subscriptions_count ?? 0,
        }));
        this.loading = false;
      },
      error: () => { this.plans = []; this.loading = false; },
    });
  }

  statusClass(s: string): string {
    switch (s) {
      case 'active': case 'paid':      return 'bg-success-subtle text-success';
      case 'pending':                  return 'bg-warning-subtle text-warning';
      case 'cancelled': case 'failed': return 'bg-secondary-subtle text-secondary';
      case 'expired':                  return 'bg-danger-subtle text-danger';
      default:                         return 'bg-secondary-subtle text-secondary';
    }
  }

  activate(s: SubRow): void {
    this.premium.activatePremiumSubscription(s.id).subscribe({
      next: () => { this.loadSubs(); this.loadPendingCount(); },
      error: (err) => alert(err?.error?.message || 'Activation impossible.'),
    });
  }
  cancel(s: SubRow): void {
    if (!confirm(`Annuler l'abonnement de ${s.userName} ?`)) return;
    this.premium.cancelPremiumSubscription(s.id).subscribe({
      next: () => this.loadSubs(),
      error: (err) => alert(err?.error?.message || 'Annulation impossible.'),
    });
  }
  expire(s: SubRow): void {
    if (!confirm(`Expirer immédiatement l'abonnement de ${s.userName} ?`)) return;
    this.premium.expirePremiumSubscription(s.id).subscribe({
      next: () => this.loadSubs(),
      error: (err) => alert(err?.error?.message || 'Expiration impossible.'),
    });
  }

  openAddPlan(): void {
    this.editingPlanId = null; this.planFormError = '';
    this.planForm = { Name: '', Slug: '', DurationMonths: 1, Price: 0 };
    this.showPlanForm = true;
  }
  openEditPlan(p: PlanRow): void {
    this.editingPlanId = p.id; this.planFormError = '';
    this.planForm = { Name: p.name, Slug: p.slug, DurationMonths: p.durationMonths, Price: p.price };
    this.showPlanForm = true;
  }
  savePlan(): void {
    if (!this.planForm.Name.trim() || !this.planForm.Slug.trim()) {
      this.planFormError = 'Nom et slug obligatoires.';
      return;
    }
    this.savingPlan = true;
    const req = this.editingPlanId
      ? this.premium.updatePremiumPlan(this.editingPlanId, this.planForm)
      : this.premium.createPremiumPlan(this.planForm);
    req.subscribe({
      next: () => { this.savingPlan = false; this.showPlanForm = false; this.loadPlans(); },
      error: (err) => { this.savingPlan = false; this.planFormError = err?.error?.message || 'Enregistrement impossible.'; },
    });
  }
  togglePlan(p: PlanRow): void {
    this.premium.togglePremiumPlan(p.id, !p.active).subscribe({
      next: () => this.loadPlans(),
      error: () => alert('Action impossible.'),
    });
  }
}
