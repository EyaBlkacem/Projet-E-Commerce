import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';

import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { InvoicesService } from 'src/app/core/services/invoices.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit {

  loading = true;

  orders: any[] = [];
  filteredOrders: any[] = [];

  searchTerm = '';
  dateFrom = '';
  dateTo = '';

  successOrderId: string | null = null;
  downloadingInvoiceId: number | null = null;

  constructor(
    private api: TijaraApiService,
    private invoicesApi: InvoicesService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.successOrderId =
      this.route.snapshot.queryParamMap.get('success');

    this.loadOrders();
  }

  /**
   * Chargement des commandes de l'utilisateur connecté
   */
  private loadOrders(): void {
    this.loading = true;

    this.api.getMyTrackedOrders().subscribe({

      next: (data: any) => {

        const ordersData = this.extractArray(data);

        this.orders = ordersData
          .map((raw: any) => {

            const order = raw?.data ?? raw ?? {};

            const orderId =
              order.IdOrder ??
              order.idOrder ??
              order.id ??
              null;

            return {
              id: orderId,

              createdAt:
                order.DateTimeCommand ??
                order.created_at ??
                order.CreatedAt ??
                order.createdAt ??
                null,

              total_amount:
                order.total_amount ??
                order.TotalAmount ??
                order.Total ??
                order.total ??
                0,

              status: this.normalizeStatus(
                order.Status ??
                order.status ??
                'pending'
              ),

              invoice: null
            };
          })
          .filter((order: any) =>
            order.id !== null &&
            order.id !== undefined
          )
          .sort((a: any, b: any) => {

            const dateA = a.createdAt
              ? new Date(a.createdAt).getTime()
              : 0;

            const dateB = b.createdAt
              ? new Date(b.createdAt).getTime()
              : 0;

            return dateB - dateA;
          });

        this.applyFilter();
        this.loading = false;

        // Charger les factures après les commandes
        this.loadInvoices();
      },

      error: (error: any) => {

        console.error(
          'Erreur lors du chargement des commandes :',
          error
        );

        this.orders = [];
        this.filteredOrders = [];
        this.loading = false;
      }
    });
  }

  /**
   * Chargement et association des factures avec les commandes
   */
  private loadInvoices(): void {

    this.invoicesApi.getInvoices().subscribe({

      next: (response: any) => {

        console.log(
          'Réponse API factures :',
          response
        );

        const invoices =
          this.extractInvoices(response);

        console.log(
          'Factures récupérées :',
          invoices
        );

        const invoicesByOrderId =
          new Map<string, any>();

        invoices.forEach((invoice: any) => {

          const invoiceOrderId =
            invoice?.IdOrder ??
            invoice?.idOrder ??
            invoice?.order?.IdOrder ??
            invoice?.order?.idOrder ??
            invoice?.order?.id ??
            null;

          if (
            invoiceOrderId !== null &&
            invoiceOrderId !== undefined
          ) {
            invoicesByOrderId.set(
              String(invoiceOrderId),
              invoice
            );
          }
        });

        console.log(
          'Factures classées par commande :',
          Array.from(invoicesByOrderId.entries())
        );

        this.orders.forEach((order: any) => {

          const orderId = String(order.id);

          order.invoice =
            invoicesByOrderId.get(orderId) ?? null;

          console.log(
            `Commande ${orderId} → Facture :`,
            order.invoice
          );
        });

        this.applyFilter();
      },

      error: (error: any) => {

        console.error(
          'Erreur lors du chargement des factures :',
          error
        );

        this.orders.forEach((order: any) => {
          order.invoice = null;
        });
      }
    });
  }

  /**
   * Extraction des commandes
   */
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

    if (Array.isArray(response?.data?.data)) {
      return response.data.data;
    }

    return [];
  }

  /**
   * Extraction des factures selon la réponse de l'API
   */
  private extractInvoices(response: any): any[] {

    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.invoices)) {
      return response.invoices;
    }

    if (Array.isArray(response?.data?.data)) {
      return response.data.data;
    }

    return [];
  }

  /**
   * Téléchargement du PDF de la facture
   */
  downloadInvoice(order: any): void {

    const invoice = order?.invoice;

    if (!invoice) {
      console.warn(
        'Aucune facture associée à cette commande'
      );
      return;
    }

    const invoiceId =
      invoice.IdInvoice ??
      invoice.idInvoice ??
      invoice.id ??
      null;

    if (
      invoiceId === null ||
      invoiceId === undefined
    ) {
      console.error(
        'ID de facture introuvable :',
        invoice
      );
      return;
    }

    const numericInvoiceId = Number(invoiceId);

    this.downloadingInvoiceId = numericInvoiceId;

    this.invoicesApi
      .downloadInvoicePdf(numericInvoiceId)
      .subscribe({

        next: (blob: Blob) => {

          const url =
            window.URL.createObjectURL(blob);

          const link =
            document.createElement('a');

          link.href = url;

          link.download =
            `${invoice.Number ?? 'facture'}.pdf`;

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          window.URL.revokeObjectURL(url);

          this.downloadingInvoiceId = null;
        },

        error: (error: any) => {

          console.error(
            'Erreur téléchargement facture :',
            error
          );

          this.downloadingInvoiceId = null;
        }
      });
  }

  /**
   * Filtrage des commandes
   */
  applyFilter(): void {

    const query =
      this.searchTerm.trim().toLowerCase();

    const from = this.dateFrom
      ? new Date(
          `${this.dateFrom}T00:00:00`
        ).getTime()
      : null;

    const to = this.dateTo
      ? new Date(
          `${this.dateTo}T23:59:59.999`
        ).getTime()
      : null;

    this.filteredOrders =
      this.orders.filter((order: any) => {

        const createdAt = order.createdAt
          ? new Date(order.createdAt).getTime()
          : 0;

        const matchesQuery =
          !query ||
          [
            order.id,
            order.status,
            order.total_amount,
            order.invoice?.Number
          ].some((value: any) =>
            String(value ?? '')
              .toLowerCase()
              .includes(query)
          );

        const matchesFrom =
          from === null ||
          createdAt >= from;

        const matchesTo =
          to === null ||
          createdAt <= to;

        return (
          matchesQuery &&
          matchesFrom &&
          matchesTo
        );
      });
  }

  /**
   * Réinitialisation des filtres
   */
  resetFilter(): void {

    this.searchTerm = '';
    this.dateFrom = '';
    this.dateTo = '';

    this.applyFilter();
  }

  /**
   * Normalisation du statut
   */
  private normalizeStatus(status: any): string {

    return String(status ?? 'pending')
      .trim()
      .toLowerCase();
  }

  /**
   * Libellé du statut de commande
   */
  statusLabel(status: string): string {

    const map: Record<string, string> = {

      pending: 'En attente',
      accepted: 'Acceptée',
      confirmed: 'Confirmée',
      shipped: 'Expédiée',
      delivered: 'Livrée',
      cancelled: 'Annulée',
      rejected: 'Rejetée',
      returned: 'Retournée',
      out_of_stock: 'Rupture de stock'
    };

    const normalizedStatus =
      this.normalizeStatus(status);

    return map[normalizedStatus] ??
      status ??
      'Inconnu';
  }

  /**
   * Classe CSS du statut
   */
  statusClass(status: string): string {

    const map: Record<string, string> = {

      pending:
        'badge bg-warning-subtle text-warning',

      accepted:
        'badge bg-primary-subtle text-primary',

      confirmed:
        'badge bg-primary-subtle text-primary',

      shipped:
        'badge bg-info-subtle text-info',

      delivered:
        'badge bg-success-subtle text-success',

      cancelled:
        'badge bg-danger-subtle text-danger',

      rejected:
        'badge bg-danger-subtle text-danger',

      returned:
        'badge bg-secondary-subtle text-secondary',

      out_of_stock:
        'badge bg-secondary-subtle text-secondary'
    };

    const normalizedStatus =
      this.normalizeStatus(status);

    return map[normalizedStatus] ??
      'badge bg-secondary-subtle text-secondary';
  }

  /**
   * Libellé du statut de facture
   */
  invoiceStatusLabel(status: string): string {

    const map: Record<string, string> = {

      pending: 'En attente',
      paid: 'Payée',
      cancelled: 'Annulée'
    };

    const normalizedStatus =
      String(status ?? '')
        .trim()
        .toLowerCase();

    return map[normalizedStatus] ??
      status ??
      'Inconnu';
  }
}