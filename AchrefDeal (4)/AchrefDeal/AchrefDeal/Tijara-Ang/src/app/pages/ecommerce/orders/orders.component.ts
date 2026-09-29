import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OrdersService } from 'src/app/core/services/orders.service';
import { DeliveriesService } from 'src/app/core/services/deliveries.service';
import { UsersService } from 'src/app/core/services/users.service';
import { AssetsService } from 'src/app/core/services/assets.service';
import { InvoicesService } from 'src/app/core/services/invoices.service';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

interface ColisItem {
  id: any;
  product_name: string;
  image_url: string;
  quantity: number;
  unit_price: number;
}

interface Colis {
  vendorKey: string;
  vendorName: string;
  items: ColisItem[];
  subtotal: number;
  status: string | null;
}

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss'],
  standalone: false
})
export class OrdersComponent implements OnInit {

  breadCrumbItems = [
    { label: 'Boutique', link: '/shop/products' },
    { label: 'Mes Commandes', active: true }
  ];

  orders:        any[] = [];
  selectedOrder: any   = null;
  filterStatus         = 'tous';
  search               = '';
  startDate            = '';
  endDate              = '';
  loading              = true;
  loadingDetail        = false;
  downloadingInvoiceId: number | null = null;
  regeneratingInvoiceId: number | null = null;

  currentPage = 1;
  pageSize    = 10;
  totalItems  = 0;
  totalPages  = 1;

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  statuses = [
    { value: 'tous',      label: 'Toutes'     },
    { value: 'pending',   label: 'En attente' },
    { value: 'confirmed', label: 'Confirmées' },
    { value: 'shipped',   label: 'Expédiées'  },
    { value: 'delivered', label: 'Livrées'    },
    { value: 'cancelled', label: 'Annulées'   },
  ];

  private vendorNameCache: Record<string, string> = {};

  private readonly deliveryStatusLabels: Record<string, string> = {
    'Pending':     'En attente',
    'In Transit':  'En cours de livraison',
    'Delivered':   'Livrée',
    'Failed':      'Échec de livraison',
    'Returned':    'Retournée'
  };
  private readonly deliveryStatusClasses: Record<string, string> = {
    'Pending':     'bg-warning-subtle text-warning',
    'In Transit':  'bg-primary-subtle text-primary',
    'Delivered':   'bg-success-subtle text-success',
    'Failed':      'bg-danger-subtle text-danger',
    'Returned':    'bg-secondary-subtle text-secondary'
  };

  countByStatus(status: string): number {
    return this.orders.filter(o => o.status === status).length;
  }

  getDeliveryState(order: any): string {
    const status = String(order?.delivery_status ?? order?.shipping_status ?? order?.status ?? '').toLowerCase();
    if (['pending', 'confirmed'].includes(status)) return 'Commande confirmée';
    if (['shipped', 'in_transit'].includes(status)) return 'En cours de livraison';
    if (['delivered'].includes(status)) return 'Livrée';
    if (['cancelled'].includes(status)) return 'Annulée';
    return 'À préparer';
  }

  getDeliveryBadgeClass(order: any): string {
    const status = String(order?.delivery_status ?? order?.shipping_status ?? order?.status ?? '').toLowerCase();
    if (['delivered'].includes(status)) return 'bg-success-subtle text-success';
    if (['shipped', 'in_transit'].includes(status)) return 'bg-primary-subtle text-primary';
    if (['cancelled'].includes(status)) return 'bg-danger-subtle text-danger';
    return 'bg-warning-subtle text-warning';
  }

  getColisStatusLabel(c: Colis): string {
    if (c.status && this.deliveryStatusLabels[c.status]) return this.deliveryStatusLabels[c.status];
    return this.getDeliveryState(this.selectedOrder);
  }

  getColisStatusClass(c: Colis): string {
    if (c.status && this.deliveryStatusClasses[c.status]) return this.deliveryStatusClasses[c.status];
    return this.getDeliveryBadgeClass(this.selectedOrder);
  }

  canRequestReturn(order: any): boolean {
    const status = String(order?.delivery_status ?? order?.shipping_status ?? order?.status ?? '').toLowerCase();
    return ['delivered', 'shipped', 'in_transit'].includes(status) && !order?.return_requested;
  }

  requestReturn(order: any): void {
    if (order.__returnPending) return;
    order.__returnPending = true;
    this.deliveriesService.getDeliveriesByOrder(order.id).subscribe({
      next: (deliveries: any[]) => {
        const delivery = Array.isArray(deliveries) ? deliveries[0] : null;
        const deliveryId = delivery?.IdDelivery;
        if (!deliveryId) {
          order.__returnPending = false;
          order.return_error = 'Aucune livraison trouvée pour cette commande.';
          return;
        }
        this.deliveriesService.updateDeliveryStatus(deliveryId, 'Returned').subscribe({
          next: () => {
            order.return_requested = true;
            order.return_status = 'requested';
            order.__returnPending = false;
          },
          error: () => {
            order.__returnPending = false;
            order.return_error = 'Échec de la demande de retour.';
          }
        });
      },
      error: () => {
        order.__returnPending = false;
        order.return_error = 'Échec de la demande de retour.';
      }
    });
  }

  constructor(
    private router: Router,
    private ordersService: OrdersService,
    private deliveriesService: DeliveriesService,
    private usersService: UsersService,
    private assetsService: AssetsService,
    private invoicesService: InvoicesService
  ) {}

  ngOnInit(): void { this.loadOrders(); }

  loadOrders(page: number = this.currentPage): void {
    this.loading = true;
    this.ordersService.getMyOrdersPaginated(page, this.pageSize).subscribe({
      next: (res: any) => {
        const list = res?.data ?? [];
        this.orders      = list.map((order: any) => this.mapOrder(order));
        this.totalItems  = res?.total ?? list.length;
        this.totalPages  = res?.last_page ?? Math.max(1, Math.ceil(this.totalItems / this.pageSize));
        this.currentPage = res?.current_page ?? page;

        this.loading = false;
        this.resolveVendorNamesForOrders(this.orders);
        this.loadInvoices();
      },
      error: () => { this.loading = false; }
    });
  }

  private extractInvoices(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.invoices)) return response.invoices;
    return [];
  }

  private loadInvoices(): void {
    this.invoicesService.getInvoices().subscribe({
      next: (response: any) => {
        const invoices = this.extractInvoices(response);
        const invoicesByOrder = new Map<string, any>();
        invoices.forEach((invoice: any) => {
          const orderId = invoice?.IdOrder ?? invoice?.idOrder ?? invoice?.order?.IdOrder ?? invoice?.order?.idOrder ?? invoice?.order?.id ?? null;
          if (orderId !== null && orderId !== undefined) invoicesByOrder.set(String(orderId), invoice);
        });
        this.orders.forEach((order: any) => order.invoice = invoicesByOrder.get(String(order.id)) ?? null);
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement des factures :', error);
        this.orders.forEach((order: any) => order.invoice = null);
      }
    });
  }

  downloadInvoice(order: any): void {
    const invoice = order?.invoice;
    const invoiceId = invoice?.IdInvoice ?? invoice?.idInvoice ?? invoice?.id ?? null;
    if (invoiceId === null || invoiceId === undefined) return;
    this.downloadingInvoiceId = Number(invoiceId);
    this.invoicesService.downloadInvoicePdf(Number(invoiceId)).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `facture-${invoiceId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.downloadingInvoiceId = null;
      },
      error: (error: any) => {
        console.error('Erreur lors du téléchargement de la facture :', error);
        this.downloadingInvoiceId = null;
      }
    });
  }

  // ✅ AJOUTÉ — filet de rattrapage pour les commandes dont la génération
  // automatique de facture (cart.component.ts::createInvoiceAndFinish) a
  // échoué silencieusement au moment du checkout. Réutilise l'endpoint
  // POST /invoices déjà exposé (InvoicesService.generateInvoiceFromOrder),
  // qui refuse simplement si une facture client existe déjà pour cette
  // commande — donc sans risque de doublon.
  regenerateInvoice(order: any): void {
    if (this.regeneratingInvoiceId === order.id) return;
    this.regeneratingInvoiceId = order.id;
    order.invoice_error = null;

    this.invoicesService.generateInvoiceFromOrder(order.id).subscribe({
      next: () => {
        this.invoicesService.getInvoices().subscribe({
          next: (response: any) => {
            const invoices = this.extractInvoices(response);
            const match = invoices.find((inv: any) =>
              String(inv?.IdOrder ?? inv?.idOrder ?? inv?.order?.IdOrder ?? inv?.order?.idOrder) === String(order.id)
            );
            order.invoice = match ?? null;
            if (this.selectedOrder && this.selectedOrder.id === order.id) {
              this.selectedOrder.invoice = order.invoice;
            }
            this.regeneratingInvoiceId = null;
          },
          error: () => { this.regeneratingInvoiceId = null; }
        });
      },
      error: (error: any) => {
        const message = error?.error?.message ?? 'Impossible de générer la facture.';
        console.error(`Échec de génération de la facture pour la commande #${order.id} :`, message);
        order.invoice_error = message;
        this.regeneratingInvoiceId = null;
      }
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.loadOrders(page);
  }

  prevPage(): void { this.goToPage(this.currentPage - 1); }
  nextPage(): void { this.goToPage(this.currentPage + 1); }

  get filteredOrders(): any[] {
    return this.orders.filter((o: any) => {
      const matchesStatus = this.filterStatus === 'tous' || o.status === this.filterStatus;
      const searchValue = this.search.trim().toLowerCase();
      const matchesSearch = !searchValue || [
        String(o.id ?? ''),
        String(o.shipping_address ?? ''),
        String(o.total_amount ?? ''),
        String(o.created_at ?? ''),
        String(o.status ?? ''),
        ...(Array.isArray(o.items) ? o.items.map((item: any) => [
          item?.product_name ?? '',
          item?.id ?? '',
          item?.quantity ?? ''
        ].join(' ')) : []),
        ...(Array.isArray(o.colis) ? o.colis.map((c: Colis) => c.vendorName) : [])
      ].join(' ').toLowerCase().includes(searchValue);

      const orderDate = o.created_at ? new Date(o.created_at) : null;
      const hasStart = !!this.startDate;
      const hasEnd = !!this.endDate;
      const matchesStart = !hasStart || !orderDate || orderDate >= new Date(`${this.startDate}T00:00:00`);
      const matchesEnd = !hasEnd || !orderDate || orderDate <= new Date(`${this.endDate}T23:59:59`);

      return matchesStatus && matchesSearch && matchesStart && matchesEnd;
    });
  }

  clearFilters(): void {
    this.search = '';
    this.startDate = '';
    this.endDate = '';
    this.filterStatus = 'tous';
  }

  showDetail(order: any): void {
    this.loadingDetail = true;
    this.selectedOrder = order;
    this.ordersService.getOrder(order.id).subscribe({
      next: (detail: any) => {
        const mapped = this.mapOrder(detail?.data ?? detail);
        mapped.invoice = order?.invoice ?? null;
        mapped.total_amount = mapped.items.reduce(
          (sum: number, item: any) => sum + (item.quantity * item.unit_price), 0
        );
        this.applyVendorNames(mapped);
        this.resolveColisStatuses(mapped).subscribe((withStatuses: any) => {
          this.selectedOrder = withStatuses;
          this.loadingDetail = false;
        });
      },
      error: () => { this.loadingDetail = false; }
    });
  }

  closeDetail(): void { this.selectedOrder = null; }

  orderLabel(id: number): string {
    return `#${String(id).padStart(4, '0')}`;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':   return 'bg-warning-subtle text-warning';
      case 'confirmed': return 'bg-info-subtle text-info';
      case 'shipped':   return 'bg-primary-subtle text-primary';
      case 'delivered': return 'bg-success-subtle text-success';
      case 'cancelled': return 'bg-danger-subtle text-danger';
      default:          return 'bg-secondary-subtle text-secondary';
    }
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'En attente', confirmed: 'Confirmée',
      shipped: 'Expédiée',   delivered: 'Livrée', cancelled: 'Annulée'
    };
    return map[status] || status;
  }

  goShop(): void { this.router.navigate(['/shop/products']); }

  private resolveImageUrl(raw: string | null | undefined): string | null {
    if (!raw || typeof raw !== 'string') return null;
    if (raw.startsWith('http\://') || raw.startsWith('https\://')) return raw;
    const cleanPath = raw.replace(/\\/g, '/');
    const filename = cleanPath.split('/').pop();
    if (!filename) return null;
    return `${this.assetsService.assetsBaseUrl}/assets/products/images/${filename}`;
  }

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

  private groupIntoColis(items: any[]): Colis[] {
    const groups = new Map<string, Colis>();
    for (const item of items) {
      const key = item.vendor_id != null ? String(item.vendor_id) : 'inconnu';
      if (!groups.has(key)) {
        groups.set(key, { vendorKey: key, vendorName: 'Vendeur', items: [], subtotal: 0, status: null });
      }
      const group = groups.get(key)!;
      group.items.push(item);
      group.subtotal += item.quantity * item.unit_price;
    }
    return Array.from(groups.values());
  }

  private mapOrder(raw: any): any {
    const details = raw?.details ?? raw?.order_details ?? [];
    const detailsArr = Array.isArray(details) ? details : [];
    const items = detailsArr.map((item: any) => ({
      id: item?.IdOrderDetail ?? item?.id,
      product_name: item?.product?.TitleProduct ?? item?.ProductName ?? 'Produit',
      image_url: this.resolveImageUrl(this.firstImage(item?.product?.ImageProduct)) ?? '',
      quantity: item?.Quantity ?? item?.quantity ?? 0,
      unit_price: item?.UnitPrice ?? item?.unit_price ?? 0,
      vendor_id: item?.product?.IdUser ?? null,
      vendor_name: null,
    }));

    return {
      ...raw,
      id: raw?.IdOrder ?? raw?.id,
      status: raw?.Status ?? raw?.status ?? 'pending',
      delivery_status: raw?.DeliveryStatus ?? raw?.delivery_status ?? raw?.ShippingStatus ?? raw?.shipping_status ?? (raw?.Status ?? raw?.status ?? 'pending'),
      shipping_address: raw?.ShippingAddress ?? raw?.Address ?? raw?.shipping_address
        ?? detailsArr[0]?.Address ?? detailsArr[0]?.address ?? '',
      tracking_number: raw?.TrackingNumber ?? raw?.tracking_number ?? `TN-${String(raw?.IdOrder ?? raw?.id ?? 0).padStart(6, '0')}`,
      shipping_method: raw?.ShippingMethod ?? raw?.shipping_method ?? 'Colis standard',
      package_type: raw?.PackageType ?? raw?.package_type ?? 'Colis',
      return_requested: !!(raw?.ReturnRequested ?? raw?.return_requested),
      return_status: raw?.ReturnStatus ?? raw?.return_status ?? (raw?.ReturnRequested ? 'requested' : ''),
      created_at: raw?.DateTimeCommand ?? raw?.CreatedAt ?? raw?.created_at,
      total_amount: items.reduce((sum: number, it: any) => sum + it.quantity * it.unit_price, 0),
      items,
      colis: this.groupIntoColis(items),
      invoice: raw?.invoice ?? null,
    };
  }

  private extractSellerId(note: any): number | null {
    const match = typeof note === 'string' ? note.match(/IdSeller:(\d+)/) : null;
    return match ? Number(match[1]) : null;
  }

  private resolveColisStatuses(order: any): import('rxjs').Observable<any> {
    if (!order?.colis?.length) return of(order);
    return this.deliveriesService.getDeliveriesByOrder(order.id).pipe(
      map((deliveries: any[]) => {
        const list = Array.isArray(deliveries) ? deliveries : [];
        order.colis.forEach((c: Colis) => {
          const match = list.find((d: any) => this.extractSellerId(d?.Note) === Number(c.vendorKey));
          c.status = match?.Status ?? null;
        });
        return order;
      }),
      catchError(() => of(order))
    );
  }

  private resolveVendorNamesForOrders(orders: any[]): void {
    const ids: number[] = Array.from(new Set(
      orders.flatMap(o => (o.items ?? []).map((it: any) => it.vendor_id).filter((id: any) => !!id))
    ));
    if (ids.length === 0) return;

    const calls: Record<number, any> = {};
    ids.forEach(id => {
      calls[id] = this.usersService.getUserById(id).pipe(
        map((res: any) => res?.data ?? res),
        catchError(() => of(null))
      );
    });

    forkJoin(calls).subscribe((usersById: any) => {
      ids.forEach(id => {
        const u = usersById[id];
        this.vendorNameCache[String(id)] = u?.Username
          || [u?.FirstName, u?.LastName].filter(Boolean).join(' ')
          || 'Vendeur';
      });
      orders.forEach(order => this.applyVendorNames(order));
    });
  }

  private applyVendorNames(order: any): void {
    (order.items ?? []).forEach((it: any) => {
      it.vendor_name = this.vendorNameCache[String(it.vendor_id)] || 'Vendeur';
    });
    (order.colis ?? []).forEach((c: Colis) => {
      c.vendorName = this.vendorNameCache[c.vendorKey] || 'Vendeur';
    });
  }
}