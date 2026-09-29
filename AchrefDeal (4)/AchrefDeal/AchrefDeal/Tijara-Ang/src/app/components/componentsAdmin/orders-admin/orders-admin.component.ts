import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, Observable, forkJoin } from 'rxjs';
import { expand, reduce } from 'rxjs/operators';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { CatalogAdminService } from 'src/app/core/services/catalog-admin.service';
import { InvoicesService } from 'src/app/core/services/invoices.service';
import { OrdersService } from 'src/app/core/services/orders.service';

interface OrderItemRow {
  id: number;
  productTitle: string;
  quantity: number;
  unitPrice: number; // ← AJOUTÉ : nécessaire pour calculer un total estimé quand la facture n'existe pas encore
  vendorId: number | null;
  vendorName: string;
  status: string;
}

// Vendeur unique dans une commande multi-vendeurs (déduplication d'items par vendorId)
interface OrderVendorRow {
  vendorId: number;
  vendorName: string;
}

interface OrderRow {
  id: number;
  client: string;
  email: string;
  vendor: string;
  vendorId: number | null;
  items: OrderItemRow[];
  uniqueVendors: OrderVendorRow[]; // ← liste dédupliquée des vendeurs pour l'affichage
  multiVendor: boolean;
  product: string;
  location: string;
  total: number | null;
  totalIsEstimate: boolean; // ← AJOUTÉ : true si `total` vient du calcul frontend (pas d'une facture en base)
  invoiceStatus: string | null;
  deliveryStatus: string | null;
  date: string;
  active: boolean;
  expanded: boolean;
  regeneratingInvoice?: boolean; // état de chargement du bouton "Générer facture"
}

@Component({
  selector: 'app-orders-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Commandes" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<div class="row g-3 mb-4">
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #299cdb">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-info-subtle d-flex align-items-center justify-content-center">
          <i class="ri-shopping-bag-3-line fs-22 text-info"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-info">{{ statTotal }}</h3>
        <p class="mb-0 fs-12 text-muted">Total commandes</p></div>
      </div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #0ab39c">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-success-subtle d-flex align-items-center justify-content-center">
          <i class="ri-checkbox-circle-line fs-22 text-success"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-success">{{ statActive }}</h3>
        <p class="mb-0 fs-12 text-muted">Actives</p></div>
      </div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #f7b84b">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-warning-subtle d-flex align-items-center justify-content-center">
          <i class="ri-close-circle-line fs-22 text-warning"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-warning">{{ statInactive }}</h3>
        <p class="mb-0 fs-12 text-muted">Inactives</p></div>
      </div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid #0ab39c">
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="avatar-md rounded-3 bg-success-subtle d-flex align-items-center justify-content-center">
          <i class="ri-money-dollar-circle-line fs-22 text-success"></i>
        </div>
        <div><h3 class="mb-0 fw-bold text-success">{{ pageRevenue | number:'1.0-0' }}</h3>
        <p class="mb-0 fs-12 text-muted">Total (page, TND)</p></div>
      </div>
    </div>
  </div>
</div>

<div class="card border-0 shadow-sm">
  <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2 py-3">
    <h6 class="mb-0 fw-semibold flex-grow-1">
      <i class="ri-shopping-bag-3-line me-2 text-info"></i>Toutes les commandes
      <span class="badge bg-info-subtle text-info ms-2">{{ totalItems }}</span>
    </h6>

    <div class="input-group input-group-sm" style="max-width:240px">
      <span class="input-group-text bg-white border-end-0"><i class="ri-search-line"></i></span>
      <input type="text" class="form-control border-start-0" placeholder="N° commande, client, vendeur, produit… (page actuelle)"
             [(ngModel)]="search" (ngModelChange)="recomputeDerived()" />
    </div>
    <select class="form-select form-select-sm" style="max-width:160px"
            [(ngModel)]="filter" (change)="setFilter()">
      <option value="">Toutes</option>
      <option value="active">Actives</option>
      <option value="inactive">Inactives</option>
    </select>
    <button class="btn btn-sm btn-light" (click)="exportCSV()" title="Export CSV (page actuelle)">
      <i class="ri-file-excel-2-line text-success me-1"></i>Export
    </button>
  </div>

  <div class="card-body p-0">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-info"></div></div>
    } @else if (visibleRows.length === 0) {
      <div class="text-center py-5">
        <i class="ri-shopping-bag-line display-3 text-muted opacity-50"></i>
        <p class="text-muted mt-2 mb-0">Aucune commande ne correspond.</p>
      </div>
    } @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th class="ps-3">N°</th>
              <th>Client</th>
              <th>Vendeur</th>
              <th>Deal</th>
              <th>Localisation</th>
              <th class="text-end">Total</th>
              <th class="text-center">Paiement</th>
              <th class="text-center">Livraison</th>
              <th>Date</th>
              <th class="text-center">Active</th>
              <th class="text-center">Colis</th>
            </tr>
          </thead>
          <tbody>
            @for (o of visibleRows; track o.id) {
              <tr>
                <td class="ps-3 fw-semibold text-info fs-13">#{{ o.id }}</td>
                <td>
                  <div class="fs-13 fw-semibold">{{ o.client }}</div>
                  @if (o.email) { <div class="fs-11 text-muted">{{ o.email }}</div> }
                </td>
                <td class="fs-12">
                  @if (o.multiVendor) {
                    <div class="d-flex flex-column gap-1">
                      @for (v of o.uniqueVendors; track v.vendorId) {
                        <a href="javascript:void(0)" class="text-primary text-decoration-underline"
                           (click)="goToVendor(v.vendorId)" title="Voir la fiche vendeur">{{ v.vendorName }}</a>
                      }
                    </div>
                  } @else if (o.vendorId) {
                    <a href="javascript:void(0)" class="text-primary text-decoration-underline"
                       (click)="goToVendor(o.vendorId)" title="Voir la fiche vendeur">{{ o.vendor }}</a>
                  } @else {
                    <span class="text-muted">{{ o.vendor }}</span>
                  }
                </td>
                <td class="fs-13" style="max-width:220px">
                  @if (o.items.length > 1) {
                    <span class="text-truncate d-block" [title]="o.items.length + ' articles'">
                      {{ o.items.length }} articles
                      <span *ngIf="o.multiVendor" class="badge bg-warning-subtle text-warning ms-1" style="font-size:10px">multi-vendeurs</span>
                    </span>
                  } @else {
                    <span class="text-truncate d-block">{{ o.product }}</span>
                  }
                </td>
                <td class="fs-12 text-muted">{{ o.location }}</td>
                <td class="text-end fw-semibold">
                  @if (o.total !== null) {
                    <span [title]="o.totalIsEstimate
                            ? 'Estimation calculée à partir des articles (hors taxe/livraison) — aucune facture en base pour cette commande'
                            : 'Total facturé (TTC)'">
                      @if (o.totalIsEstimate) { <span class="text-muted">~</span> }{{ o.total | number:'1.2-3' }} TND
                    </span>
                  } @else {
                    —
                  }
                </td>
                <td class="text-center">
                  @if (o.invoiceStatus) {
                    <span class="badge" [class]="'bg-' + statusColor(o.invoiceStatus) + '-subtle text-' + statusColor(o.invoiceStatus)">
                      {{ o.invoiceStatus }}
                    </span>
                  } @else {
                    <button class="btn btn-sm btn-outline-warning" (click)="regenerateInvoice(o)"
                            [disabled]="o.regeneratingInvoice" title="Aucune facture trouvée pour cette commande — en générer une">
                      @if (o.regeneratingInvoice) {
                        <span class="spinner-border spinner-border-sm"></span>
                      } @else {
                        <i class="ri-file-add-line"></i> Générer
                      }
                    </button>
                  }
                </td>
                <td class="text-center">
                  @if (o.deliveryStatus) {
                    <span class="badge" [class]="'bg-' + statusColor(o.deliveryStatus) + '-subtle text-' + statusColor(o.deliveryStatus)">
                      {{ o.deliveryStatus }}
                    </span>
                  } @else { <span class="text-muted">—</span> }
                </td>
                <td class="fs-12 text-muted">{{ o.date }}</td>
                <td class="text-center">
                  <div class="form-check form-switch d-inline-block">
                    <input class="form-check-input" type="checkbox" role="switch"
                           [checked]="o.active" (change)="toggleActive(o)" />
                  </div>
                </td>
                <td class="text-center">
                  <button class="btn btn-sm btn-light" (click)="o.expanded = !o.expanded" title="Voir les colis">
                    <i class="ri-box-3-line"></i> {{ o.items.length }}
                  </button>
                </td>
              </tr>
              @if (o.expanded) {
                <tr>
                  <td colspan="11" class="bg-light-subtle p-3">
                    @if (o.items.length === 0) {
                      <div class="text-muted fs-12">Commande basée sur un deal, pas de colis individuels.</div>
                    } @else {
                      <table class="table table-sm table-borderless mb-0">
                        <thead>
                          <tr class="fs-11 text-muted">
                            <th>Produit</th>
                            <th>Vendeur</th>
                            <th>Qté</th>
                            <th>Statut colis</th>
                            <th>Changer le statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (it of o.items; track it.id) {
                            <tr>
                              <td class="fs-13">{{ it.productTitle }}</td>
                              <td class="fs-13">{{ it.vendorName }}</td>
                              <td class="fs-13">{{ it.quantity }}</td>
                              <td>
                                <span class="badge" [class]="'bg-' + itemStatusColor(it.status) + '-subtle text-' + itemStatusColor(it.status)">
                                  {{ itemStatusLabel(it.status) }}
                                </span>
                              </td>
                              <td>
                                <select class="form-select form-select-sm" style="max-width:180px"
                                        [ngModel]="it.status" (ngModelChange)="changeItemStatus(o, it, $event)">
                                  <option value="pending">En attente</option>
                                  <option value="accepted">Accepté</option>
                                  <option value="rejected">Rejeté</option>
                                  <option value="out_of_stock">Rupture de stock</option>
                                  <option value="shipped">Expédié</option>
                                  <option value="delivered">Livré</option>
                                  <option value="cancelled">Annulé</option>
                                  <option value="returned">Retourné</option>
                                </select>
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    }
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <div class="d-flex align-items-center justify-content-between p-3 border-top flex-wrap gap-2">
        <span class="fs-12 text-muted">Page {{ page }} / {{ totalPages }} — {{ totalItems }} commande(s)</span>
        <nav aria-label="Pagination des commandes">
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" [class.disabled]="page <= 1">
              <button class="page-link" (click)="goToPage(page - 1)" [disabled]="page <= 1" aria-label="Précédent">
                <i class="ri-arrow-left-s-line"></i>
              </button>
            </li>
            @for (p of pageNumbers; track $index) {
              @if (p === ELLIPSIS) {
                <li class="page-item disabled">
                  <span class="page-link">…</span>
                </li>
              } @else {
                <li class="page-item" [class.active]="p === page">
                  <button class="page-link" (click)="goToPage(p)">{{ p }}</button>
                </li>
              }
            }
            <li class="page-item" [class.disabled]="page >= totalPages">
              <button class="page-link" (click)="goToPage(page + 1)" [disabled]="page >= totalPages" aria-label="Suivant">
                <i class="ri-arrow-right-s-line"></i>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    }
  </div>
</div>
`,
})
export class OrdersAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Commandes', active: true }];

  orders: OrderRow[] = [];
  search = '';
  filter = '';
  loading = true;

  page       = 1;
  perPage    = 10;
  totalItems = 0;
  totalPages = 1;

  statTotal    = 0;
  statActive   = 0;
  statInactive = 0;

  // ─── Pagination numérique ─────────────────────────────────────────────
  // Marqueur utilisé dans le template pour afficher "…" entre deux groupes de pages
  readonly ELLIPSIS = -1;

  // Calcule la liste des numéros de page à afficher (avec ellipses),
  // ex: [1, ELLIPSIS, 4, 5, 6, ELLIPSIS, 12] pour page=5, totalPages=12.
  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.page;
    const delta = 1; // nombre de pages affichées de chaque côté de la page courante
    const range: number[] = [];
    const result: number[] = [];

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    let last: number | undefined;
    for (const i of range) {
      if (last !== undefined) {
        if (i - last === 2) {
          result.push(last + 1); // un seul chiffre manquant -> on l'affiche au lieu d'un "…"
        } else if (i - last > 2) {
          result.push(this.ELLIPSIS);
        }
      }
      result.push(i);
      last = i;
    }

    return result;
  }
  // ────────────────────────────────────────────────────────────────────

  // IdUser -> {name, email} ; IdDeal -> {title, idUser} ; IdOrder -> invoice/delivery info
  private usersMap:       Record<number, { name: string; email: string }> = {};
  private dealsMap:       Record<number, { title: string; idUser: number }> = {};
  private statesMap:      Record<number, string> = {};
  private invoicesMap:    Record<number, { total: number; status: string }> = {};
  private deliveriesMap:  Record<number, string> = {};
  private productsMap:    Record<number, { title: string; idUser: number }> = {};
  // IdOrder -> lignes (un article = un produit = un vendeur). Une commande
  // peut regrouper des articles de plusieurs vendeurs différents.
  private orderItemsMap:  Record<number, OrderItemRow[]> = {};

  visibleRows: OrderRow[] = [];
  pageRevenue = 0;

  recomputeDerived(): void {
    const s = this.search.trim().toLowerCase();
    this.visibleRows = !s ? this.orders : this.orders.filter(o =>
      `#${o.id} ${o.id} ${o.client} ${o.vendor} ${o.product}`.toLowerCase().includes(s));
    this.pageRevenue = this.orders.reduce((sum, o) => sum + (o.total || 0), 0);
  }

  constructor(
    private router: Router,
    private api: TijaraApiService,
    private catalogAdmin: CatalogAdminService,
    private invoices: InvoicesService,
    private ordersApi: OrdersService,
  ) {}

  goToVendor(vendorId: number | null): void {
    if (!vendorId) return;
    this.router.navigate(['/admin/vendor-detail', vendorId]);
  }

  // Normalise une réponse HTTP qui peut être soit un tableau brut
  // [ {...}, {...} ] (backend sans paginate()), soit un objet paginé
  // Laravel { data: [...], current_page, last_page, ... }. Beaucoup de
  // endpoints (ex: /invoices via getInvoicesLookup) ne sont pas confirmés
  // paginés côté backend — cette fonction évite de perdre silencieusement
  // toutes les données quand ce n'est pas le cas.
  private asArray(res: any): any[] {
    if (Array.isArray(res)) return res;
    return res?.data ?? [];
  }

  // ─── Pagination complète côté frontend ───────────────────────────────
  // Le backend plafonne per_page à 50 sur chacune de ces ressources
  // (users, deals, states, products, order-details, deliveries) — on ne
  // touche pas à ça côté Laravel. À la place, on boucle nous-mêmes sur
  // toutes les pages (page=1,2,3…) jusqu'à `last_page`, et on fusionne
  // tous les `.data` reçus, pour être sûr de consommer 100% des données
  // du backend, quelle que soit la taille des tables.
  private fetchAllPages(path: string, extraParams: any = {}): Observable<any[]> {
    const PAGE_SIZE = 50;       // aligné sur le MAX_PER_PAGE réel du backend
    const SAFETY_MAX_PAGES = 200; // garde-fou anti boucle infinie

    const fetchPage = (page: number) =>
      this.catalogAdmin.adminList(path, { ...extraParams, per_page: PAGE_SIZE, page });

    return fetchPage(1).pipe(
      expand((res: any) => {
        // Si le backend renvoie un tableau brut (pas de paginate() côté
        // Laravel), il n'y a qu'une seule "page" à traiter — sinon
        // current_page/last_page valent toujours 1/undefined et on boucle
        // sur la même page ou on perd les données selon le cas.
        if (Array.isArray(res)) return EMPTY;
        const current = Number(res?.current_page ?? 1);
        const last    = Number(res?.last_page ?? current);
        if (current >= last || current >= SAFETY_MAX_PAGES) {
          return EMPTY;
        }
        return fetchPage(current + 1);
      }),
      // Accepte tableau brut OU objet paginé à chaque page.
      reduce((acc: any[], res: any) => acc.concat(this.asArray(res)), [] as any[])
    );
  }

  ngOnInit(): void {

    forkJoin({
      users:        this.fetchAllPages('users'),
      deals:        this.fetchAllPages('deals'),
      states:       this.fetchAllPages('states'),
      invoices:     this.invoices.getInvoicesLookup(), // format non confirmé : tableau brut OU paginé
      deliveries:   this.fetchAllPages('deliveries'),
      products:     this.fetchAllPages('products'),
      orderDetails: this.fetchAllPages('order-details'),
    }).subscribe({
      next: ({ users, deals, states, invoices, deliveries, products, orderDetails }: any) => {
        (users || []).forEach((u: any) => {
          this.usersMap[u.IdUser] = {
            name: `${u.FirstName || ''} ${u.LastName || ''}`.trim() || u.Username || '—',
            email: u.Email || '',
          };
        });
        (deals || []).forEach((d: any) => {
          this.dealsMap[d.IdDeal] = { title: d.titleDeal || '—', idUser: d.idUser };
        });
        (states || []).forEach((s: any) => {
          this.statesMap[s.IdState] = s.NameFR || s.NameEN || '';
        });
        // getInvoicesLookup() n'a pas de garantie de pagination côté
        // backend (pas de paginate() confirmé dans InvoicesController).
        // Si le backend renvoie un tableau brut, invoices?.data valait
        // `undefined` → fallback silencieux sur [] → invoicesMap restait
        // vide pour TOUTES les commandes (Total/Paiement toujours "—").
        const invoiceList = this.asArray(invoices);
        invoiceList.forEach((i: any) => {
          this.invoicesMap[i.IdOrder] = { total: +i.Total, status: i.Status };
        });
        (deliveries || []).forEach((d: any) => {
          this.deliveriesMap[d.IdOrder] = d.Status;
        });
        (products || []).forEach((p: any) => {
          this.productsMap[p.IdProduct] = { title: p.TitleProduct || `Produit #${p.IdProduct}`, idUser: +p.IdUser };
        });
        // Regroupe les lignes de commande par commande : c'est là qu'on voit
        // qu'une même commande peut contenir des articles de plusieurs
        // vendeurs différents (chaque ligne pointe vers un produit, chaque
        // produit a son propre vendeur).
        // Le vendeur/produit viennent maintenant directement de la ligne
        // OrderDetails (backend : GET /order-details charge `product` et
        // `product.user` en une seule requête — voir OrderDetailsController).
        // On ne dépend plus de productsMap/usersMap ici : ça évite tout
        // décalage entre la pagination de /products, /users et /order-details
        // (c'est ce décalage qui faisait apparaître "Produit #N" et un
        // vendeur vide alors que le produit existe bel et bien).
        //
        // On capture aussi UnitPrice (déjà présent dans la réponse
        // /order-details, comme utilisé par InvoicesController::store()
        // côté backend pour calculer Subtotal) : ça permet de calculer un
        // total estimé côté frontend pour les commandes qui n'ont pas
        // encore de facture en base (voir mapRow()).
        (orderDetails || []).forEach((line: any) => {
          const product = line.product ?? this.productsMap[line.IdProduct];
          const vendor  = line.product?.user ?? null;
          const vendorId = vendor?.IdUser ?? product?.idUser ?? null;
          const vendorName = vendor
            ? (`${vendor.FirstName || ''} ${vendor.LastName || ''}`.trim() || vendor.Username || `Vendeur #${vendorId}`)
            : (vendorId ? (this.usersMap[vendorId]?.name || `Vendeur #${vendorId}`) : '—');
          const entry: OrderItemRow = {
            id: line.IdOrderDeatils,
            productTitle: product?.TitleProduct || product?.title || `Produit #${line.IdProduct}`,
            quantity: +(line.Quantity ?? 1),
            unitPrice: +(line.UnitPrice ?? 0), // ← AJOUTÉ
            vendorId,
            vendorName,
            status: line.Status || 'pending',
          };
          if (!this.orderItemsMap[line.IdOrder]) this.orderItemsMap[line.IdOrder] = [];
          this.orderItemsMap[line.IdOrder].push(entry);
        });
        this.load();
        this.loadStats();
      },
      error: () => { this.load(); this.loadStats(); },
    });
  }

  private mapRow(o: any): OrderRow {
    const deal   = this.dealsMap[o.IdDeal];
    const client = this.usersMap[o.IdUser];
    const inv    = this.invoicesMap[o.IdOrder];
    const items  = this.orderItemsMap[o.IdOrder] || [];

    // Deux cas : commande "deal" classique (1 seul vendeur, via o.IdDeal),
    // ou commande "panier" avec des lignes OrderDetails (potentiellement
    // plusieurs vendeurs différents).
    const distinctVendorIds = [...new Set(items.map(i => i.vendorId).filter((v): v is number => v !== null))];
    const multiVendor = distinctVendorIds.length > 1;

    // Un seul objet {vendorId, vendorName} par vendeur distinct, calculé
    // une fois ici plutôt que de boucler sur `items` (qui contient
    // potentiellement plusieurs lignes pour le même vendeur) dans le
    // template. C'est ça qui corrige le nom de vendeur dupliqué à l'affichage.
    const uniqueVendors: OrderVendorRow[] = distinctVendorIds.map(id => ({
      vendorId: id,
      vendorName: items.find(i => i.vendorId === id)?.vendorName || `Vendeur #${id}`,
    }));

    let vendorLabel = '—';
    let vendorId: number | null = null;
    let productLabel = '—';

    if (items.length > 0) {
      productLabel = items.length === 1
        ? items[0].productTitle
        : `${items.length} articles`;
      if (!multiVendor) {
        vendorId    = distinctVendorIds[0] ?? null;
        // On garde le nom déjà résolu sur la ligne (items[0].vendorName,
        // lui-même issu de product.user renvoyé par le backend) plutôt que
        // de re-chercher dans usersMap : ça évite de perdre le vendeur si
        // usersMap ne l'a pas dans ses pages chargées.
        vendorLabel = vendorId
          ? (items.find(i => i.vendorId === vendorId)?.vendorName || this.usersMap[vendorId]?.name || `Vendeur #${vendorId}`)
          : '—';
      } else {
        vendorLabel = `${distinctVendorIds.length} vendeurs`;
      }
    } else if (deal) {
      // Ancienne commande basée sur un deal unique
      const vendor = this.usersMap[deal.idUser];
      vendorId     = deal.idUser ?? null;
      vendorLabel  = vendor?.name || '—';
      productLabel = deal.title || `Deal #${o.IdDeal}`;
    }

    // ← AJOUTÉ : si aucune facture n'existe en base pour cette commande
    // (bug backend de génération de numéro, ou facture pas encore créée),
    // on calcule un total à partir des lignes déjà chargées
    // (Quantity * UnitPrice), plutôt que d'afficher "—" indéfiniment.
    // C'est un sous-total HT, sans TVA/livraison/timbre — contrairement
    // au Total réel de la facture calculé par InvoicesController::store().
    // On le signale via totalIsEstimate pour ne jamais laisser penser à
    // l'admin que c'est un montant définitif facturé.
    const estimatedTotal = items.length > 0
      ? items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
      : null;

    return {
      id:             o.IdOrder,
      client:         client?.name  || `Utilisateur #${o.IdUser}`,
      email:          client?.email || '',
      vendor:         vendorLabel,
      vendorId,
      items,
      uniqueVendors,
      multiVendor,
      product:        productLabel,
      location:       this.statesMap[o.IdState] || '—',
      total:          inv ? inv.total : estimatedTotal,
      totalIsEstimate: !inv && estimatedTotal !== null, // ← AJOUTÉ
      invoiceStatus:  inv ? inv.status : null,
      deliveryStatus: this.deliveriesMap[o.IdOrder] || null,
      date:           o.DateTimeCommand ? new Date(o.DateTimeCommand).toLocaleDateString('fr-FR') : '—',
      active:         !!o.Active,
      expanded:       false,
    };
  }

  private buildParams(): any {
    const params: any = { page: this.page, per_page: this.perPage };
    if (this.filter === 'active')   params.Active = 1;
    if (this.filter === 'inactive') params.Active = 0;
    return params;
  }

  load(): void {
    this.loading = true;
    this.ordersApi.getAdminOrders(this.buildParams()).subscribe({
      next: (res: any) => {
        this.orders     = (res?.data || []).map((o: any) => this.mapRow(o));
        this.totalItems = res?.total        ?? this.orders.length;
        this.totalPages = res?.last_page    ?? 1;
        this.page       = res?.current_page ?? this.page;
        this.recomputeDerived();
        this.loading = false;
      },
      error: () => { this.loading = false; alert('Chargement impossible.'); }
    });
  }

  loadStats(): void {
    this.ordersApi.getAdminOrders({ per_page: 1 }).subscribe((res: any) => this.statTotal = res?.total ?? 0);
    this.ordersApi.getAdminOrders({ per_page: 1, Active: 1 }).subscribe((res: any) => this.statActive = res?.total ?? 0);
    this.ordersApi.getAdminOrders({ per_page: 1, Active: 0 }).subscribe((res: any) => this.statInactive = res?.total ?? 0);
  }

  setFilter(): void { this.page = 1; this.load(); }
  goToPage(p: number): void { if (p >= 1 && p <= this.totalPages && p !== this.page) { this.page = p; this.load(); } }

  toggleActive(o: OrderRow): void {
    const newValue = !o.active;
    this.ordersApi.updateOrderActive(o.id, newValue).subscribe({
      next: () => { o.active = newValue; this.loadStats(); },
      error: () => alert('Action impossible.'),
    });
  }

  // ← AJOUTÉ : câblage manquant du bouton "Générer" affiché quand une
  // commande n'a pas de facture (o.invoiceStatus === null). Utilise
  // InvoicesService.generateInvoiceFromOrder(), qui POST /invoices avec
  // IdOrder + PaymentMethod — 'cash_on_delivery' pour rester cohérent avec
  // ce que cart.component.ts envoie déjà pour les commandes normales.
  // Met à jour la ligne et invoicesMap en local pour un retour visuel
  // immédiat, sans recharger toute la page.
  regenerateInvoice(o: OrderRow): void {
    if (o.regeneratingInvoice) return;
    o.regeneratingInvoice = true;

    this.invoices.generateInvoiceFromOrder(o.id, 'cash_on_delivery').subscribe({
      next: (res: any) => {
        const inv = res?.data ?? res ?? {};
        const total = inv.Total ?? inv.total;
        const status = inv.Status ?? inv.status ?? 'pending';

        o.total = total != null ? +total : o.total;
        o.totalIsEstimate = false; // ← AJOUTÉ : dès qu'une vraie facture existe, le total n'est plus une estimation
        o.invoiceStatus = status;
        this.invoicesMap[o.id] = { total: o.total ?? 0, status };

        o.regeneratingInvoice = false;
      },
      error: (err) => {
        o.regeneratingInvoice = false;
        const raw = err?.error?.message || '';
        const isDuplicateNumber = raw.includes('UQ_Invoices_Number');
        alert(isDuplicateNumber
          ? 'Erreur backend connue (numérotation de facture en collision) — merci de contacter l\'équipe backend, réessayer ne résoudra pas le problème.'
          : (raw || 'Impossible de générer la facture pour cette commande.'));
      }
    });
  }

  exportCSV(): void {
    const header = 'N°,Client,Email,Vendeur,Deal,Total,Paiement,Livraison,Date,Active\n';
    const rows = this.visibleRows.map(o =>
      [o.id, `"${o.client}"`, o.email, `"${o.vendor}"`, `"${o.product}"`,
       o.total ?? '', o.invoiceStatus ?? '', o.deliveryStatus ?? '', o.date, o.active].join(',')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `commandes-page${this.page}-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  statusColor(s: string): string {
    const k = (s || '').toLowerCase();
    if (k.includes('paid') || k.includes('delivered')) return 'success';
    if (k.includes('ship')) return 'primary';
    if (k.includes('cancel')) return 'danger';
    return 'warning';
  }

  itemStatusLabel(s: string): string {
    const labels: Record<string, string> = {
      pending: 'En attente',
      accepted: 'Accepté',
      rejected: 'Rejeté',
      out_of_stock: 'Rupture de stock',
      shipped: 'Expédié',
      delivered: 'Livré',
      cancelled: 'Annulé',
      returned: 'Retourné',
    };
    return labels[s] || s;
  }

  itemStatusColor(s: string): string {
    const colors: Record<string, string> = {
      pending: 'warning',
      accepted: 'info',
      rejected: 'danger',
      out_of_stock: 'danger',
      shipped: 'primary',
      delivered: 'success',
      cancelled: 'secondary',
      returned: 'secondary',
    };
    return colors[s] || 'secondary';
  }

  changeItemStatus(o: OrderRow, it: OrderItemRow, newStatus: string): void {
    const previous = it.status;
    this.ordersApi.updateOrderDetailStatus(it.id, newStatus).subscribe({
      next: () => { it.status = newStatus; this.load(); },
      error: (err) => {
        it.status = previous;
        alert(err?.error?.message || 'Changement de statut impossible.');
      },
    });
  }
}