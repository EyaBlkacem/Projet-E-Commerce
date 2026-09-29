import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Product } from '../products/products.component';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { OrdersService } from 'src/app/core/services/orders.service';
import { UsersService } from 'src/app/core/services/users.service';

export interface CartItem {
  product: Product;
  qty: number;
}

interface VendorColis {
  vendorKey: string;
  vendorName: string;
  items: CartItem[];
  subtotal: number;
}

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  standalone: false
})
export class CartComponent implements OnInit {

  breadCrumbItems = [
    { label: 'Boutique', link: '/shop/products' },
    { label: 'Panier', active: true }
  ];

  cartItems: CartItem[] = [];
  promoCode = '';
  promoApplied = false;
  promoDiscount = 0;
  promoError = '';

  checkoutSubmitting = false;
  checkoutError = '';

  outOfStockItems: CartItem[] = [];
  lastOrderId: number | null = null;

  states: any[] = [];
  selectedStateId: number | null = null;

  private checkoutProfile: any = null;

  constructor(
    private router: Router,
    private api: TijaraApiService,
    private ordersService: OrdersService,
    private usersService: UsersService
  ) {}

  private get isLoggedIn(): boolean {
    try { return !!localStorage.getItem('currentUser'); } catch { return false; }
  }

  private get cartKey(): string {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const id = u?.id ?? u?.IdUser ?? u?.user?.id ?? u?.user?.IdUser;
      return id ? `tijara_cart_${id}` : 'tijara_cart_guest';
    } catch { return 'tijara_cart_guest'; }
  }

  ngOnInit(): void {
    this.loadCart();
    this.api.getStates().subscribe({
      next: (res: any) => {
        const list = res?.data?.data ?? res?.data ?? res ?? [];
        this.states = Array.isArray(list) ? list : [];
      },
      error: () => { this.states = []; }
    });
  }

  loadCart() {
    const saved = localStorage.getItem(this.cartKey);
    this.cartItems = saved ? JSON.parse(saved) : [];
  }

  saveCart() {
    localStorage.setItem(this.cartKey, JSON.stringify(this.cartItems));
  }

  increase(item: CartItem) {
    if (item.qty < item.product.stock) { item.qty++; this.saveCart(); }
  }

  decrease(item: CartItem) {
    if (item.qty > 1) { item.qty--; this.saveCart(); }
  }

  remove(index: number) { this.cartItems.splice(index, 1); this.saveCart(); }
  clearCart() { this.cartItems = []; this.saveCart(); }

  applyPromo() {
    this.promoError = '';
    const code = this.promoCode.trim().toUpperCase();
    if (code === 'TIJARA10') {
      this.promoDiscount = 10; this.promoApplied = true;
    } else if (code === 'TIJARA20') {
      this.promoDiscount = 20; this.promoApplied = true;
    } else {
      this.promoError = 'Code promo invalide. Essayez TIJARA10 ou TIJARA20';
      this.promoApplied = false; this.promoDiscount = 0;
    }
  }

  private vendorKeyOf(product: any): string {
    return String(product?.vendor_id ?? product?.IdUser ?? product?.vendor ?? 'inconnu');
  }

  get vendorColis(): VendorColis[] {
    const groups = new Map<string, VendorColis>();
    for (const item of this.cartItems) {
      const key = this.vendorKeyOf(item.product);
      if (!groups.has(key)) {
        groups.set(key, {
          vendorKey: key,
          vendorName: item.product.vendor || 'Vendeur',
          items: [],
          subtotal: 0
        });
      }
      const group = groups.get(key)!;
      group.items.push(item);
      group.subtotal += item.product.price * item.qty;
    }
    return Array.from(groups.values());
  }

  get subtotal(): number {
    return this.cartItems.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  }

  get discount(): number {
    return Math.round(this.subtotal * this.promoDiscount / 100);
  }

  get shipping(): number {
    return this.subtotal > 100 ? 0 : 7;
  }

  get total(): number {
    return this.subtotal - this.discount + this.shipping;
  }

  goShop() { this.router.navigate(['/shop/products']); }

  goCheckout(): void {
    this.checkoutError = '';
    this.outOfStockItems = [];
    this.lastOrderId = null;

    if (!this.isLoggedIn) {
      this.router.navigate(['/auth/login']);
      return;
    }
    if (this.cartItems.length === 0 || this.checkoutSubmitting) return;

    if (!this.selectedStateId) {
      this.checkoutError = 'Veuillez selectionner votre gouvernorat de livraison.';
      return;
    }

    this.checkoutSubmitting = true;

    const userId = this.api.getCurrentUserId();
    const profile$ = userId != null
      ? this.usersService.getUserById(userId).pipe(
          map((res: any) => res?.data ?? res ?? null),
          catchError(() => of(null))
        )
      : of(null);

    profile$.subscribe((profile: any) => {
      this.checkoutProfile = profile;

      this.api.createOrder({ Active: 1, IdState: this.selectedStateId }).subscribe({
        next: (orderRes: any) => {
          const order = orderRes?.data ?? orderRes;
          const idOrder = order?.IdOrder ?? order?.id;

          if (!idOrder) {
            this.checkoutSubmitting = false;
            this.checkoutError = 'Erreur : commande créée sans identifiant.';
            return;
          }
          this.trackOrderId(idOrder);
          this.createOrderDetailsPartial(idOrder);
        },
        error: () => {
          this.checkoutSubmitting = false;
          this.checkoutError = 'Erreur lors de la création de la commande.';
        }
      });
    });
  }

  private createOrderDetailsPartial(idOrder: number): void {
    const profile = this.checkoutProfile ?? {};
    const calls = this.cartItems.map(item =>
      this.api.createOrderDetail({
        IdOrder: idOrder,
        IdUser: this.api.getCurrentUserId(),
        IdProduct: item.product.id,
        Quantity: item.qty,
        UnitPrice: item.product.price,
        IdState: this.selectedStateId,
        Address: profile?.Address ?? '',
        ZipCode: profile?.ZipCode ?? '',
        Telephone: profile?.Telephone ?? '',
        Email: profile?.Email ?? '',
        FirstName: profile?.FirstName ?? '',
        LastName: profile?.LastName ?? ''
      }).pipe(
        map(() => ({ item, success: true })),
        catchError(() => of({ item, success: false }))
      )
    );

    forkJoin(calls).subscribe((results: { item: CartItem; success: boolean }[]) => {
      const succeeded = results.filter(r => r.success).map(r => r.item);
      const failed = results.filter(r => !r.success).map(r => r.item);

      this.outOfStockItems = failed;

      this.cartItems = this.cartItems.filter(ci =>
        !succeeded.some(s => s.product.id === ci.product.id)
      );
      this.saveCart();

      if (succeeded.length === 0) {
        this.ordersService.updateOrderAction(idOrder, 'cancel').subscribe({
          next: () => this.finishAllOutOfStock(),
          error: () => this.finishAllOutOfStock()
        });
        return;
      }

      const total = this.computeTotal(succeeded);
      this.createInvoiceAndFinish(idOrder, total);
    });
  }

  private finishAllOutOfStock(): void {
    this.checkoutSubmitting = false;
    this.checkoutError = 'Tous les articles de votre panier sont en rupture de stock. La commande a été annulée, aucun paiement n\'a été effectué.';
  }

  private computeTotal(items: CartItem[]): number {
    const sub = items.reduce((sum, i) => sum + i.product.price * i.qty, 0);
    const disc = Math.round(sub * this.promoDiscount / 100);
    const ship = sub > 100 ? 0 : 7;
    return sub - disc + ship;
  }

  private createInvoiceAndFinish(idOrder: number, total: number): void {
    this.api.createInvoice({
      IdOrder: idOrder,
      PaymentMethod: 'cash_on_delivery'
    }).subscribe({
      next: () => this.createPendingPaymentAndFinish(idOrder, total),
      error: (error: any) => {
        // ✅ AJOUTÉ — la création de facture échouait silencieusement :
        // le checkout continuait normalement même si POST /invoices
        // renvoyait une erreur (InvoicesController::store() rollback la
        // transaction dans ce cas, donc AUCUNE facture n'est créée pour
        // cette commande). On logue maintenant le message exact renvoyé
        // par le backend (raison métier : vendeur introuvable, UnitPrice
        // manquant, etc.) pour pouvoir diagnostiquer sans accès aux logs
        // Laravel. Le checkout continue quand même (comportement inchangé) :
        // la commande existe déjà, on ne veut pas bloquer le client pour un
        // problème de facturation.
        console.error(
          `Échec de création de la facture pour la commande #${idOrder} :`,
          error?.error?.message ?? error
        );
        this.createPendingPaymentAndFinish(idOrder, total);
      }
    });
  }

  private createPendingPaymentAndFinish(idOrder: number, total: number): void {
    this.api.createPayment({
      IdUser: this.api.getCurrentUserId(),
      IdOrder: idOrder,
      Amount: total,
      Method: 'cash_on_delivery',
      Status: 'pending',
      Reference: `ORDER-${idOrder}-${Date.now()}`,
      CreatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }).subscribe({
      next: () => this.finishCheckout(idOrder),
      error: (error: any) => {
        this.checkoutSubmitting = false;
        this.checkoutError = error?.error?.message ?? 'Commande créée, mais la demande de paiement n\'a pas pu être enregistrée.';
      },
    });
  }

  private finishCheckout(idOrder: number): void {
    this.checkoutSubmitting = false;
    this.lastOrderId = idOrder;

    if (this.outOfStockItems.length > 0) return;

    this.router.navigate(['/shop/orders'], { queryParams: { success: idOrder } });
  }

  goToOrderAfterPartial(): void {
    if (this.lastOrderId) {
      this.router.navigate(['/shop/orders'], { queryParams: { success: this.lastOrderId, partial: 1 } });
    }
  }

  private trackOrderId(idOrder: number): void {
    try {
      const userId = this.api.getCurrentUserId();
      const key = userId ? `tijara_order_ids_${userId}` : 'tijara_order_ids_guest';
      const ids: number[] = JSON.parse(localStorage.getItem(key) || '[]');
      if (!ids.includes(idOrder)) localStorage.setItem(key, JSON.stringify([...ids, idOrder]));
    } catch { /* Le checkout reste fonctionnel si le stockage local est indisponible. */ }
  }
}