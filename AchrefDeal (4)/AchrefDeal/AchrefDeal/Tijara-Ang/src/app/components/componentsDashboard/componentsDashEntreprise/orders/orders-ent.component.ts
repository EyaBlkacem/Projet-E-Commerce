import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { OrdersService } from 'src/app/core/services/orders.service';
import { UsersService } from 'src/app/core/services/users.service';
import { AssetsService } from 'src/app/core/services/assets.service';
import { DeliveriesService } from 'src/app/core/services/deliveries.service';

@Component({
  selector: 'app-orders-ent',
  templateUrl: './orders-ent.component.html',
  styleUrls: ['./orders-ent.component.scss'],
  standalone: false
})
export class OrdersEntComponent implements OnInit {

  breadCrumbItems = [
    { label: 'Vendeur' },
    { label: 'Mes Commandes', active: true }
  ];

  searchTerm = '';
  dateFrom = '';
  dateTo = '';
  filterStatus: 'tous' | 'actif' | 'annule' = 'tous';
  loading = true;
  error: string | null = null;

  allOrders: any[] = [];
  filteredOrders: any[] = [];
  selectedOrder: any = null;
  currentPage = 1;
  readonly pageSize = 10;

  constructor(
    private ordersService: OrdersService,
    private usersService: UsersService,
    private assetsService: AssetsService,
    private deliveriesService: DeliveriesService
  ) {}
  ngOnInit(): void { this.loadOrders(); }

loadOrders(): void {
  this.loading = true;
  this.error = null;

  this.ordersService.getAllSellerOrders().pipe(
    catchError(() => {
      this.error = "Impossible de charger les commandes.";
      return of([]);
    })
  ).subscribe((myOrders: any[]) => {
    this.allOrders = myOrders.map(o => this.buildOrderRow(o, o.details ?? []));
    this.attachClientNames(this.allOrders);
    this.loading = false;
    this.applyFilter();
  });
}
  private attachClientNames(orders: any[]): void {
    const ids: number[] = Array.from(new Set(orders
      .map((o: any) => o.raw?.IdUser)
      .filter((id: any) => !!id))) as number[];
    if (ids.length === 0) return;

    const calls: Record<number, any> = {};
    ids.forEach(id => {
      calls[id] = this.usersService.getUserById(id).pipe(
        map((res: any) => res?.data ?? res),
        catchError(() => of(null))
      );
    });

    forkJoin(calls).subscribe((usersById: any) => {
      orders.forEach((o: any) => {
        const u = usersById[o.raw?.IdUser];
        if (!u) return;
        o.client = [u.FirstName, u.LastName].filter(Boolean).join(' ') || u.Username || o.client;
        o.email = u.Email || o.email;
        o.telephone = u.Telephone || o.telephone;
        o.ville = u.City || u.Location || o.ville;
      });
    });
  }

private buildOrderRow(order: any, details: any[]): any {
  // ? Le nom du client vient désormais uniquement de attachClientNames()
  // (via usersService.getUserById), pas d'un appel GET /orders/{id}
  // (route cassée côté backend - hors périmètre frontend).
  const client = '—'; // sera rempli par attachClientNames()

  const lines = (Array.isArray(details) ? details : []).map((d: any) => ({
    ...d,
    _image: this.resolveImageUrl(this.firstImage(d?.product?.ImageProduct)),
  }));

  const products = lines.length
    ? lines.map((d: any) => d.product?.TitleProduct ?? `#${d.IdProduct}`).join(', ')
    : '—';

  const total = lines.reduce(
    (sum: number, d: any) => sum + (Number(d.UnitPrice) || 0) * (Number(d.Quantity) || 0),
    0
  );

  return {
    id: order.IdOrder,
    apiId: order.IdOrder,
    idDeal: order.IdDeal,
    status: order.Status ?? 'pending',
    date: order.DateTimeCommand ? new Date(order.DateTimeCommand).toLocaleDateString('fr-FR') : '—',
    active: Number(order.Active) === 1,
    client,
    ville: '—',
    email: '—',
    telephone: '—',
    products,
    lines,
    total,
    raw: order
  };
}

  // ? AJOUTÉ — même logique que products-ent.component.ts (IMAGES_FOLDER
  // = 'assets/products/images' côté ProductsController.php), pour rester
  // cohérent avec le reste du projet.
  private resolveImageUrl(raw: string | null | undefined): string | null {
    if (!raw || typeof raw !== 'string') return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    const cleanPath = raw.replace(/\\/g, '/');
    const filename = cleanPath.split('/').pop();
    if (!filename) return null;
    return `${this.assetsService.assetsBaseUrl}/assets/products/images/${filename}`;
  }

  // ? AJOUTÉ — ImageProduct est un tableau JSON de chemins côté backend
  // (accesseur Eloquent sur le modèle Products) ; on prend le premier.
  private firstImage(raw: any): string | null {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw[0] ?? null;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed[0] ?? null) : raw;
      } catch { return raw; }
    }
    return null;
  }

  // --- Statut par colis (Delivery) ------------------------------------
  //
  // La table Deliveries n'a aucune colonne reliant une livraison à un
  // vendeur/colis (confirmé sur le modèle + le contrôleur Laravel). En
  // attendant un vrai champ backend (ex: IdSeller sur Deliveries), on tague
  // la Delivery qu'on crée nous-mêmes en écrivant "IdSeller:<id>" dans son
  // champ Note, et on relit ce tag pour la retrouver plus tard. C'est un
  // contournement 100% frontend, fragile si quelqu'un modifie Note à la main
  // côté admin — à remplacer dès que le backend expose un vrai lien.

  private getCurrentSellerId(): number | null {
    // Même pattern que cart.component.ts (private get cartKey()) : on lit
    // directement le localStorage plutôt que de supposer une méthode
    // publique sur OrdersService.
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
      return u?.id ?? u?.IdUser ?? u?.user?.id ?? u?.user?.IdUser ?? null;
    } catch { return null; }
  }

  private buildSellerNote(sellerId: number): string {
    return `IdSeller:${sellerId}`;
  }

  private extractSellerId(note: any): number | null {
    const match = typeof note === 'string' ? note.match(/IdSeller:(\d+)/) : null;
    return match ? Number(match[1]) : null;
  }

  /**
   * Retrouve la Delivery de ce vendeur pour cette commande (via le tag Note),
   * ou la crée si elle n'existe pas encore (cas de l'acceptation).
   * ?? AddressLine/PostalCode/Phone seront vides tant que
   * cart.component.ts ne renseigne pas Address/ZipCode/Telephone à la
   * création des OrderDetails (hors scope ici — à signaler séparément).
   */
  private findOrCreateDeliveryForOrder(order: any, onDone: (deliveryId: number | null) => void): void {
    const sellerId = this.getCurrentSellerId();
    if (!sellerId) { onDone(null); return; }

    this.deliveriesService.getDeliveriesByOrder(order.apiId).pipe(
      catchError(() => of([]))
    ).subscribe((deliveries: any[]) => {
      const list = Array.isArray(deliveries) ? deliveries : [];
      const existing = list.find((d: any) => this.extractSellerId(d?.Note) === sellerId);
      if (existing) {
        onDone(existing.IdDelivery ?? existing.id ?? null);
        return;
      }

      const line = (order.lines && order.lines[0]) ?? {};
      const payload = {
        IdOrder: order.apiId,
        Status: 'Pending',
        AddressLine: line.Address ?? '',
        PostalCode: line.ZipCode ?? '',
        Phone: line.Telephone ?? '',
        Note: this.buildSellerNote(sellerId)
      };

      this.deliveriesService.createDelivery(payload).pipe(
        catchError(() => of(null))
      ).subscribe((res: any) => {
        const created = res?.data ?? res;
        onDone(created?.IdDelivery ?? created?.id ?? null);
      });
    });
  }

  changeOrderStatus(order: any, action: 'accept' | 'reject' | 'ship' | 'cancel'): void {
    const prevStatus = order.status;
    this.ordersService.updateOrderAction(order.id, action).subscribe({
      next: () => {
        const map: Record<string, string> = { accept: 'accepted', reject: 'rejected', ship: 'shipped', cancel: 'cancelled' };
        order.status = map[action];
        if (this.selectedOrder && this.selectedOrder.id === order.id) {
          this.selectedOrder.status = map[action];
        }

        // Crée/positionne la Delivery (colis) de ce vendeur pour cette
        // commande, en cohérence avec le statut de commande qu'il vient
        // de choisir. Ne bloque jamais l'action principale (accept/ship)
        // si la création/mise à jour de la Delivery échoue.
        if (action === 'accept') {
          this.findOrCreateDeliveryForOrder(order, () => {});
        } else if (action === 'ship') {
          this.findOrCreateDeliveryForOrder(order, (deliveryId) => {
            if (!deliveryId) return;
            this.deliveriesService.updateDeliveryStatus(deliveryId, 'In Transit').subscribe();
          });
        }
      },
      error: () => { order.status = prevStatus; }
    });
  }

  applyFilter(): void {
    let list = [...this.allOrders];

    if (this.filterStatus === 'actif') list = list.filter(o => o.active);
    if (this.filterStatus === 'annule') list = list.filter(o => !o.active);

    if (this.searchTerm.trim()) {
      const t = this.searchTerm.toLowerCase();
      list = list.filter(o =>
        String(o.id).includes(t) ||
        o.client.toLowerCase().includes(t) ||
        o.products.toLowerCase().includes(t)
      );
    }

    const from = this.dateFrom ? new Date(`${this.dateFrom}T00:00:00`).getTime() : null;
    const to = this.dateTo ? new Date(`${this.dateTo}T23:59:59.999`).getTime() : null;
    if (from !== null || to !== null) {
      list = list.filter(order => {
        const timestamp = new Date(order.raw?.DateTimeCommand ?? order.date).getTime();
        return (from === null || timestamp >= from) && (to === null || timestamp <= to);
      });
    }

    this.filteredOrders = list;
    this.currentPage = 1;
  }

  resetFilter(): void {
    this.searchTerm = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.applyFilter();
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.filteredOrders.length / this.pageSize)); }
  get pagedOrders(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredOrders.slice(start, start + this.pageSize);
  }
  get pageStart(): number { return this.filteredOrders.length ? (this.currentPage - 1) * this.pageSize + 1 : 0; }
  get pageEnd(): number { return Math.min(this.currentPage * this.pageSize, this.filteredOrders.length); }
  get pages(): number[] {
    const start = Math.max(1, Math.min(this.currentPage - 2, this.totalPages - 4));
    return Array.from({ length: Math.min(5, this.totalPages) }, (_, index) => start + index);
  }
  goToPage(page: number): void { if (page >= 1 && page <= this.totalPages) this.currentPage = page; }

  toggleActive(order: any): void {
    const prev = order.active;
    order.active = !order.active;
    this.applyFilter();

    // ? CORRIGÉ — updateOrderActive(id, active), pas ordersService(id, active)
    this.ordersService.updateOrderActive(order.apiId, order.active).subscribe({
      error: () => { order.active = prev; this.applyFilter(); }
    });
  }

  get countByStatus() {
    return {
      actives: this.allOrders.filter(o => o.active).length,
      annulees: this.allOrders.filter(o => !o.active).length,
      total: this.allOrders.length
    };
  }
}

