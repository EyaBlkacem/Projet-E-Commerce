import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductsService } from 'src/app/core/services/products.service';
import { ReviewsService } from 'src/app/core/services/reviews.service';
import { OrdersService } from 'src/app/core/services/orders.service';
import { InvoicesService } from 'src/app/core/services/invoices.service';
import { DeliveriesService } from 'src/app/core/services/deliveries.service';
import { switchMap } from 'rxjs/operators';

@Component({
    selector: 'app-boutique-detail',
    templateUrl: './boutique-detail.component.html',
    standalone: false
})
export class BoutiqueDetailComponent implements OnInit {

    product:   any     = null;
    reviews:   any[]   = [];
    loading    = true;
    orderLoading = false;
    error      = '';
    quantity   = 1;
    selectedTab = 'description';

    showOrderForm = false;
    orderForm = { firstName: '', lastName: '', phone: '', email: '', address: '' };

    states: any[] = [];
    selectedStateId: number | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private productsService: ProductsService,
        private reviewsService: ReviewsService,
        private ordersService: OrdersService,
        private invoicesService: InvoicesService,
        private deliveriesService: DeliveriesService
    ) {}

    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        this.productsService.getProduct(id).subscribe({
            next: (res: any) => {
                this.product = res?.product || res;
                this.loading = false;
            },
            error: () => { this.loading = false; this.error = 'Produit introuvable.'; }
        });
        this.reviewsService.getProductReviews(id).subscribe({
            next: (res: any) => { this.reviews = res?.reviews || res || []; },
            error: () => {}
        });
        this.ordersService.getStates().subscribe({
            next: (res: any) => { this.states = res?.data ?? res ?? []; },
            error: () => { this.states = []; }
        });
    }

    isLoggedIn(): boolean { return !!localStorage.getItem('currentUser'); }

    getPrice(): string {
        const p = this.product?.price_product;
        return p ? parseFloat(p).toLocaleString('fr-TN') + ' DT' : 'Prix non renseigné';
    }

    orderNow(): void {
        if (!this.isLoggedIn()) {
            this.router.navigate(['/auth/login']);
            return;
        }
        this.showOrderForm = true;
    }

    submitOrder(): void {
        if (!this.isLoggedIn()) { this.router.navigate(['/auth/login']); return; }

        if (!this.selectedStateId) {
            this.error = 'Veuillez sélectionner votre gouvernorat de livraison.';
            return;
        }

        this.orderLoading = true;
        const idProduct = this.product?.IdProduct ?? this.product?.idProduct ?? this.product?.id;
        if (!idProduct) {
            this.orderLoading = false;
            this.error = 'Produit invalide : identifiant introuvable.';
            return;
        }

        this.ordersService.createOrder({ Active: 1, IdState: this.selectedStateId }).pipe(
            switchMap((orderResponse: any) => {
                const order = orderResponse?.data ?? orderResponse;
                const idOrder = order?.IdOrder ?? order?.id ?? order?.idOrder;
                if (!idOrder) throw new Error('Commande créée sans identifiant.');
                return this.ordersService.createOrderDetail({
                    IdOrder: idOrder,
                    IdUser: this.ordersService.getCurrentUserId(),
                    IdProduct: idProduct,
                    Quantity: this.quantity,
                    FirstName: this.orderForm.firstName || null,
                    LastName: this.orderForm.lastName || null,
                    Telephone: this.orderForm.phone || null,
                    Email: this.orderForm.email || null,
                    Address: this.orderForm.address || null,
                }).pipe(switchMap(() => this.finalizeOrder(idOrder)));
            })
        ).subscribe({
            next: () => {
                this.orderLoading    = false;
                this.showOrderForm   = false;
                alert('✅ Commande passée avec succès !');
                this.router.navigate(['/users/dashboard']);
            },
            error: (err: any) => {
                this.orderLoading = false;
                this.error = err?.error?.message || 'Erreur lors de la commande.';
            }
        });
    }

    // Facture + livraison : un échec ici ne bloque pas la commande, qui
    // existe déjà avec ses lignes produit.
    private finalizeOrder(idOrder: number) {
        return this.invoicesService.generateInvoiceFromOrder(idOrder, 'cash_on_delivery').pipe(
            switchMap(() => this.deliveriesService.createDelivery({
                IdOrder: idOrder,
                Status: 'Pending',
                AddressLine: this.orderForm.address || '',
                City: '',
                Phone: this.orderForm.phone || '',
                DeliveryFee: 0,
            })),
            switchMap(() => [true])
        );
    }

    getStars(rating: number): number[] { return Array(Math.floor(rating || 0)).fill(0); }
    getEmptyStars(rating: number): number[] { return Array(5 - Math.floor(rating || 0)).fill(0); }

    goBack(): void { this.router.navigate(['/boutique']); }
}