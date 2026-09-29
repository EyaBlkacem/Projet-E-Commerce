<app-breadcrumbs [title]="'Gestion des Produits'" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<!-- Stats -->
<div class="row g-3 mb-4">
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm text-center py-3">
      <div class="fs-26 fw-bold text-primary">{{ countByStatus('all') }}</div>
      <div class="text-muted fs-13">Total</div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm text-center py-3">
      <div class="fs-26 fw-bold text-warning">{{ countByStatus('pending') }}</div>
      <div class="text-muted fs-13">En attente</div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm text-center py-3">
      <div class="fs-26 fw-bold text-success">{{ countByStatus('approved') }}</div>
      <div class="text-muted fs-13">Approuvés</div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="card border-0 shadow-sm text-center py-3">
      <div class="fs-26 fw-bold text-danger">{{ countByStatus('rejected') }}</div>
      <div class="text-muted fs-13">Rejetés</div>
    </div>
  </div>
</div>

<!-- Filters + Search -->
<div class="card border-0 shadow-sm mb-3">
  <div class="card-body d-flex flex-wrap gap-3 align-items-center">
    <div class="d-flex gap-2 flex-wrap">
      @for (f of filters; track f.key) {
        <button class="btn btn-sm rounded-pill px-3"
                [class]="activeFilter === f.key ? f.class : 'btn-outline-secondary'"
                (click)="setFilter(f.key)">
          {{ f.label }}
          <span class="badge ms-1 bg-white text-dark">{{ countByStatus(f.key) }}</span>
        </button>
      }
    </div>
    <div class="flex-fill position-relative" style="min-width:200px;max-width:350px">
      <i class="ri-search-line position-absolute top-50 translate-middle-y ms-3 text-muted"></i>
      <input type="text" class="form-control ps-5 rounded-pill form-control-sm"
             placeholder="Rechercher produit, vendeur..."
             [(ngModel)]="searchTerm" (ngModelChange)="applyFilter()">
    </div>
    <button class="btn btn-sm btn-outline-secondary ms-auto" (click)="load()">
      <i class="ri-refresh-line me-1"></i>Actualiser
    </button>
  </div>
</div>

<!-- Table -->
<div class="card border-0 shadow-sm">
  <div class="card-body p-0">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    } @else if (filteredProducts.length === 0) {
      <div class="text-center py-5">
        <i class="ri-box-3-line display-3 text-muted opacity-50"></i>
        <p class="text-muted mt-3">Aucun produit trouvé.</p>
      </div>
    } @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th class="ps-3">Produit</th>
              <th>Vendeur</th>
              <th>Catégorie</th>
              <th>Prix</th>
              <th>Stock</th>
              <th>Statut</th>
              <th>Date</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (p of filteredProducts; track p.id) {
              <tr>
                <td class="ps-3">
                  <div class="d-flex align-items-center gap-3">
                    <div class="rounded-3 overflow-hidden d-flex align-items-center justify-content-center flex-shrink-0"
                         style="width:48px;height:48px;background:#f0f1f5">
                      @if (p.image_url) {
                        <img [src]="p.image_url" style="width:100%;height:100%;object-fit:cover" alt="">
                      } @else {
                        <i class="ri-box-3-line text-muted fs-20"></i>
                      }
                    </div>
                    <div>
                      <div class="fw-semibold fs-14">{{ p.name }}</div>
                      <div class="text-muted fs-12">ID #{{ p.id }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="fw-medium fs-13">{{ p.vendor_name || '—' }}</div>
                  <div class="text-muted fs-12">{{ p.shop_name || p.vendor_email || '—' }}</div>
                </td>
                <td>
                  <span class="badge bg-primary-subtle text-primary">{{ p.category_name || '—' }}</span>
                </td>
                <td class="fw-bold text-primary">{{ p.price | number:'1.2-2' }} DT</td>
                <td>{{ p.stock }}</td>
                <td>
                  <span class="badge rounded-pill {{ getStatusClass(p.approval_status) }}">
                    {{ getStatusLabel(p.approval_status) }}
                  </span>
                </td>
                <td class="text-muted fs-12">{{ p.created_at | date:'dd/MM/yyyy' }}</td>
                <td class="text-center">
                  @if (p.approval_status === 'pending') {
                    <div class="d-flex gap-1 justify-content-center">
                      <button class="btn btn-sm btn-success" (click)="approve(p)">
                        <i class="ri-check-line me-1"></i>Approuver
                      </button>
                      <button class="btn btn-sm btn-danger" (click)="reject(p)">
                        <i class="ri-close-line me-1"></i>Rejeter
                      </button>
                    </div>
                  } @else if (p.approval_status === 'approved') {
                    <div class="d-flex gap-1 justify-content-center">
                      <button class="btn btn-sm btn-outline-danger" (click)="reject(p)">
                        <i class="ri-close-line me-1"></i>Rejeter
                      </button>
                    </div>
                  } @else {
                    <div class="d-flex gap-1 justify-content-center">
                      <button class="btn btn-sm btn-outline-success" (click)="approve(p)">
                        <i class="ri-check-line me-1"></i>Approuver
                      </button>
                    </div>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>
</div>
