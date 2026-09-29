import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InvoicesService } from 'src/app/core/services/invoices.service';
import { PaymentsService } from 'src/app/core/services/payments.service';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';

@Component({
  selector: 'app-payment-user',
  standalone: false,
  template: `
<app-breadcrumbs title="Paiement" [breadcrumbItems]="breadcrumbItems"></app-breadcrumbs>

<div class="row justify-content-center">
  <div class="col-lg-7">
    <div class="card border-0 shadow-sm">
      <div class="card-body p-4">
        <h4 class="fw-bold mb-1"><i class="ri-secure-payment-line text-success me-2"></i>Paiement sécurisé</h4>
        <p class="text-muted mb-4">Finalisez votre commande en toute sécurité.</p>

        @if (success) {
          <div class="text-center py-5">
            <div class="avatar-lg bg-success-subtle rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                 style="width:80px;height:80px">
              <i class="ri-check-line text-success" style="font-size:40px"></i>
            </div>
            <h4 class="text-success fw-bold">Paiement confirmé !</h4>
            <p class="text-muted">Référence : <strong>{{ successRef }}</strong></p>
            <p class="text-muted">Transaction : <code>{{ successTx }}</code></p>
            <a routerLink="/users/orders" class="btn btn-primary mt-3">Voir mes commandes</a>
          </div>
        } @else {
          <!-- Amount summary -->
          <div class="bg-primary-subtle rounded-3 p-3 mb-4">
            <div class="d-flex justify-content-between">
              <span>Montant à payer</span>
              <strong class="fs-20 text-primary">{{ amount | number:'1.2-2' }} TND</strong>
            </div>
            @if (orderId) {
              <div class="fs-12 text-muted mt-1">Commande #{{ orderId }}</div>
            }
          </div>

          <!-- Method selector -->
          <div class="mb-4">
            <label class="form-label fw-semibold">Méthode de paiement</label>
            <div class="row g-2">
              @for (m of methods; track m.id) {
                <div class="col-md-4">
                  <div class="border rounded-3 p-3 text-center" style="cursor:pointer"
                       [class.border-primary]="method===m.id"
                       [class.bg-primary-subtle]="method===m.id"
                       (click)="selectMethod(m.id)">
                    <i class="{{m.icon}} fs-24 d-block mb-1" [class]="'text-' + m.color"></i>
                    <div class="fs-13 fw-semibold">{{ m.label }}</div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Card form -->
          @if (method === 'card') {
            <div class="mb-3">
              <label class="form-label">Numéro de carte</label>
              <input class="form-control" [(ngModel)]="cardNumber" placeholder="1234 5678 9012 3456" maxlength="19">
            </div>
            <div class="mb-3">
              <label class="form-label">Titulaire</label>
              <input class="form-control" [(ngModel)]="cardHolder" placeholder="NOM PRENOM">
            </div>
            <div class="row g-2 mb-3">
              <div class="col-6">
                <label class="form-label">Expiration</label>
                <input class="form-control" [(ngModel)]="cardExpiry" placeholder="MM/AA" maxlength="5">
              </div>
              <div class="col-6">
                <label class="form-label">CVV</label>
                <input type="password" class="form-control" [(ngModel)]="cardCvv" placeholder="123" maxlength="4">
              </div>
            </div>
          }

          @if (method === 'cod') {
            <div class="alert alert-info">
              <i class="ri-information-line me-2"></i>
              Vous règlerez à la réception du colis. Des frais supplémentaires peuvent s'appliquer.
            </div>
          }

          @if (method === 'wallet' && walletAvailable) {
            <div class="alert alert-warning">
              <i class="ri-wallet-line me-2"></i>
              Paiement avec votre solde Tijara. Solde disponible : <strong>{{ walletBalance | number:'1.2-2' }} TND</strong>
            </div>
          }

          @if (method === 'wallet' && !walletAvailable) {
            <div class="alert alert-secondary">
              <i class="ri-information-line me-2"></i>
              Le portefeuille n'est pas disponible pour ce compte.
            </div>
          }

          @if (error) { <div class="alert alert-danger">{{ error }}</div> }

          <button class="btn btn-success btn-lg w-100 rounded-pill" (click)="pay()" [disabled]="loading">
            @if (loading) { <span class="spinner-border spinner-border-sm me-2"></span> Traitement… }
            @else { <i class="ri-lock-line me-1"></i>Payer {{ amount | number:'1.2-2' }} TND }
          </button>

          <p class="text-center text-muted fs-11 mt-3">
            <i class="ri-shield-check-line text-success me-1"></i>
            Vos données sont cryptées via SSL 256 bits.
          </p>
        }
      </div>
    </div>
  </div>
</div>
`,
})
export class PaymentUserComponent {
  breadcrumbItems = [{ label: 'Tijara', active: false }, { label: 'Paiement', active: true }];

  private readonly paymentMethods = [
    { id: 'card',   label: 'Carte bancaire', icon: 'ri-bank-card-line',    color: 'primary' },
    { id: 'cod',    label: 'À la livraison', icon: 'ri-hand-coin-line',    color: 'warning' },
    { id: 'wallet', label: 'Portefeuille',   icon: 'ri-wallet-3-line',     color: 'success' },
  ];
  methods = this.paymentMethods.filter(method => method.id !== 'wallet');

  method: 'card' | 'cod' | 'wallet' = 'card';
  selectMethod(m: string): void { this.method = (m as 'card' | 'cod' | 'wallet'); }
  cardNumber = '';
  cardHolder = '';
  cardExpiry = '';
  cardCvv    = '';

  amount  = 0;
  orderId: number | null = null;
  loading = false;
  error   = '';
  success = false;
  successRef = '';
  successTx  = '';
  walletAvailable = false;
  walletBalance = 0;

  constructor(private route: ActivatedRoute, private router: Router, private invoicesService: InvoicesService, private paymentsService: PaymentsService, private api: TijaraApiService) {
    this.route.queryParams.subscribe(q => {
      this.amount  = +q['amount'] || 0;
      this.orderId = q['orderId'] ? +q['orderId'] : null;
    });
    this.api.getMyWallet().subscribe({
      next: (wallet: any) => {
        const data = wallet?.data ?? wallet;
        const balance = Number(data?.MoneyBudget ?? data?.balance ?? data?.Balance);
        if (Number.isFinite(balance)) {
          this.walletBalance = balance;
          this.walletAvailable = true;
          this.methods = [...this.paymentMethods];
        }
      },
      error: () => { this.walletAvailable = false; }
    });
  }

  pay(): void {
    this.error = '';
    if (this.amount <= 0) { this.error = 'Montant invalide.'; return; }
    if (this.method === 'wallet' && !this.walletAvailable) {
      this.error = 'Le portefeuille n’est pas disponible.';
      return;
    }
    if (this.method === 'card' && (!this.cardNumber || !this.cardHolder)) {
      this.error = 'Veuillez remplir les informations de carte.'; return;
    }
    this.loading = true;

    // ✅ CORRIGÉ — le modèle Payments (backend) n'a QUE des colonnes
    // PascalCase (IdUser, IdOrder, Amount, Method, Status, Reference,
    // TransactionId). Le payload précédent envoyait idOrder/amount/method
    // en camelCase : PaymentsController::store() fait
    // Payments::create($request->all()) sans renommage, donc aucune de ces
    // clés ne correspondait à un champ fillable — la ligne créée avait
    // IdOrder/Amount/Method/Status tous à null (seul l'IdPayment
    // auto-incrémenté existait), et polluait ensuite l'historique du
    // portefeuille (wallet-user/wallet-ent) avec des paiements vides.
    // cardNumber/cardHolder/cardExpiry/cardCvv ne sont volontairement PAS
    // envoyés : aucune colonne ne les stocke côté backend (et ce n'est de
    // toute façon pas à ce composant de transmettre des données de carte
    // en clair) — la simulation de saisie reste uniquement côté UI ici.
    //
    // Type: 'order' — ce paiement solde une commande (carte/COD/wallet),
    // il ne doit donc JAMAIS créditer le portefeuille lors de sa
    // validation côté admin (voir PaymentsController::markCompleted).
    const reference = `PAY-${this.orderId ?? 'X'}-${Date.now()}`;
    this.paymentsService.createPayment({
      IdUser:  this.api.getCurrentUserId(),
      IdOrder: this.orderId,
      Amount:  this.amount,
      Method:  this.method,
      Status:  'pending',
      Reference: reference,
      Type: 'order',
    }).subscribe({
      next: (r: any) => {
        this.loading = false;
        this.success = true;
        const payment = r?.data ?? r;
        this.successRef = payment?.Reference ?? reference;
        this.successTx  = payment?.TransactionId ?? '';
        // Generate invoice if tied to an order
        if (this.orderId) {
          this.invoicesService.generateInvoiceFromOrder(this.orderId).subscribe();
        }
      },
      
      error: (e: any) => {
        this.loading = false;
        this.error = e?.error?.message || 'Paiement refusé. Réessayez.';
      }
    });
  }
}