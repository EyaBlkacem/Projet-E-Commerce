import { Component, OnInit } from '@angular/core';
import { OrdersService } from 'src/app/core/services/orders.service';
import { AssetsService } from 'src/app/core/services/assets.service';
import { InvoicesService } from 'src/app/core/services/invoices.service';

@Component({
  selector: 'app-orders-user',
  templateUrl: './orders-user.component.html',
  standalone: false
})
export class OrdersUserComponent implements OnInit {

  activeTab = 'Toutes';
  selectedOrder: any | null = null;
  loading = true;
  downloadingInvoiceId: number | null = null;

  breadcrumbItems = [
    { label: 'Mon Espace' },
    { label: 'Mes Commandes', active: true }
  ];

  tabs = [
    'Toutes',
    'En attente',
    'Confirmée',
    'Expédiée',
    'Livrée',
    'Annulée'
  ];

  allOrders: any[] = [];

  searchInput = '';
  dateFrom = '';
  dateTo = '';

  sortBy: 'recent' | 'oldest' | 'amount' = 'recent';

  sortOptions = [
    { value: 'recent', label: 'Plus récentes' },
    { value: 'oldest', label: 'Plus anciennes' },
    { value: 'amount', label: 'Montant le plus élevé' }
  ];

  currentPage = 1;
  pageSize = 6;

  private readonly statusLabels: Record<string, string> = {
    pending: 'En attente',
    accepted: 'Confirmée',
    rejected: 'Refusée',
    shipped: 'Expédiée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
    out_of_stock: 'Rupture de stock',
    returned: 'Retournée'
  };

  private readonly statusBadgeClasses: Record<string, string> = {
    'En attente': 'badge bg-warning-subtle text-warning',
    'Confirmée': 'badge bg-primary-subtle text-primary',
    'Expédiée': 'badge bg-info-subtle text-info',
    'Livrée': 'badge bg-success-subtle text-success',
    'Annulée': 'badge bg-danger-subtle text-danger',
    'Refusée': 'badge bg-danger-subtle text-danger',
    'Rupture de stock': 'badge bg-secondary-subtle text-secondary',
    'Retournée': 'badge bg-dark-subtle text-dark'
  };

  private readonly invoiceStatusLabels: Record<string, string> = {
    Pending: 'En attente',
    Paid: 'Payée',
    Cancelled: 'Annulée'
  };

  constructor(
    private ordersService: OrdersService,
    private assetsService: AssetsService,
    private invoicesService: InvoicesService
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  // ============================================================
  // COMMANDES
  // ============================================================

  private loadOrders(): void {
    this.loading = true;

    this.ordersService.getMyOrdersDynamic().subscribe({
      next: (response: any) => {
        const data = this.extractArray(response);

        this.allOrders = data
          .map(raw => this.mapOrder(raw))
          .filter(order => order.rawId !== null);

        this.loadInvoices();
        this.loading = false;
      },

      error: error => {
        console.error('Erreur lors du chargement des commandes:', error);
        this.allOrders = [];
        this.loading = false;
      }
    });
  }

  private mapOrder(raw: any): any {
    const order = raw?.data ?? raw ?? {};

    const id = this.toNumber(
      order.IdOrder ??
      order.idOrder ??
      order.id
    );

    const createdAt =
      order.DateTimeCommand ??
      order.created_at ??
      order.CreatedAt ??
      null;

    const details = Array.isArray(order.details)
      ? order.details
      : Array.isArray(order.OrderDetails)
        ? order.OrderDetails
        : [];

    const packages = this.buildPackages(details);

    const items = packages.flatMap(pkg => pkg.items);

    const total = items.reduce(
      (sum: number, item: any) =>
        sum + (Number(item.price) * Number(item.qty)),
      0
    );

    const address =
      details[0]?.Address ??
      details[0]?.address ??
      order.Address ??
      order.address ??
      'Adresse non renseignée';

    const rawStatus =
      order.Status ??
      order.status ??
      'pending';

    return {
      id: `#${id}`,
      rawId: id,
      rawDate: createdAt,

      date: createdAt
        ? new Date(createdAt).toLocaleDateString('fr-FR')
        : 'Date non disponible',

      vendor: 'Tijara',
      items,
      packages,
      total: Number(total.toFixed(3)),
      status: this.mapStatus(rawStatus),
      address,
      payment: 'Paiement à la livraison',
      invoice: null
    };
  }

  // ============================================================
  // FACTURES
  // ============================================================

  private loadInvoices(): void {
    this.invoicesService.getInvoices().subscribe({
      next: (response: any) => {
        const invoices = this.extractArray(response);

        const invoicesByOrderId = new Map<string, any>();

        invoices.forEach((invoice: any) => {
          const orderId = this.getInvoiceOrderId(invoice);

          if (orderId !== null) {
            invoicesByOrderId.set(String(orderId), invoice);
          }
        });

        this.allOrders.forEach(order => {
          const key = String(order.rawId);

          order.invoice =
            invoicesByOrderId.get(key) ?? null;
        });

        console.log('Factures reçues:', invoices);
        console.log('Commandes avec factures:', this.allOrders);
      },

      error: error => {
        console.error('Erreur lors du chargement des factures:', error);

        this.allOrders.forEach(order => {
          order.invoice = null;
        });
      }
    });
  }

  private getInvoiceOrderId(invoice: any): number | null {
    const orderId =
      invoice?.IdOrder ??
      invoice?.idOrder ??
      invoice?.order?.IdOrder ??
      invoice?.order?.idOrder ??
      invoice?.order?.id ??
      null;

    return this.toNumber(orderId);
  }

  downloadInvoice(order: any, event?: Event): void {
    event?.stopPropagation();

    const invoice = order?.invoice;

    if (!invoice) {
      console.warn('Aucune facture disponible pour cette commande.');
      return;
    }

    const invoiceId = this.toNumber(
      invoice.IdInvoice ??
      invoice.idInvoice ??
      invoice.id
    );

    if (invoiceId === null) {
      console.error('Identifiant de facture introuvable.');
      return;
    }

    this.downloadingInvoiceId = invoiceId;

    this.invoicesService.downloadInvoicePdf(invoiceId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;

        const invoiceNumber =
          invoice.Number ??
          invoice.number ??
          `facture-${invoiceId}`;

        link.download = `${invoiceNumber}.pdf`;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(url);

        this.downloadingInvoiceId = null;
      },

      error: error => {
        console.error(
          'Erreur lors du téléchargement de la facture:',
          error
        );

        this.downloadingInvoiceId = null;
      }
    });
  }

  invoiceStatusLabel(status: string | null | undefined): string {
    if (!status) {
      return 'Non renseigné';
    }

    return this.invoiceStatusLabels[status] ?? status;
  }

  // ============================================================
  // COLIS ET PRODUITS
  // ============================================================

  private buildPackages(details: any[]): any[] {
    const groups = new Map<string, any>();

    details.forEach((detail: any) => {
      const product =
        detail?.product ??
        detail?.Product ??
        {};

      const sellerId =
        product.IdUser ??
        product.idUser ??
        detail.IdUser ??
        detail.idUser ??
        'unknown';

      const sellerName =
        product.Boutique?.Name ??
        product.boutique?.name ??
        product.SellerName ??
        product.sellerName ??
        detail.SellerName ??
        `Vendeur #${sellerId}`;

      const groupKey = String(sellerId);

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          sellerId,
          sellerName,
          items: []
        });
      }

      const rawStatus =
        detail.Status ??
        detail.status ??
        'pending';

      const status = this.mapStatus(rawStatus);

      const quantity = Number(
        detail.Quantity ??
        detail.quantity ??
        0
      );

      const price = Number(
        detail.UnitPrice ??
        detail.unitPrice ??
        product.PriceProduct ??
        product.price ??
        0
      );

      const image = this.resolveImageUrl(
        this.firstImage(
          product.ImageProduct ??
          product.imageProduct ??
          product.images
        )
      );

      groups.get(groupKey).items.push({
        name:
          product.TitleProduct ??
          product.title ??
          detail.TitleProduct ??
          `Produit #${detail.IdProduct ?? ''}`,

        qty: quantity,
        price,
        image,
        bgColor: '#eef6ff',

        rawStatus,
        status,
        statusClass: this.getStatusClass(status)
      });
    });

    return Array.from(groups.values()).map(group => ({
      sellerId: group.sellerId,
      sellerName: group.sellerName,
      items: group.items,

      total: group.items.reduce(
        (sum: number, item: any) =>
          sum + (item.price * item.qty),
        0
      )
    }));
  }

  // ============================================================
  // IMAGES
  // ============================================================

  private resolveImageUrl(
    raw: string | null | undefined
  ): string | null {
    if (!raw || typeof raw !== 'string') {
      return null;
    }

    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://')
    ) {
      return raw;
    }

    const cleanPath = raw.replace(/\\/g, '/');
    const filename = cleanPath.split('/').pop();

    if (!filename) {
      return null;
    }

    return `${this.assetsService.assetsBaseUrl}/assets/products/images/${filename}`;
  }

  private firstImage(raw: any): string | null {
    if (!raw) {
      return null;
    }

    if (Array.isArray(raw)) {
      return raw[0] ?? null;
    }

    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed)) {
          return parsed[0] ?? null;
        }

        return raw;
      } catch {
        return raw;
      }
    }

    return null;
  }

  // ============================================================
  // FILTRES
  // ============================================================

  onTabChange(tab: string): void {
    this.activeTab = tab;
    this.selectedOrder = null;
    this.currentPage = 1;
  }

  onSearchChange(): void {
    this.selectedOrder = null;
    this.currentPage = 1;
  }

  onClearSearch(): void {
    this.searchInput = '';
    this.currentPage = 1;
  }

  onDateChange(): void {
    this.selectedOrder = null;
    this.currentPage = 1;
  }

  clearDates(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.onDateChange();
  }

  onSortChange(): void {
    this.currentPage = 1;
  }

  get filteredOrders(): any[] {
    const term = this.searchInput.trim().toLowerCase();

    let result = this.allOrders.filter(order => {
      const matchTab =
        this.activeTab === 'Toutes' ||
        order.status === this.activeTab;

      const matchSearch =
        !term ||
        String(order.id).toLowerCase().includes(term) ||
        String(order.vendor).toLowerCase().includes(term) ||
        order.items.some((item: any) =>
          String(item.name).toLowerCase().includes(term)
        );

      return matchTab && matchSearch;
    });

    const from = this.dateFrom
      ? new Date(`${this.dateFrom}T00:00:00`).getTime()
      : null;

    const to = this.dateTo
      ? new Date(`${this.dateTo}T23:59:59.999`).getTime()
      : null;

    if (from !== null || to !== null) {
      result = result.filter(order => {
        const timestamp = new Date(order.rawDate).getTime();

        if (isNaN(timestamp)) {
          return false;
        }

        return (
          (from === null || timestamp >= from) &&
          (to === null || timestamp <= to)
        );
      });
    }

    switch (this.sortBy) {
      case 'recent':
        result.sort(
          (a, b) =>
            new Date(b.rawDate).getTime() -
            new Date(a.rawDate).getTime()
        );
        break;

      case 'oldest':
        result.sort(
          (a, b) =>
            new Date(a.rawDate).getTime() -
            new Date(b.rawDate).getTime()
        );
        break;

      case 'amount':
        result.sort(
          (a, b) =>
            (b.total || 0) - (a.total || 0)
        );
        break;
    }

    return result;
  }

  get totalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.filteredOrders.length / this.pageSize)
    );
  }

  get paginatedOrders(): any[] {
    const start =
      (this.currentPage - 1) * this.pageSize;

    return this.filteredOrders.slice(
      start,
      start + this.pageSize
    );
  }

  get pagesArray(): number[] {
    return Array.from(
      { length: this.totalPages },
      (_, index) => index + 1
    );
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
  }

  // ============================================================
  // STATUTS
  // ============================================================

  private mapStatus(status: any): string {
    const normalizedStatus = String(status ?? '').toLowerCase();

    return this.statusLabels[normalizedStatus] ??
      String(status ?? 'En attente');
  }

  countByStatus(status: string): number {
    if (status === 'Toutes') {
      return this.allOrders.length;
    }

    return this.allOrders.filter(
      order => order.status === status
    ).length;
  }

  getStatusClass(status: string): string {
    return this.statusBadgeClasses[status] ??
      'badge bg-secondary-subtle text-secondary';
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      'Livrée': 'success',
      'Expédiée': 'info',
      'Confirmée': 'primary',
      'En attente': 'warning',
      'Annulée': 'danger'
    };

    return map[status] ?? 'secondary';
  }

  // ============================================================
  // DETAILS
  // ============================================================

  toggleOrder(order: any): void {
    this.selectedOrder =
      this.selectedOrder?.id === order.id
        ? null
        : order;
  }

  getOrderTotal(order: any): number {
    if (!order?.items || !Array.isArray(order.items)) {
      return Number(order?.total ?? 0);
    }

    return order.items.reduce(
      (sum: number, item: any) =>
        sum + (Number(item.price) * Number(item.qty)),
      0
    ) || Number(order.total ?? 0);
  }

  // ============================================================
  // UTILITAIRES
  // ============================================================

  private toNumber(value: any): number | null {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const numberValue = Number(value);

    return Number.isFinite(numberValue)
      ? numberValue
      : null;
  }

  private extractArray(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.orders)) {
      return response.orders;
    }

    if (Array.isArray(response?.invoices)) {
      return response.invoices;
    }

    return [];
  }
}