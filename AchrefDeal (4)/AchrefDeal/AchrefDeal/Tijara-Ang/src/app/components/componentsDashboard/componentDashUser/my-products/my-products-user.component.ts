import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AnnoncesService } from 'src/app/core/services/annonces.service';
import { CategoriesService } from 'src/app/core/services/categories.service';
import { AssetsService } from 'src/app/core/services/assets.service';

type ViewMode = 'grid' | 'list';
type StatusFilter = '' | 'approved' | 'pending';

@Component({
  selector: 'app-my-products-user',
  standalone: false,
  templateUrl: './my-products-user.component.html',
})
export class MyProductsUserComponent implements OnInit {
  breadcrumbItems = [
    { label: 'Tijara', active: false },
    { label: 'Mes annonces', active: true },
  ];

  paginatedItems: any[] = [];
  loading = true;

  totalItemsCount = 0;
  approvedCount = 0;
  pendingCount = 0;
  totalValue = 0;

  view: ViewMode = 'grid';

  search = '';
  private searchDebounce: any = null;

  sortBy: 'recent' | 'title' | 'priceAsc' | 'priceDesc' = 'recent';
  sortOptions = [
    { value: 'recent', label: 'Plus récentes' },
    { value: 'title', label: 'Nom (A→Z)' },
    { value: 'priceAsc', label: 'Prix croissant' },
    { value: 'priceDesc', label: 'Prix décroissant' },
  ];

  currentPage = 1;
  lastPage = 1;
  pageSize = 8;
  totalResults = 0;

  statusFilter: StatusFilter = '';
  filterCategory = '';
  filterIdCateg: number | null = null;
  filterPriceMin: number | null = null;
  filterPriceMax: number | null = null;
  categoryDropdownOpen = false;
  availableCategories: { id: number; name: string }[] = [];

  get activeFiltersCount(): number {
    let count = 0;
    if (this.filterCategory) count++;
    if (this.filterPriceMin != null) count++;
    if (this.filterPriceMax != null) count++;
    if (this.statusFilter) count++;
    return count;
  }

  get totalPages(): number { return this.lastPage; }
  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
  get filtered(): any[] { return this.paginatedItems; }

  get imgBase(): string { return this.assetsService.assetsBaseUrl; }

  private firstImageFilename(raw: any): string | null {
    if (!raw) return null;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed[0];
      } catch { /* pas du JSON, deja un nom de fichier simple */ }
      return raw;
    }
    if (Array.isArray(raw) && raw.length) return raw[0];
    return null;
  }

  resolveImg(raw: string | null | undefined): string {
    if (!raw) return '';
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    let cleanPath = raw.replace(/\\/g, '/');
    if (!cleanPath.includes('/images/')) {
      const parts = cleanPath.split('/');
      const filename = parts.pop();
      cleanPath = parts.length > 0
        ? [...parts, 'images', filename].join('/')
        : ['assets', 'ads', 'images', filename].join('/');
    }
    return cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
  }

  constructor(
    private annoncesService: AnnoncesService,
    private categoriesService: CategoriesService,
    private router: Router,
    private assetsService: AssetsService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.load();
  }

  private loadCategories(): void {
    this.categoriesService.getCategories().subscribe({
      next: (cats: any[]) => {
        this.availableCategories = (cats || []).map((c: any) => ({
          id: c.IdCateg ?? c.id,
          name: c.TitleFr ?? c.TitleEn ?? c.TitleAr ?? 'Sans nom'
        }));
      },
      error: () => { this.availableCategories = []; }
    });
  }

  load(): void {
    this.loading = true;

    const activeParam: 0 | 1 | null =
      this.statusFilter === 'approved' ? 1 :
      this.statusFilter === 'pending'  ? 0 : null;

    this.annoncesService.getMyAnnoncesPaged({
      page: this.currentPage,
      perPage: this.pageSize,
      search: this.search.trim() || undefined,
      idCateg: this.filterIdCateg,
      active: activeParam,
      priceMin: this.filterPriceMin,
      priceMax: this.filterPriceMax
    }).subscribe({
      next: (res: any) => {
        const raw: any[] = res?.data ?? [];
        this.paginatedItems = raw.map(x => ({
          id:        x.IdAd ?? x.id,
          title:     x.TitleAd || 'Sans titre',
          category:  x.category?.TitleCateg || '',
          price:     parseFloat(x.PriceAd || '0') || 0,
          image:     x.image_url || this.firstImageFilename(x.ImageAd),
          status:    x.Active ? 'approved' : 'pending',
          createdAt: x.DatePublication || x.created_at || null,
          features:  Array.isArray(x.values) ? x.values : [],
        }));

        this.currentPage = res?.current_page ?? 1;
        this.lastPage    = res?.last_page ?? 1;
        this.totalResults = res?.total ?? raw.length;

        this.applySortOnCurrentPage();

        this.loading = false;
      },
      error: () => {
        this.paginatedItems = [];
        this.totalResults = 0;
        this.loading = false;
      },
    });
  }

  private applySortOnCurrentPage(): void {
    switch (this.sortBy) {
      case 'title':     this.paginatedItems.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
      case 'priceAsc':  this.paginatedItems.sort((a, b) => a.price - b.price); break;
      case 'priceDesc': this.paginatedItems.sort((a, b) => b.price - a.price); break;
    }
  }

  toggleCategoryDropdown(): void {
    this.categoryDropdownOpen = !this.categoryDropdownOpen;
  }

  selectFilterCategory(cat: { id: number; name: string } | null): void {
    this.filterCategory = cat?.name ?? '';
    this.filterIdCateg = cat?.id ?? null;
    this.categoryDropdownOpen = false;
    this.currentPage = 1;
    this.load();
  }

  resetAdvancedFilters(): void {
    this.filterCategory = '';
    this.filterIdCateg = null;
    this.filterPriceMin = null;
    this.filterPriceMax = null;
    this.statusFilter = '';
    this.currentPage = 1;
    this.load();
  }

  applyFilter(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.currentPage = 1;
      this.load();
    }, 300);
  }

  onClearSearch(): void {
    this.search = '';
    this.currentPage = 1;
    this.load();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.lastPage || page === this.currentPage) return;
    this.currentPage = page;
    this.load();
  }

  goCreate(): void { this.router.navigate(['/users/annonces']); }
  edit(p: any): void { this.router.navigate(['/users/annonces'], { queryParams: { edit: p.id } }); }

  remove(p: any): void {
    if (!confirm('Supprimer "' + p.title + '" ?')) return;
    this.annoncesService.deleteAnnonce(p.id).subscribe({
      next: () => this.load(),
      error: () => alert('Suppression impossible.'),
    });
  }
}


