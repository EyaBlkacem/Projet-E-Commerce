import { Component, OnInit } from '@angular/core';
import { ReviewsService } from 'src/app/core/services/reviews.service';

@Component({
  selector: 'app-my-reviews-user',
  standalone: false,
  template: `
<app-breadcrumbs title="Mes avis" [breadcrumbItems]="breadcrumbItems"></app-breadcrumbs>

<!-- Stats -->
<div class="row g-3 mb-4">
  <div class="col-md-4">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid var(--vz-primary) !important">
      <div class="card-body d-flex align-items-center gap-3">
        <div class="avatar-md rounded-3 bg-primary-subtle d-flex align-items-center justify-content-center">
          <i class="ri-chat-quote-line fs-22 text-primary"></i>
        </div>
        <div>
          <h3 class="mb-0 fw-bold text-primary">{{ items.length }}</h3>
          <p class="mb-0 text-muted fs-13">Avis postés</p>
        </div>
      </div>
    </div>
  </div>
  <div class="col-md-4">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid var(--vz-warning) !important">
      <div class="card-body d-flex align-items-center gap-3">
        <div class="avatar-md rounded-3 bg-warning-subtle d-flex align-items-center justify-content-center">
          <i class="ri-star-fill fs-22 text-warning"></i>
        </div>
        <div>
          <h3 class="mb-0 fw-bold text-warning">{{ avgRating.toFixed(1) }}</h3>
          <p class="mb-0 text-muted fs-13">Note moyenne donnée</p>
        </div>
      </div>
    </div>
  </div>
  <div class="col-md-4">
    <div class="card border-0 shadow-sm h-100" style="border-left:4px solid var(--vz-success) !important">
      <div class="card-body d-flex align-items-center gap-3">
        <div class="avatar-md rounded-3 bg-success-subtle d-flex align-items-center justify-content-center">
          <i class="ri-thumb-up-line fs-22 text-success"></i>
        </div>
        <div>
          <h3 class="mb-0 fw-bold text-success">{{ positive }}</h3>
          <p class="mb-0 text-muted fs-13">Avis positifs (4-5★)</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Filter -->
<div class="card border-0 shadow-sm">
  <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2 py-3">
    <h6 class="mb-0 fw-semibold flex-grow-1">
      <i class="ri-chat-3-line me-2 text-primary"></i>Tous mes avis
    </h6>
    <div class="btn-group btn-group-sm">
      <button class="btn" [class.btn-primary]="filter==='all'" [class.btn-light]="filter!=='all'"
              (click)="setFilter('all')">Tous</button>
      <button class="btn" [class.btn-primary]="filter==='product'" [class.btn-light]="filter!=='product'"
              (click)="setFilter('product')">Produits</button>
      <button class="btn" [class.btn-primary]="filter==='deal'" [class.btn-light]="filter!=='deal'"
              (click)="setFilter('deal')">Deals</button>
      <button class="btn" [class.btn-primary]="filter==='ad'" [class.btn-light]="filter!=='ad'"
              (click)="setFilter('ad')">Annonces</button>
    </div>
  </div>

  <!-- Barre de recherche, tri, pagination (composant partagé) -->
  <div class="card-body pb-0">
    <app-search-pagination-bar
      [(searchInput)]="search"
      searchPlaceholder="Rechercher dans mes avis…"
      [(sortBy)]="sortBy"
      [sortOptions]="sortOptions"
      [currentPage]="currentPage"
      [totalPages]="totalPages"
      [pagesArray]="pagesArray"
      [totalResults]="filtered.length"
      (search)="applyFilter()"
      (clear)="onClearSearch()"
      (sortChange)="applyFilter()"
      (pageChange)="goToPage($event)">
    </app-search-pagination-bar>
  </div>

  <div class="card-body pt-2">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    } @else if (filtered.length === 0) {
      <div class="text-center py-5">
        <i class="ri-chat-off-line display-4 text-muted opacity-50"></i>
        <p class="text-muted mt-2 mb-0">Vous n'avez encore écrit aucun avis.</p>
      </div>
    } @else {
      @for (r of paginatedItems; track r.idReview) {
        <div class="border rounded-3 p-3 mb-3 position-relative">
          <div class="d-flex align-items-start gap-3">
            <div class="avatar-sm rounded-circle"
                 [style.background]="badgeColor(r.targetType)"
                 class="d-flex align-items-center justify-content-center text-white fw-bold">
              <i [class]="badgeIcon(r.targetType)"></i>
            </div>
            <div class="flex-grow-1">
              <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                <span class="badge bg-{{ badgeBg(r.targetType) }}-subtle text-{{ badgeBg(r.targetType) }}">
                  {{ typeLabel(r.targetType) }} #{{ r.targetId }}
                </span>
                <span class="fs-12 text-muted">
                  <i class="ri-calendar-line me-1"></i>{{ formatDate(r.createdAt) }}
                </span>
              </div>
              <div class="mb-2">
                @for (s of getStars(r.rating); track $index) {
                  <i class="ri-star-fill text-warning"></i>
                }
                @for (s of getEmptyStars(r.rating); track $index) {
                  <i class="ri-star-line text-muted"></i>
                }
                <span class="fs-12 text-muted ms-1">{{ r.rating }}/5</span>
              </div>
              <p class="mb-0 fs-14 text-dark">{{ r.comment || '(Sans commentaire)' }}</p>
            </div>
            <button class="btn btn-sm btn-light" (click)="deleteReview(r)" title="Supprimer">
              <i class="ri-delete-bin-line text-danger"></i>
            </button>
          </div>
        </div>
      }
    }
  </div>
</div>
`,
})
export class MyReviewsUserComponent implements OnInit {
  breadcrumbItems = [
    { label: 'Tijara', active: false },
    { label: 'Mes avis', active: true },
  ];

  items: any[] = [];
  filtered: any[] = [];
  loading = true;
  filter: 'all' | 'product' | 'deal' | 'ad' = 'all';

  // ─── Recherche, tri & pagination (via SearchPaginationBarComponent) ───
  search = '';
  sortBy: 'recent' | 'oldest' | 'rating' = 'recent';
  sortOptions = [
    { value: 'recent', label: 'Plus récents' },
    { value: 'oldest', label: 'Plus anciens' },
    { value: 'rating', label: 'Note la plus élevée' },
  ];
  currentPage = 1;
  pageSize = 6;

  get avgRating(): number {
    if (!this.items.length) return 0;
    return this.items.reduce((s, r) => s + (r.rating || 0), 0) / this.items.length;
  }
  get positive(): number {
    return this.items.filter(r => r.rating >= 4).length;
  }

  constructor(private reviewsService: ReviewsService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.reviewsService.getMyReviews().subscribe({
      next: (r: any[]) => {
        this.items = (r || []).map((x: any) => ({
          idReview:   x.idReview   ?? x.IdReview,
          targetType: (x.targetType ?? x.TargetType ?? '').toLowerCase(),
          targetId:   x.targetId   ?? x.TargetId,
          rating:     x.rating     ?? x.Rating ?? 0,
          comment:    x.comment    ?? x.Comment ?? '',
          createdAt:  x.createdAt  ?? x.CreatedAt,
        }));
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.items = []; this.filtered = []; this.loading = false; }
    });
  }

  setFilter(f: 'all' | 'product' | 'deal' | 'ad'): void {
    this.filter = f;
    this.applyFilter();
  }

  applyFilter(): void {
    const s = this.search.trim().toLowerCase();
    let list = this.filter === 'all'
      ? [...this.items]
      : this.items.filter(r => r.targetType === this.filter);

    if (s) {
      list = list.filter(r =>
        (r.comment || '').toLowerCase().includes(s) ||
        String(r.targetId).includes(s)
      );
    }

    switch (this.sortBy) {
      case 'recent': list = list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()); break;
      case 'oldest': list = list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()); break;
      case 'rating': list = list.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
    }

    this.filtered = list;
    this.currentPage = 1;
  }

  onClearSearch(): void {
    this.search = '';
    this.applyFilter();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get paginatedItems(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  deleteReview(r: any): void {
    if (!confirm('Supprimer cet avis ?')) return;
    this.reviewsService.deleteReviewGeneric(r.idReview).subscribe({
      next: () => {
        this.items = this.items.filter(x => x.idReview !== r.idReview);
        this.applyFilter();
      },
      error: () => alert('Suppression impossible.')
    });
  }

  getStars(r: number): number[]      { return Array(Math.min(5, Math.floor(r))).fill(0); }
  getEmptyStars(r: number): number[] { return Array(5 - Math.min(5, Math.floor(r))).fill(0); }

  formatDate(d: string): string {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  typeLabel(t: string): string {
    return t === 'product' ? 'Produit' : t === 'deal' ? 'Deal' : t === 'ad' ? 'Annonce' : t;
  }
  badgeBg(t: string): string {
    return t === 'product' ? 'primary' : t === 'deal' ? 'success' : 'warning';
  }
  badgeIcon(t: string): string {
    return t === 'product' ? 'ri-box-3-line' : t === 'deal' ? 'ri-price-tag-3-line' : 'ri-megaphone-line';
  }
  badgeColor(t: string): string {
    return t === 'product' ? '#405189' : t === 'deal' ? '#0ab39c' : '#f7b84b';
  }
}