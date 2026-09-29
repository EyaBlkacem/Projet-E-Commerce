import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';

interface CategoryCount { name: string; count: number; }

@Component({
  selector: 'app-seller-details',
  templateUrl: './seller-details.component.html',
  styleUrls: ['./seller-details.component.scss'],
  standalone: false
})
export class SellerDetailsComponent implements OnInit, OnDestroy {

  breadCrumbItems = [
    { label: 'Boutique', link: '/shop/products' },
    { label: 'Profil vendeur', active: true }
  ];

  vendor: any = null;
  products: any[] = [];
  loading = true;
  error = '';
  cartItems: any[] = [];

  showContactForm = false;
  contactMessage  = '';
  contactSending  = false;
  contactSuccess  = '';
  contactError    = '';
  isFollowing   = false;
  followLoading = false;

  linkCopied = false;

  searchTerm = '';
  private searchSubject = new Subject<string>();

  selectedCategory  = '';
  selectedStatus: 'all' | 'actif' | 'inactif' = 'all';
  minRating         = 0;
  priceMin: number | null = null;
  priceMax: number | null = null;
  sortBy: 'recent' | 'price_asc' | 'price_desc' | 'rating' = 'recent';

  viewMode: 'grid' | 'list' = 'grid';

  currentPage = 1;
  pageSize = 6;

  // ── Affichage des features/values : combien de badges avant "+N" ──
  readonly maxVisibleFeatures = 3;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: TijaraApiService
  ) {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm = term;
      this.currentPage = 1;
    });
  }

  private get cartKey(): string {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
      return u?.id ? `tijara_cart_${u.id}` : 'tijara_cart_guest';
    } catch { return 'tijara_cart_guest'; }
  }

  ngOnInit(): void {
    // 🔒 Accès réservé aux utilisateurs connectés
    if (!this.isLoggedIn) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.error = 'Vendeur introuvable.'; this.loading = false; return; }
    const saved = localStorage.getItem(this.cartKey);
    this.cartItems = saved ? JSON.parse(saved) : [];

    forkJoin({
      user: this.api.getVendorProfile(id).pipe(catchError(() => of(null))),
      products: this.fetchAllPages((p) => this.api.getProducts(p), {}),
      ads: this.fetchAllPages((p) => this.api.getAnnonces(p), {}),
    }).subscribe(({ user, products, ads }) => {
      const rawUser = (user as any)?.data ?? user;

      if (!rawUser) {
        this.error = 'Vendeur introuvable.';
        this.loading = false;
        return;
      }

      this.vendor = this.mapVendor(rawUser);

      const getUserId = (item: any): number | null => {
        const raw = item.IdUser ?? item.id_user ?? null;
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? n : null;
      };

      const ownProducts = products.filter((p: any) => getUserId(p) === id);
      const ownAds = ads.filter((a: any) => getUserId(a) === id);

      this.products = [
        ...ownProducts.map((p: any) => this.mapProduct(p)),
        ...ownAds.map((a: any) => this.mapAd(a)),
      ];

      this.vendor.total_deals = this.products.length;
      this.vendor.active_deals = this.products.filter(p => p.status === 'actif').length;

      this.loading = false;
      this.checkFollowStatus();
    });
  }

  private readonly HARD_PAGE_CAP = 50;

  private fetchAllPages(
    callFactory: (params: any) => Observable<any>,
    baseParams: any
  ): Observable<any[]> {
    return new Observable(subscriber => {
      const collected: any[] = [];
      let currentPage = 1;
      let knownTotal: number | null = null;

      const extractRaw = (r: any): any[] => {
        const isPaginatedShape = !Array.isArray(r) && r && typeof r === 'object' && 'data' in r;
        if (isPaginatedShape) {
          if (typeof r.total === 'number') knownTotal = r.total;
          return r.data || [];
        }
        return Array.isArray(r) ? r : (r?.products || r?.ads || []);
      };

      const fetchNext = () => {
        if (currentPage > this.HARD_PAGE_CAP) { subscriber.next(collected); subscriber.complete(); return; }
        if (knownTotal !== null && collected.length >= knownTotal) { subscriber.next(collected); subscriber.complete(); return; }

        // ✅ CORRIGÉ — meme bug que listing.component.ts : `limit` ignore par
        // le backend (attend `per_page`, plafonne a 50), ce qui retombait
        // sur DEFAULT_PER_PAGE=10 par requete au lieu de 50.
        callFactory({ ...baseParams, page: currentPage, per_page: 50 }).subscribe({
          next: (r: any) => {
            const raw = extractRaw(r);
            if (raw.length === 0) { subscriber.next(collected); subscriber.complete(); return; }

            collected.push(...raw);
            currentPage++;

            if (knownTotal !== null && collected.length >= knownTotal) {
              subscriber.next(collected);
              subscriber.complete();
            } else {
              fetchNext();
            }
          },
          error: () => { subscriber.next(collected); subscriber.complete(); }
        });
      };

      fetchNext();
    });
  }

  ngOnDestroy(): void {
    this.searchSubject.unsubscribe();
  }

  private mapVendor(u: any): any {
    const rawPic = u.ProfilePicture;
    const image = rawPic
      ? (String(rawPic).startsWith('http')
          ? rawPic
          : `${this.api.assetsBaseUrl}/${String(rawPic).replace(/^\/+/, '')}`)
      : null;

    return {
      id: Number(u.IdUser),
      first_name: u.FirstName || '',
      last_name: u.LastName || '',
      display_name: [u.FirstName, u.LastName].filter(Boolean).join(' ').trim() || u.Username || 'Vendeur',
      shop_name: u.ShopName || '',
      phone: u.Phone || u.PhoneNumber || '',
      city: u.City || u.Location || '',
      created_at: u.CreationDate || null,
      is_approved: !!u.IsVerified,
      image,
      avg_rating: 0,
      review_count: 0,
      total_deals: 0,
      active_deals: 0,
      raw: u,
    };
  }

  // ── Mapping Product (Laravel, PascalCase) -> forme attendue par le template ──
  private mapProduct(p: any): any {
    const rawImg = p.ImageProduct ?? p.image;
    const firstImg = Array.isArray(rawImg) ? rawImg[0] : rawImg;
    let image_url: string | null = null;
    if (firstImg) {
      const clean = String(firstImg).replace(/\\/g, '/');
      const filename = clean.split('/').pop();
      image_url = clean.startsWith('http')
        ? clean
        : `${this.api.assetsBaseUrl}/assets/products/images/${filename}`;
    }

    return {
      id: p.IdProduct ?? p.id,
      name: p.TitleProduct || p.title || 'Sans titre',
      price: parseFloat(p.PriceProduct ?? p.price ?? '0') || 0,
      image_url,
      category_name: p.category || p.category_name || '',
      status: (Number(p.Active) === 1) ? 'actif' : 'inactif',
      avg_rating: parseFloat(p.rating || p.avg_rating || '0') || 0,
      review_count: p.review_count || 0,
      created_at: p.CreationDate || p.created_at || null,
      features: Array.isArray(p.features) ? p.features : [],
      raw: p,
      _type: 'product',
    };
  }

  // ── Mapping Ad (Laravel, table `Ads`, modèle confirmé) ──
  // Champs réels : IdAd, TitleAd, PriceAd, ImageAd, DatePublication, Active.
  // Les features passent par la relation values() (many-to-many via
  // AdsFeatureValues) — à condition que getAnnonces() les eager-load
  // côté backend ('values.feature'). Si absent, les badges resteront vides
  // (rien à corriger côté front dans ce cas).
  private mapAd(a: any): any {
    const rawImg = a.ImageAd ?? a.image;
    const firstImg = Array.isArray(rawImg) ? rawImg[0] : rawImg;
    let image_url: string | null = null;
    if (firstImg) {
      const clean = String(firstImg).replace(/\\/g, '/');
      const filename = clean.split('/').pop();
      image_url = clean.startsWith('http')
        ? clean
        : `${this.api.assetsBaseUrl}/assets/products/images/${filename}`;
    }

    return {
      id: a.IdAd,
      name: a.TitleAd || 'Sans titre',
      price: parseFloat(a.PriceAd ?? '0') || 0,
      image_url,
      category_name: a.category || a.category_name || '',
      status: (Number(a.Active) === 1) ? 'actif' : 'inactif',
      avg_rating: 0,
      review_count: 0,
      created_at: a.DatePublication || a.StartDate || null,
      features: Array.isArray(a.values) ? a.values.map((v: any) => ({
        key: v.feature?.name ?? v.NameFeature ?? '',
        value: v.value ?? v.ValueFeature ?? ''
      })) : [],
      raw: a,
      _type: 'ad',
    };
  }

  get vendorInitials(): string {
    if (!this.vendor) return '?';
    return ((this.vendor.first_name?.[0] || '') + (this.vendor.last_name?.[0] || '')).toUpperCase();
  }

  get displayName(): string {
    return this.vendor?.display_name
        || this.vendor?.shop_name
        || `${this.vendor?.first_name || ''} ${this.vendor?.last_name || ''}`.trim();
  }

  get memberSince(): string {
    if (!this.vendor?.created_at) return '';
    return new Date(this.vendor.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
  }

  get isLoggedIn(): boolean {
    return !!localStorage.getItem('currentUser');
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  get categories(): CategoryCount[] {
    const map = new Map<string, number>();
    for (const p of this.products) {
      const cat = p.category_name || 'Autre';
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  get activeFilterChips(): { key: string; label: string }[] {
    const chips: { key: string; label: string }[] = [];
    if (this.searchTerm)          chips.push({ key: 'search',   label: `"${this.searchTerm}"` });
    if (this.selectedCategory)    chips.push({ key: 'category', label: this.selectedCategory });
    if (this.selectedStatus !== 'all')
      chips.push({ key: 'status', label: this.selectedStatus === 'actif' ? 'Active' : 'Inactive' });
    if (this.minRating > 0)       chips.push({ key: 'rating',   label: `${this.minRating}★ et +` });
    if (this.priceMin != null)    chips.push({ key: 'priceMin', label: `Min ${this.priceMin} DT` });
    if (this.priceMax != null)    chips.push({ key: 'priceMax', label: `Max ${this.priceMax} DT` });
    return chips;
  }

  removeChip(key: string): void {
    switch (key) {
      case 'search':   this.searchTerm = ''; break;
      case 'category': this.selectedCategory = ''; break;
      case 'status':   this.selectedStatus = 'all'; break;
      case 'rating':   this.minRating = 0; break;
      case 'priceMin': this.priceMin = null; break;
      case 'priceMax': this.priceMax = null; break;
    }
    this.currentPage = 1;
  }

  resetFilters(): void {
    this.searchTerm       = '';
    this.selectedCategory = '';
    this.selectedStatus   = 'all';
    this.minRating        = 0;
    this.priceMin         = null;
    this.priceMax         = null;
    this.currentPage      = 1;
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  get filteredProducts(): any[] {
    let list = [...this.products];

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.trim().toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.category_name || '').toLowerCase().includes(q) ||
        (Array.isArray(p.features) && p.features.some((f: any) =>
          String(f.value || '').toLowerCase().includes(q)
        ))
      );
    }

    if (this.selectedCategory) {
      list = list.filter(p => (p.category_name || 'Autre') === this.selectedCategory);
    }

    if (this.selectedStatus !== 'all') {
      list = list.filter(p => p.status === this.selectedStatus);
    }

    if (this.minRating > 0) {
      list = list.filter(p => (+p.avg_rating || 0) >= this.minRating);
    }

    if (this.priceMin != null) {
      list = list.filter(p => p.price >= this.priceMin!);
    }
    if (this.priceMax != null) {
      list = list.filter(p => p.price <= this.priceMax!);
    }

    switch (this.sortBy) {
      case 'price_asc':  list.sort((a, b) => a.price - b.price); break;
      case 'price_desc': list.sort((a, b) => b.price - a.price); break;
      case 'rating':     list.sort((a, b) => (+b.avg_rating || 0) - (+a.avg_rating || 0)); break;
      default:           list.sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    return list;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredProducts.length / this.pageSize));
  }

  get paginatedProducts(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredProducts.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 1;
    const pages: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    document.getElementById('products-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
  }

  getStars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  visibleFeatures(product: any): any[] {
    if (!Array.isArray(product.features)) return [];
    return product.features.slice(0, this.maxVisibleFeatures);
  }

  hiddenFeaturesCount(product: any): number {
    if (!Array.isArray(product.features)) return 0;
    return Math.max(0, product.features.length - this.maxVisibleFeatures);
  }

  addToCart(product: any) {
    const existing = this.cartItems.find((i: any) => i.product.id === product.id);
    if (existing) { existing.qty++; } else { this.cartItems.push({ product, qty: 1 }); }
    localStorage.setItem(this.cartKey, JSON.stringify(this.cartItems));
  }

  checkFollowStatus(): void {
    if (!this.isLoggedIn || !this.vendor?.id) return;
    this.api.checkFollow(this.vendor.id).subscribe({
      next: (res: any) => { this.isFollowing = res.following; },
      error: () => {}
    });
  }

  toggleFollow(): void {
    if (!this.isLoggedIn) { this.router.navigate(['/auth/login']); return; }
    this.followLoading = true;
    this.api.toggleFollow(this.vendor.id).subscribe({
      next: (res: any) => { this.isFollowing = res.following; this.followLoading = false; },
      error: () => { this.followLoading = false; }
    });
  }

  // ⚠️ CORRIGÉ — recevait avant seulement l'id et naviguait toujours vers
  // /shop/product-detail, même pour une annonce (Ads), qui n'existe pas dans
  // la table Products côté back → écran vide/erreur pour toute annonce.
  // Reçoit maintenant l'item mappé entier pour transmettre son type via un
  // queryParam, lu ensuite par product-detail.component.ts.
  goDetail(item: any) {
    const type = item?._type === 'ad' ? 'ad' : 'product';
    this.router.navigate(['/shop/product-detail', item.id], { queryParams: { type } });
  }

  copyProfileLink(): void {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.linkCopied = true;
      setTimeout(() => this.linkCopied = false, 2000);
    });
  }

  sendContactMessage(): void {
    if (!this.contactMessage.trim()) return;
    if (!this.isLoggedIn) { this.router.navigate(['/auth/login']); return; }

    this.contactSending = true;
    this.contactError   = '';
    this.api.startConversation({
      vendor_id: this.vendor.id,
      content: this.contactMessage.trim()
    }).subscribe({
      next: () => {
        this.contactSuccess  = 'Message envoyé ! Le vendeur vous répondra bientôt.';
        this.contactMessage  = '';
        this.contactSending  = false;
        this.showContactForm = false;
        setTimeout(() => this.contactSuccess = '', 4000);
      },
      error: () => {
        this.contactError   = 'Impossible d\'envoyer le message.';
        this.contactSending = false;
      }
    });
  }
}

