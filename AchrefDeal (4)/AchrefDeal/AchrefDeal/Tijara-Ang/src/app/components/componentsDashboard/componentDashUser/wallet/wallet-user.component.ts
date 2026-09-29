import { Component, OnInit } from '@angular/core';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { PaymentsService } from 'src/app/core/services/payments.service';

@Component({
  selector: 'app-wallet-user',
  standalone: false,
  template: `
  <app-breadcrumbs title="Mon portefeuille" [breadcrumbItems]="breadcrumbItems"></app-breadcrumbs>

  <div class="row justify-content-center">
    <div class="col-lg-8">
      <div class="card shadow-sm border-0">
        <div class="card-body p-4">
          <h4 class="fw-bold mb-3"><i class="ri-wallet-3-line text-primary me-2"></i>Mon portefeuille</h4>

          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <div class="fs-12 text-muted">Solde disponible</div>
                <div class="fs-24 fw-bold">{{ balance | number:'1.2-2' }} TND</div>
              </div>
              <div>
                <button class="btn btn-outline-primary me-2" (click)="refresh()">Rafraîchir</button>
                <button class="btn btn-primary" (click)="showTopup = !showTopup">Recharger</button>
              </div>
            </div>
          </div>

          <div *ngIf="showTopup" class="mb-4">
            <div class="row g-2 align-items-end">
              <div class="col-6">
                <label class="form-label">Montant à recharger (TND)</label>
                <input class="form-control" type="number" [(ngModel)]="topupAmount" min="1" />
              </div>
              <div class="col-6">
                <button class="btn btn-success w-100" (click)="topUp()" [disabled]="topupLoading">
                  <span *ngIf="topupLoading" class="spinner-border spinner-border-sm me-2"></span>
                  Recharger
                </button>
              </div>
            </div>
            <div *ngIf="topupError" class="text-danger mt-2">{{ topupError }}</div>
            <div *ngIf="topupSuccess" class="text-success mt-2">Recharge réussie.</div>
          </div>

          <hr/>

          <h6 class="fw-semibold">Historique des opérations</h6>

          <div class="row g-2 mb-3">
            <div class="col-md-4">
              <label class="form-label">Du</label>
              <input type="date" class="form-control" [(ngModel)]="filterFrom">
            </div>
            <div class="col-md-4">
              <label class="form-label">Au</label>
              <input type="date" class="form-control" [(ngModel)]="filterTo">
            </div>
            <div class="col-md-4 d-flex align-items-end">
              <button class="btn btn-outline-secondary w-100" (click)="applyFilter()">Filtrer</button>
            </div>
          </div>

          <div *ngIf="loading" class="text-center py-4"><span class="spinner-border"></span></div>
          <div *ngIf="!loading && transactions?.length === 0" class="text-center text-muted py-4">Aucune opération trouvée.</div>

          <div *ngIf="!loading && transactions && transactions.length > 0" class="table-responsive">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Référence</th>
                  <th>Méthode</th>
                  <th>Statut</th>
                  <th class="text-end">Montant</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let t of transactions">
                  <td>{{ t.date | date:'short' }}</td>
                  <td>{{ t.reference }}</td>
                  <td>{{ t.method }}</td>
                  <td><span class="badge" [ngClass]="{
                    'bg-success': t.status === 'completed',
                    'bg-warning': t.status === 'pending',
                    'bg-danger': t.status === 'refunded' || t.status === 'failed',
                    'bg-secondary': !t.status || (t.status !== 'completed' && t.status !== 'pending' && t.status !== 'refunded' && t.status !== 'failed')
                  }">{{ t.status || '—' }}</span></td>
                  <td class="text-end">{{ t.amount | number:'1.2-2' }} TND</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  </div>
  `
})
export class WalletUserComponent implements OnInit {
  breadcrumbItems = [{ label: 'Tijara', active: false }, { label: 'Mon portefeuille', active: true }];
  balance = 0;
  transactions: any[] = [];
  private allTransactions: any[] = [];
  loading = false;
  walletId: number | null = null;

  showTopup = false;
  topupAmount = 0;
  topupLoading = false;
  topupError = '';
  topupSuccess = false;

  filterFrom: string | null = null;
  filterTo: string | null = null;

  constructor(private api: TijaraApiService, private payments: PaymentsService) {}

  ngOnInit(): void {
    this.loadWallet();
  }

  refresh(): void { this.loadWallet(); }

  applyFilter(): void {
    // GET /payments (index) est reserve a l'admin cote backend ; on filtre
    // donc cote client sur allTransactions deja charge par loadWallet().
    const from = this.filterFrom ? new Date(this.filterFrom) : null;
    const to = this.filterTo ? new Date(this.filterTo) : null;
    this.transactions = this.allTransactions.filter(t => {
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      return true;
    });
  }

  topUp(): void {
    this.topupError = '';
    if (!this.topupAmount || this.topupAmount <= 0) { this.topupError = 'Montant invalide'; return; }
    this.topupLoading = true;
    this.payments.createPayment({
      IdUser: this.api.getCurrentUserId?.() ?? null,
      Amount: this.topupAmount,
      Method: 'card',
      Status: 'pending',
      Type: 'topup',
    }).subscribe({ next: (r: any) => {
      this.topupLoading = false; this.topupSuccess = true; this.showTopup = false; this.loadWallet();
    }, error: (e: any) => { this.topupLoading = false; this.topupError = e?.error?.message || 'Erreur lors de la recharge'; } });
  }

  private loadWallet(): void {
    this.loading = true;
    this.api.getMyWallet().subscribe({
      next: (r: any) => {
        const data = r?.data ?? r ?? {};
        this.balance = Number(data?.MoneyBudget ?? data?.balance ?? data?.Balance ?? 0);
        this.walletId = data?.IdWallet ?? data?.id ?? null;

        this.payments.getMyTrackedPayments().subscribe({
          next: (p: any) => {
            const list = p?.data ?? p ?? [];
            this.allTransactions = (Array.isArray(list) ? list : []).map((it: any) => ({
              date: new Date(it?.CreatedAt ?? it?.created_at ?? it?.date),
              reference: it?.Reference ?? it?.reference ?? '—',
              method: it?.Method ?? it?.method ?? '—',
              status: it?.Status ?? it?.status ?? '',
              amount: Number(it?.Amount ?? it?.amount ?? 0),
            }));
            this.transactions = this.allTransactions;
            this.loading = false;
          },
          error: () => { this.allTransactions = []; this.transactions = []; this.loading = false; }
        });
      },
      error: () => { this.loading = false; }
    });
  }
}