import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AnnoncesService } from 'src/app/core/services/annonces.service';
import { AssetsService } from 'src/app/core/services/assets.service';
import { BoostPremiumService } from 'src/app/core/services/boost-premium.service';
import { CategoriesService } from 'src/app/core/services/categories.service';
import { DealsService } from 'src/app/core/services/deals.service';
import { PublicCatalogService } from 'src/app/core/services/public-catalog.service';
import { ProductsService } from 'src/app/core/services/products.service';
import { UsersService } from 'src/app/core/services/users.service';
import { WishlistService } from 'src/app/core/services/wishlist.service';
import { CartService } from 'src/app/core/services/cart.service';
import { PrizesService } from 'src/app/core/services/prizes.service';
import { WinnersService } from 'src/app/core/services/winners.service';

export type ListingType = 'annonces' | 'deals' | 'produits' | 'vendeurs' | 'prizes';

interface ItemFeature {
    key: string;
    value: string;
}

interface FeatureFacet {
    key: string;
    options: { value: string; count: number }[];
}

@Component({
    selector: 'app-listing',
    templateUrl: './listing.component.html',
    styleUrls: ['./listing.component.scss'],
    standalone: false
})
export class ListingComponent implements OnInit, OnDestroy {

    type: ListingType = 'annonces';

    paginated: any[] = [];
    categories: any[] = [];
    loading = true;

    private allItemsForCounts: any[] = [];

    search = '';
    selectedCat = '';
    priceMin: number | null = null;
    priceMax: number | null = null;
    sortBy = 'newest';
    viewMode: 'grid' | 'list' = 'grid';

    categoryDropdownOpen = false;

    featureFilters: Record<string, string[]> = {};
    facetOpen: Record<string, boolean> = {};
    featureFacets: FeatureFacet[] = [];

    page = 1;
    pageSize = 12;
    total = 0;

    showLoginToast = false;

    wishlistedProductIds = new Set<number>();
    wishlistedAdIds = new Set<number>();
    wishlistedDealIds = new Set<number>();

    likedProductIds = new Set<number>();
    likedDealIds = new Set<number>();
    likedAdIds = new Set<number>();
    likingInProgress = new Set<string>();

    private adLikeIds = new Map<number, number>();

    private dealLikeIds = new Map<number, number>();
    private productLikeIds = new Map<number, number>();

    now: number = Date.now();
    private countdownTimer: any = null;

    private readonly PROD_COLORS = ['#6691e7', '#f06548', '#0ab39c', '#405189', '#f7b84b', '#299cdb'];

    private readonly HARD_PAGE_CAP = 50;

    private vendorsRawCache: any[] | null = null;

    // ─── Ajouts pour l'option "Sidebar" des packs de boost ──────────────
    boostedSidebarItems: any[] = [];
    boostedSidebarLoading = false;

    configs: Record<ListingType, { title: string; icon: string; apiMethod: string; emptyMsg: string;priceLbl: string }> = {
        annonces: { title: 'Toutes les annonces', icon: 'ri-megaphone-line', apiMethod: 'annonces', emptyMsg: 'Aucune annonce disponible.', priceLbl: 'Prix' },
        deals: { title: 'Tous les deals', icon: 'ri-flashlight-line', apiMethod: 'deals', emptyMsg: 'Aucun deal disponible.', priceLbl: 'Prix' },
        produits: { title: 'Tous les produits', icon: 'ri-box-3-line', apiMethod: 'products', emptyMsg: 'Aucun produit disponible.', priceLbl: 'Prix' },
        vendeurs: { title: 'Tous les vendeurs', icon: 'ri-store-2-line', apiMethod: 'vendors', emptyMsg: 'Aucun vendeur disponible.', priceLbl: '' },
        prizes: { title: 'Vitrine des gagnants', icon: 'ri-trophy-line', apiMethod: 'prizes', emptyMsg: 'Aucun gagnant pour le moment.', priceLbl: '' },
    };

    private readonly QUERY_PARAM_MAP: Partial<Record<ListingType, { cat: string; priceMin: string; priceMax: string }>> = {
        annonces: { cat: 'IdCateg',    priceMin: 'PriceAd_min',     priceMax: 'PriceAd_max' },
        produits: { cat: 'IdCateorie', priceMin: 'PriceProduct_min', priceMax: 'PriceProduct_max' },
        deals:    { cat: 'idCateg',    priceMin: 'price_min',       priceMax: 'price_max' },
    };

    get config() { return this.configs[this.type]; }
    get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
    get pages(): number[] {
        const t = this.totalPages;
        const p = this.page;
        const range: number[] = [];
        for (let i = Math.max(1, p - 2); i <= Math.min(t, p + 2); i++) range.push(i);
        return range;
    }

    get isLoggedIn(): boolean {
        try { return !!localStorage.getItem('currentUser'); } catch { return false; }
    }

    get selectedCategoryName(): string {
        if (!this.selectedCat) return 'Toutes';
        const cat = this.categories.find(c => String(c.id) === String(this.selectedCat));
        return cat ? (cat.name || cat.name_fr || cat.title) : 'Toutes';
    }

    getCategoryCount(catId: string): number {
        if (!catId) return this.allItemsForCounts.length;
        return this.allItemsForCounts.filter(x => String(x.categoryId) === String(catId) || x.category === catId).length;
    }

    get activeFeatureFilterKeys(): string[] {
        return Object.keys(this.featureFilters).filter(k => Array.isArray(this.featureFilters[k]) &&this.featureFilters[k].length > 0);
    }

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private annoncesService: AnnoncesService,
        private assetsService: AssetsService,
        private boostService: BoostPremiumService,
        private categoriesService: CategoriesService,
        private dealsService: DealsService,
        private productsService: ProductsService,
        private publicCatalogService: PublicCatalogService,
        private usersService: UsersService,
        private wishlistService: WishlistService,
        private cartService: CartService,
        private prizesService: PrizesService,
        private winnersService: WinnersService
    ) {}

    ngOnInit(): void {
        this.route.data.subscribe(d => { if (d['listingType']) this.type = d['listingType']; });

        this.route.queryParams.subscribe(q => {
            this.search      = q['q']    || '';
            this.selectedCat = q['cat']  || '';
            this.sortBy      = q['sort'] || 'newest';
            this.page        = q['page'] ? (+q['page'] || 1) : 1;

            if (q['feature']) {
                this.facetOpen[q['feature']] = true;
            }

            this.loadItems();
            this.loadFacets();
        });

        this.loadCategories();
        this.loadCountsData();
        this.loadWishlistState();
        this.loadLikedState();

        if (this.type === 'deals') {
            this.startCountdownClock();
        }
    }

    ngOnDestroy(): void {
        this.stopCountdownClock();
    }

    private startCountdownClock(): void {
        if (this.countdownTimer) return;
        this.countdownTimer = setInterval(() => { this.now = Date.now(); }, 1000);
    }

    private stopCountdownClock(): void {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
    }

    private loadCategories(): void {
        this.categoriesService.getCategories().subscribe({
            next: (r: any) => {
                const raw: any[] = Array.isArray(r) ? r : (r?.data || r?.categories || []);
                this.categories = raw.map((c: any) => ({
                    id: c.IdCateg ?? c.id,
                    name: c.TitleFr || c.TitleEn || c.TitleAr || c.name || 'Sans nom',
                    raw: c,
                }));
            },
            error: () => { this.categories = []; }
        });
    }

    private loadWishlistState(): void {
        if (!this.isLoggedIn) return;

        if (this.type === 'produits') {
            this.wishlistService.getWishlistProducts().subscribe({
                next: (res: any) => {
                    const data: any[] = Array.isArray(res) ? res : (res?.data || []);
                    this.wishlistedProductIds = new Set(data.map((item: any) => item.targetId ?? item.IdProduct ?? item.id));
                },
                error: () => { this.wishlistedProductIds = new Set(); }
            });
        } else if (this.type === 'annonces') {
            this.wishlistService.getWishlistAds().subscribe({
                next: (res: any) => {
                    const data: any[] = Array.isArray(res) ? res : (res?.data || []);
                    this.wishlistedAdIds = new Set(data.map((item: any) => item.targetId ?? item.IdAd ?? item.id));
                },
                error: () => { this.wishlistedAdIds = new Set(); }
            });
        } else if (this.type === 'deals') {
            this.wishlistService.getWishlistDeals().subscribe({
                next: (res: any) => {
                    const data: any[] = Array.isArray(res) ? res : (res?.data || []);
                    this.wishlistedDealIds = new Set(data.map((item: any) => item.targetId ?? item.IdDeal ?? item.id));
                },
                error: () => { this.wishlistedDealIds = new Set(); }
            });
        }
    }

    private loadLikedState(): void {
        if (!this.isLoggedIn) return;

        if (this.type === 'annonces') {
            this.annoncesService.getMyAdLikes().subscribe({
                next: (res: any) => {
                    const data: any[] = Array.isArray(res) ? res : (res?.data || []);
                    this.likedAdIds = new Set(data.map((l: any) => l.IdAd));
                    this.adLikeIds = new Map(data.map((l: any) => [l.IdAd, l.IdLike]));
                },
                error: () => { this.likedAdIds = new Set(); }
            });
        } else if (this.type === 'produits') {
      
            this.likedProductIds = new Set();
        } else if (this.type === 'deals') {
         
            this.likedDealIds = new Set();
        }
    }

    isProductWishlisted(id: number): boolean {
        return this.wishlistedProductIds.has(id);
    }

    toggleProductWishlist(item: any, event: Event): void {
        event.stopPropagation();
        if (!this.isLoggedIn) {
            this.showLoginToast = true;
            setTimeout(() => this.showLoginToast = false, 4000);
            return;
        }
        if (this.wishlistedProductIds.has(item.id)) {
            this.wishlistService.removeFromWishlist('products', item.id).subscribe({
                next: () => { this.wishlistedProductIds.delete(item.id); },
                error: (e: any) => { console.error('removeFromWishlist(products) failed', e); }
            });
        } else {
            this.wishlistService.addToWishlist('products', item.id).subscribe({
                next: () => { this.wishlistedProductIds.add(item.id); },
                error: (e: any) => { console.error('addToWishlist(products) failed', e); }
            });
        }
    }

    isAdWishlisted(id: number): boolean {
        return this.wishlistedAdIds.has(id);
    }

    toggleAdWishlist(item: any, event: Event): void {
        event.stopPropagation();
        if (!this.isLoggedIn) {
            this.showLoginToast = true;
            setTimeout(() => this.showLoginToast = false, 4000);
            return;
        }
        if (this.wishlistedAdIds.has(item.id)) {
            this.wishlistService.removeFromWishlist('ads', item.id).subscribe({
                next: () => { this.wishlistedAdIds.delete(item.id); },
                error: (e: any) => { console.error('removeFromWishlist(ads) failed', e); }
            });
        } else {
            this.wishlistService.addToWishlist('ads', item.id).subscribe({
                next: () => { this.wishlistedAdIds.add(item.id); },
                error: (e: any) => { console.error('addToWishlist(ads) failed', e); }
            });
        }
    }

    isWishlisted(item: any): boolean {
        if (this.type === 'produits') return this.isProductWishlisted(item.id);
        if (this.type === 'annonces') return this.isAdWishlisted(item.id);
        if (this.type === 'deals') return this.wishlistedDealIds.has(item.id);
        return false;
    }

    toggleWishlist(item: any, event: Event): void {
        if (this.type === 'produits') { this.toggleProductWishlist(item, event); return; }
        if (this.type === 'annonces') { this.toggleAdWishlist(item, event); return; }
        if (this.type === 'deals') { this.toggleDealWishlist(item, event); }
    }

    private toggleDealWishlist(item: any, event: Event): void {
        event.stopPropagation();
        if (!this.isLoggedIn) {
            this.showLoginToast = true;
            setTimeout(() => this.showLoginToast = false, 4000);
            return;
        }
        if (this.wishlistedDealIds.has(item.id)) {
            this.wishlistService.removeFromWishlist('deals', item.id).subscribe({
                next: () => { this.wishlistedDealIds.delete(item.id); },
                error: (e: any) => { console.error('removeFromWishlist(deals) failed', e); }
            });
        } else {
            this.wishlistService.addToWishlist('deals', item.id).subscribe({
                next: () => { this.wishlistedDealIds.add(item.id); },
                error: (e: any) => { console.error('addToWishlist(deals) failed', e); }
            });
        }
    }

    isProductLiked(id: number): boolean {
        return this.likedProductIds.has(id);
    }

    isLiking(kind: 'product' | 'deal' | 'ad', id: number): boolean {
        return this.likingInProgress.has(`${kind}:${id}`);
    }

    toggleProductLikeAction(item: any, event: Event): void {
        event.stopPropagation();
        if (!this.isLoggedIn) {
            this.showLoginToast = true;
            setTimeout(() => this.showLoginToast = false, 4000);
            return;
        }
        const key = `product:${item.id}`;
        if (this.likingInProgress.has(key)) return;
        this.likingInProgress.add(key);

        if (this.likedProductIds.has(item.id)) {
            const likeId = this.productLikeIds.get(item.id);
            if (!likeId) {
                this.likingInProgress.delete(key);
                return;
            }
            this.productsService.removeProductLike(likeId).subscribe({
                next: () => {
                    this.likedProductIds.delete(item.id);
                    this.productLikeIds.delete(item.id);
                    item.itemLikes = Math.max(0, (item.itemLikes || 0) - 1);
                },
                error: (e: any) => { console.error('removeProductLike failed', e); },
                complete: () => { this.likingInProgress.delete(key); }
            });
        } else {
            this.productsService.addProductLike(item.id).subscribe({
                next: (res: any) => {
                    const likeId = res?.data?.IdLike ?? null;
                    this.likedProductIds.add(item.id);
                    if (likeId) this.productLikeIds.set(item.id, likeId);
                    item.itemLikes = (item.itemLikes || 0) + 1;
                },
                error: (e: any) => {
                    if (e?.status === 409) {
                        this.likedProductIds.add(item.id);
                    } else {
                        console.error('addProductLike failed', e);
                    }
                },
                complete: () => { this.likingInProgress.delete(key); }
            });
        }
    }

    isDealLiked(id: number): boolean {
        return this.likedDealIds.has(id);
    }

    toggleDealLikeAction(item: any, event: Event): void {
        event.stopPropagation();
        if (!this.isLoggedIn) {
            this.showLoginToast = true;
            setTimeout(() => this.showLoginToast = false, 4000);
            return;
        }
        const key = `deal:${item.id}`;
        if (this.likingInProgress.has(key)) return;
        this.likingInProgress.add(key);

        if (this.likedDealIds.has(item.id)) {
            const likeId = this.dealLikeIds.get(item.id);
            if (!likeId) {
                this.likingInProgress.delete(key);
                return;
            }
            this.dealsService.removeDealLike(likeId).subscribe({
                next: () => {
                    this.likedDealIds.delete(item.id);
                    this.dealLikeIds.delete(item.id);
                    item.dealLikes = Math.max(0, (item.dealLikes || 0) - 1);
                },
                error: (e: any) => { console.error('removeDealLike failed', e); },
                complete: () => { this.likingInProgress.delete(key); }
            });
        } else {
            this.dealsService.addDealLike(item.id).subscribe({
                next: (res: any) => {
                    const likeId = res?.data?.IdLike ?? null;
                    this.likedDealIds.add(item.id);
                    if (likeId) this.dealLikeIds.set(item.id, likeId);
                    item.dealLikes = (item.dealLikes || 0) + 1;
                },
                error: (e: any) => {
                    if (e?.status === 409) {
                        this.likedDealIds.add(item.id);
                    } else {
                        console.error('addDealLike failed', e);
                    }
                },
                complete: () => { this.likingInProgress.delete(key); }
            });
        }
    }

    isAdLiked(id: number): boolean {
        return this.likedAdIds.has(id);
    }

    toggleAdLikeAction(item: any, event: Event): void {
        event.stopPropagation();
        if (!this.isLoggedIn) {
            this.showLoginToast = true;
            setTimeout(() => this.showLoginToast = false, 4000);
            return;
        }
        const key = `ad:${item.id}`;
        if (this.likingInProgress.has(key)) return;
        this.likingInProgress.add(key);

        this.annoncesService.toggleLike(item.id).subscribe({
            next: (r: any) => {
                const liked = r?.liked ?? !this.likedAdIds.has(item.id);
                if (liked) {
                    this.likedAdIds.add(item.id);
                    item.itemLikes = (item.itemLikes || 0) + 1;
                } else {
                    this.likedAdIds.delete(item.id);
                    this.adLikeIds.delete(item.id);
                    item.itemLikes = Math.max(0, (item.itemLikes || 0) - 1);
                }
            },
            error: (e: any) => { console.error('toggleLike(ad) failed', e); },
            complete: () => { this.likingInProgress.delete(key); }
        });
    }

    isLiked(item: any): boolean {
        if (this.type === 'deals') return this.isDealLiked(item.id);
        if (this.type === 'produits') return this.isProductLiked(item.id);
        if (this.type === 'annonces') return this.isAdLiked(item.id);
        return false;
    }

    toggleLikeAction(item: any, event: Event): void {
        if (this.type === 'deals') { this.toggleDealLikeAction(item, event); return; }
        if (this.type === 'produits') { this.toggleProductLikeAction(item, event); return; }
        if (this.type === 'annonces') { this.toggleAdLikeAction(item, event); return; }
    }

    isLikingCurrent(item: any): boolean {
        if (this.type === 'deals') return this.isLiking('deal', item.id);
        if (this.type === 'produits') return this.isLiking('product', item.id);
        if (this.type === 'annonces') return this.isLiking('ad', item.id);
        return false;
    }

    getLikeCount(item: any): number {
        return this.type === 'deals' ? (item.dealLikes || 0) : (item.itemLikes || 0);
    }

    private enrichWithBoostStatus(items: any[]): void {
        if (this.type !== 'produits' && this.type !== 'annonces') return;
        const ids = items.map(i => i.id).filter(Boolean);
        if (!ids.length) return;
        const kind = this.type === 'produits' ? 'products' : 'ads';
        this.boostService.resolveBoostStatuses(kind, ids).subscribe((statusMap: Record<number, boolean>) => {
            items.forEach(item => { item.isBoosted = !!statusMap[item.id]; });
        });
    }

    // ═══════════════ PRIZE (lot à gagner) attaché à chaque deal ═══════════════
    // FIX — jusqu'ici la grille de deals n'affichait jamais le lot en jeu ni son
    // éventuel gagnant, contrairement à l'espace vendeur. On les récupère ici,
    // deal par deal, et on les attache à l'item mappé.
    private loadPrizesForItems(items: any[]): void {
        if (this.type !== 'deals' || !items.length) return;

        items.forEach(item => {
            item.prize = null;
            item.prizeWinnerName = null;

            this.prizesService.getPrizeForDeal(item.id).subscribe({
                next: (prize: any) => {
                    item.prize = prize;
                    const idPrize = prize?.idPrize ?? prize?.IdPrize;
                    if (idPrize) {
                        this.winnersService.getWinnerForPrize(idPrize).subscribe({
                            next: (winner: any) => {
                                if (winner?.user) {
                                    item.prizeWinnerName = `${winner.user.FirstName ?? ''} ${winner.user.LastName ?? ''}`.trim();
                                }
                            },
                            error: () => {}
                        });
                    }
                },
                error: () => { item.prize = null; item.prizeWinnerName = null; }
            });
        });
    }

    // ─── Résout les items dont le pack de boost inclut l'option "Sidebar" ──
    private loadBoostedSidebarItems(): void {
        if (this.type !== 'produits' && this.type !== 'annonces') {
            this.boostedSidebarItems = [];
            return;
        }
        this.boostedSidebarLoading = true;
        const ids = this.allItemsForCounts.map(i => i.id).filter(Boolean).slice(0, 30);
        if (!ids.length) {
            this.boostedSidebarItems = [];
            this.boostedSidebarLoading = false;
            return;
        }
        const kind = this.type === 'produits' ? 'products' : 'ads';
        this.boostService.resolveBoostStatusesDetailed(kind, ids).subscribe({
            next: (statuses) => {
                this.boostedSidebarItems = this.allItemsForCounts
                    .filter(item => !!(statuses[item.id]?.isBoosted && statuses[item.id]?.boost?.pack?.sideBar))
                    .slice(0, 5);
                this.boostedSidebarLoading = false;
            },
            error: () => {
                this.boostedSidebarItems = [];
                this.boostedSidebarLoading = false;
            }
        });
    }

    private fetchAllPages(
        callFactory: (params: any) => Observable<any>,
        baseParams: any
    ): Promise<any[]> {
        return new Promise((resolve) => {
            const collected: any[] = [];
            let currentPage = 1;
            let knownTotal: number | null = null;

            const extractRaw = (r: any): any[] => {
                const isPaginatedShape = !Array.isArray(r) && r && typeof r === 'object' && 'data' in r;
                if (isPaginatedShape) {
                    if (typeof r.total === 'number') knownTotal = r.total;
                    return r.data || [];
                }
                return Array.isArray(r) ? r : (r?.products || r?.deals || r?.ads || r?.vendors || []);
            };

            const fetchNext = () => {
                if (currentPage > this.HARD_PAGE_CAP) { resolve(collected); return; }
                if (knownTotal !== null && collected.length >= knownTotal) { resolve(collected); return; }

                callFactory({ ...baseParams, page: currentPage, per_page: 50 }).subscribe({
                    next: (r: any) => {
                        const raw = extractRaw(r);
                        if (raw.length === 0) { resolve(collected); return; }

                        collected.push(...raw);
                        currentPage++;

                        if (knownTotal !== null && collected.length >= knownTotal) {
                            resolve(collected);
                        } else {
                            fetchNext();
                        }
                    },
                    error: () => resolve(collected)
                });
            };

            fetchNext();
        });
    }

    private loadCountsData(): void {
        if (this.type === 'vendeurs' || this.type === 'prizes') {
            this.allItemsForCounts = [];
            return;
        }

        const callFactory = (params: any) =>
            this.type === 'annonces' ? this.annoncesService.getAnnonces(params)
            : this.type === 'deals'  ? this.dealsService.getDeals(params)
                                      : this.productsService.getProducts(params);

        this.fetchAllPages(callFactory, {}).then((raw) => {
            this.allItemsForCounts = raw.map((item: any, i: number) => this.mapItem(item, i));
            this.loadBoostedSidebarItems();
        });
    }

    private readonly BACKEND_SORT_MAP: Partial<Record<ListingType, Record<string, [string, string]>>> = {
        annonces: {
            price_asc:  ['PriceAd', 'asc'],
            price_desc: ['PriceAd', 'desc'],
            newest:     ['DatePublication', 'desc'],
            oldest:     ['DatePublication', 'asc'],
        },
        produits: {
            price_asc:  ['PriceProduct', 'asc'],
            price_desc: ['PriceProduct', 'desc'],
            newest:     ['IdProduct', 'desc'],
            oldest:     ['IdProduct', 'asc'],
        },
    };

    private resolveBackendSort(): { sort_by: string; sort_dir: string } | null {
        const mapping = this.BACKEND_SORT_MAP[this.type]?.[this.sortBy];
        return mapping ? { sort_by: mapping[0], sort_dir: mapping[1] } : null;
    }

    private loadItems(): void {
        this.loading = true;

        if (this.type === 'vendeurs') {
            this.loadVendorItems();
            return;
        }

        const hasFeatureFilters = this.activeFeatureFilterKeys.length > 0;

        const backendSort = this.resolveBackendSort();
        const isDefaultSort = this.sortBy === 'newest';
        const needsClientSort = !isDefaultSort && !backendSort;

        const paramNames = this.QUERY_PARAM_MAP[this.type];

        const baseParams: any = {};
        if (paramNames) {
            if (this.selectedCat)      baseParams[paramNames.cat]      = this.selectedCat;
            if (this.priceMin != null) baseParams[paramNames.priceMin] = this.priceMin;
            if (this.priceMax != null) baseParams[paramNames.priceMax] = this.priceMax;
        }
        if (this.search.trim())     baseParams.search   = this.search.trim();
        if (backendSort) {
            baseParams.__sort = backendSort;
        }

        if (this.type === 'prizes') {
            this.publicCatalogService.getPublicPrizes().subscribe({
                next: (r: any) => this.handleLoadedItems(r, false),
                error: () => this.handleLoadError()
            });
            return;
        }

        const callFactory = (params: any) => {
            const { __sort, ...rest } = params;
            const finalParams = __sort ? { ...rest, ...__sort } : rest;

            return this.type === 'annonces' ? this.annoncesService.getAnnonces(finalParams)
                 : this.type === 'deals'    ? this.dealsService.getDeals(finalParams)
                                             : this.productsService.getProducts(finalParams);
        };

        if (hasFeatureFilters || needsClientSort) {
            this.fetchAllPages(callFactory, baseParams).then((raw) => {
                let mapped = raw.map((item: any, i: number) => this.mapItem(item, i));

                if (hasFeatureFilters) {
                    mapped = mapped.filter(item =>
                        this.activeFeatureFilterKeys.every(key =>
                            this.itemMatchesFeatureValues(item, key, this.featureFilters[key] || [])
                        )
                    );
                }

                if (needsClientSort) {
                    mapped = this.applySort(mapped);
                }

                this.total = mapped.length;
                const start = (this.page - 1) * this.pageSize;
                this.paginated = mapped.slice(start, start + this.pageSize);

                this.enrichWithBoostStatus(this.paginated);
                this.loadPrizesForItems(this.paginated);

                this.clampPageIfNeeded();
                this.loading = false;
            });
        } else {
            const params = { ...baseParams, page: this.page, per_page: this.pageSize };
            callFactory(params).subscribe({
                next: (r: any) => this.handleLoadedItems(r, false),
                error: () => this.handleLoadError()
            });
        }
    }

    private applySort(items: any[]): any[] {
        const sorted = [...items];
        switch (this.sortBy) {
            case 'price_asc':
                sorted.sort((a, b) => a.price - b.price);
                break;
            case 'price_desc':
                sorted.sort((a, b) => b.price - a.price);
                break;
            case 'oldest':
                sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                break;
            case 'newest':
                sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                break;
            case 'rating':
                sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            default:
                break;
        }
        return sorted;
    }

    private handleLoadedItems(r: any, hasSearch: boolean): void {
        const isPaginatedShape = !Array.isArray(r) && r && typeof r === 'object' && 'data' in r;
        const raw: any[] = isPaginatedShape
            ? (r.data || [])
            : (Array.isArray(r) ? r : (r?.products || r?.deals || r?.ads || r?.vendors || []));

        const mapped = raw.map((item: any, i: number) => this.mapItem(item, i));

        this.paginated = mapped;
        this.total = isPaginatedShape ? (Number(r.total) || mapped.length) : raw.length;

        this.enrichWithBoostStatus(this.paginated);
        this.loadPrizesForItems(this.paginated);

        this.clampPageIfNeeded();
        this.loading = false;
    }

    private handleLoadError(): void {
        const demo = this.getDemoItems();
        this.total = demo.length;
        const start = (this.page - 1) * this.pageSize;
        this.paginated = demo.slice(start, start + this.pageSize);
        this.loading = false;
    }

    private clampPageIfNeeded(): void {
        const maxPage = Math.max(1, Math.ceil(this.total / this.pageSize));
        if (this.page > maxPage) {
            this.page = maxPage;
            this.loadItems();
        }
    }

    private loadVendorItems(): void {
        if (!this.isLoggedIn) {
            this.handleLoadError();
            return;
        }

        if (this.vendorsRawCache) {
            this.applyVendorFilterAndPaginate(this.vendorsRawCache);
            return;
        }

        Promise.all([
            this.fetchAllPages((p) => this.productsService.getProducts(p), {}),
            this.fetchAllPages((p) => this.annoncesService.getAnnonces(p), {}),
        ]).then(([products, ads]) => {
            const combined = [...products, ...ads];
            const getUserId = (item: any): number | null => {
                const raw = item.IdUser ?? item.id_user ?? null;
                const n = Number(raw);
                return Number.isFinite(n) && n > 0 ? n : null;
            };

            const uniqueIds = Array.from(new Set(
                combined.map(getUserId).filter((id): id is number => id !== null)
            ));

            if (uniqueIds.length === 0) {
                this.handleLoadError();
                return;
            }

            const requests = uniqueIds.map(id =>
                this.usersService.getUserById(id).pipe(catchError(() => of(null)))
            );

            forkJoin(requests).subscribe((results: any[]) => {
                const vendors = results
                    .map((r: any) => r?.data ?? r)
                    .filter((u: any) => u && Number(u.IdRole) === 2 && Number(u.Active) === 1)
                    .map((u: any, i: number) => this.mapVendor(u, combined, i));

                this.vendorsRawCache = vendors;
                this.applyVendorFilterAndPaginate(vendors);
            });
        });
    }

    private applyVendorFilterAndPaginate(vendors: any[]): void {
        const q = this.search.trim().toLowerCase();
        let filtered = vendors;

        if (q) {
            filtered = vendors.filter(v =>
                (v.title || '').toLowerCase().includes(q) ||
                (v.location || '').toLowerCase().includes(q)
            );
        }

        this.total = filtered.length;
        const start = (this.page - 1) * this.pageSize;
        this.paginated = filtered.slice(start, start + this.pageSize);

        this.clampPageIfNeeded();
        this.loading = false;
    }

    private mapVendor(u: any, combinedItems: any[], i: number): any {
        const uid = Number(u.IdUser);
        const productCount = combinedItems.filter(item => {
            const itemUid = Number(item.IdUser ?? item.id_user);
            return itemUid === uid;
        }).length;

        const rawPic = u.ProfilePicture;
        const image = rawPic
            ? (String(rawPic).startsWith('http')
                ? rawPic
                : `${this.assetsService.assetsBaseUrl}/${String(rawPic).replace(/^\/+/, '')}`)
            : null;

        return {
            id: uid,
            title: [u.FirstName, u.LastName].filter(Boolean).join(' ').trim() || u.Username || 'Vendeur',
            description: '',
            price: 0,
            oldPrice: null,
            discount: null,
            image,
            category: '',
            categoryId: null,
            vendor: '',
            location: u.Location || u.City || '',
            date: u.CreationDate || '',
            badge: u.IsBusinessAccount ? 'Entreprise' : null,
            rating: 0,
            reviews: 0,
            bgColor: this.PROD_COLORS[i % this.PROD_COLORS.length],
            isVerified: !!u.IsVerified,
            productCount,
            features: [],
            raw: u,
        };
    }

    private loadFacets(): void {
        if ((this.type !== 'annonces' && this.type !== 'produits') || !this.selectedCat) {
            this.featureFacets = [];
            return;
        }

        this.featureFacets = this.buildFacetsFromLoadedItems();
    }

    private extractId(item: any, i: number): number {
        if (this.type === 'deals')    return item.IdDeal ?? item.id ?? i + 1;
        if (this.type === 'annonces') return item.IdAd ?? item.id ?? i + 1;
        if (this.type === 'produits') return item.IdProduct ?? item.id ?? i + 1;
        return item.id ?? item.IdUser ?? i + 1;
    }

    private mapItem(item: any, i: number): any {
        if (this.type === 'prizes') {
            return {
                id: item.id_prize ?? item.IdPrize ?? item.id ?? i + 1,
                title: item.title ?? item.TitlePrize ?? 'Sans titre',
                description: item.description ?? item.DescriptionPrize ?? '',
                price: 0,
                oldPrice: null,
                discount: null,
                image: this.resolveImage(item),
                category: '',
                categoryId: null,
                vendor: item.winner_name ?? item.WinnerName ?? 'Non attribué',
                location: '',
                date: item.date_prize ?? item.DatePrize ?? '',
                badge: null,
                rating: 0,
                reviews: 0,
                bgColor: this.PROD_COLORS[i % this.PROD_COLORS.length],
                isVerified: false,
                productCount: 0,
                features: [],
                raw: item,
            };
        }

        const price = parseFloat(
            item.PriceAd ?? item.PriceProduct ?? item.priceDeal ?? item.PriceDeal
            ?? item.price ?? item.Price ?? item.deal_price ?? '0'
        ) || 0;

        const rawDiscount = item.discount ?? item.Discount ?? item.DiscountProduct
            ?? item.PromoProduct ?? item.discountDeal ?? item.DiscountDeal ?? null;
        const discount = rawDiscount != null ? parseFloat(rawDiscount) || null : null;

        const rawOldPrice = item.original_price ?? item.OldPriceProduct ?? item.old_price
            ?? item.PriceBeforeDiscount ?? null;
        const oldPrice = rawOldPrice != null ? parseFloat(rawOldPrice) || null : null;

        const rawLikes = item.LikeCount ?? item.likes ?? item.Likes ?? item.LikesCount ?? item.likes_count ?? null;
        const itemLikes = rawLikes != null ? (Number(rawLikes) || 0) : 0;
        const rawViews = item.ViewCount ?? item.viewCount ?? item.views ?? item.Views ?? 0;
        const itemViews = Number(rawViews) || 0;

        const item2: any = {
            id: this.extractId(item, i),
            title: item.TitleAd || item.TitleProduct || item.TitleDeal || item.titleDeal
                   || item.title || item.name || item.username || item.shop_name || 'Sans titre',
            description: item.DescriptionAd || item.DescriptionProduct || item.DescriptionDeal
                   || item.descriptionDeal || item.description || item.bio || '',
            price,
            oldPrice,
            discount,
            itemLikes,
            itemViews,
            image: this.resolveImage(item),
            category: item.category || item.category_name || '',
            categoryId: item.IdCateg ?? item.idCateg ?? item.IdCateorie ?? item.id_categ ?? item.category_id ?? null,
            vendor: item.vendor_name || item.shop_name || item.username || '',
            location: item.LocationAd || item.city || item.location || '',
            date: item.DatePublication || item.created_at || item.date_publication || item.CreationDate || '',
            badge: item.is_boost ? 'Boost' : discount ? `-${Math.round(discount)}%` : null,
            rating: parseFloat(item.rating || item.avg_rating || '0') || 0,
            reviews: item.review_count || 0,
            bgColor: this.PROD_COLORS[i % this.PROD_COLORS.length],
            isVerified: item.is_verified || item.IsVerified || false,
            productCount: item.product_count || 0,
            features: this.toFeatures(item.values ?? item.features ?? item.Features ?? item.attributes ?? item.featureValues),
            raw: item,
        };

        if (this.type === 'deals') {
            item2.dealQuantity  = Number(item.quantity ?? item.Quantity ?? 0) || 0;
            item2.dealTotal     = Number(item.TotalCount ?? item.totalCount ?? 0) || 0;
            item2.dealDateEnd   = item.dateEnd ?? item.DateEnd ?? item.date_end ?? null;
            item2.dealDateStart = item.startDate ?? item.StartDate ?? item.date_start ?? null;
            item2.dealLikes     = Number(item.LikeCount ?? item.likes ?? item.Likes ?? 0) || 0;
            item2.prize         = null;
            item2.prizeWinnerName = null;
        }

        return item2;
    }

    // FIX — pour les deals, on lisait un nom de fichier deviné à partir de
    // l'id ("deal_{id}.jpg"), qui ne correspond jamais au nom réellement
    // stocké côté backend (généré via uniqid('deal_') + extension d'origine).
    // On lit désormais le vrai champ imageDeal / image_url renvoyé par l'API,
    // avec un garde-fou pour les data URI ou URLs absolues déjà complètes.
    private resolveImage(item: any): string | null {
        if (this.type === 'deals') {
            if (item.image_url) return item.image_url;

            const rawImage = item.imageDeal ?? item.ImageDeal;
            if (!rawImage) return null;

            const value = String(rawImage);
            if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) {
                return value;
            }
            return `${this.assetsService.assetsBaseUrl}/assets/deals/${value}`;
        }

        let source = item.ImageAd ?? item.ImageProduct
            ?? item.ImagePrize ?? item.image ?? item.image_url ?? item.profile_picture;

        if (typeof source === 'string' && source.trim().startsWith('[')) {
            try {
                const parsed = JSON.parse(source);
                if (Array.isArray(parsed)) source = parsed;
            } catch {
            }
        }

        const raw = Array.isArray(source) ? source[0] : source;

        if (!raw) return null;

        const cleanPath = String(raw).replace(/\\/g, '/');

        if (cleanPath.startsWith('http')) {
            return cleanPath;
        }

        const filename = cleanPath.split('/').pop();

        // FIX — le backend PrizesController sert les images sur /assets/prizes/
        // (pas de sous-dossier "images"), à la différence de ce qui était supposé.
        const folder = this.type === 'annonces' ? 'assets/ads/images'
                     : this.type === 'produits' ? 'assets/products/images'
                     : this.type === 'prizes'   ? 'assets/prizes'
                     : null;

        return folder ? `${this.assetsService.assetsBaseUrl}/${folder}/${filename}` : (filename ?? null);
    }

    private toFeatures(source: unknown): ItemFeature[] {
        let value = source;
        if (typeof value === 'string') {
            try { value = JSON.parse(value); } catch { return []; }
        }

        const entries = Array.isArray(value)
            ? value
            : value && typeof value === 'object'
                ? Object.entries(value as Record<string, unknown>).map(([key, featureValue]) => ({ key, value: featureValue }))
                : [];

        return entries
            .map((entry: any) => ({
                key: String(entry?.feature?.TitleFeature ?? entry?.key ?? entry?.name ?? entry?.label ?? entry?.featureKey ?? '').trim(),
                value: String(entry?.ValueFeature ?? entry?.value ?? entry?.featureValue ?? entry?.val ?? '').trim(),
            }))
            .filter((feature: ItemFeature) => !!feature.key && !!feature.value);
    }

    getDealProgressPct(item: any): number {
        const total = item.dealTotal || 0;
        if (total <= 0) return 0;
        const pct = (item.dealQuantity / total) * 100;
        return Math.max(0, Math.min(100, Math.round(pct)));
    }

    getDealProgressLabel(item: any): string {
        return `${item.dealQuantity ?? 0}/${item.dealTotal ?? 0}`;
    }

    isDealSoldOut(item: any): boolean {
        return item.dealTotal > 0 && item.dealQuantity >= item.dealTotal;
    }

    isDealExpired(item: any): boolean {
        if (!item.dealDateEnd) return false;
        const end = new Date(item.dealDateEnd).getTime();
        return !isNaN(end) && this.now >= end;
    }

    getDealCountdown(item: any): string {
        if (!item.dealDateEnd) return '';
        const end = new Date(item.dealDateEnd).getTime();
        if (isNaN(end)) return '';

        const diff = end - this.now;
        if (diff <= 0) return 'Terminé';

        const totalSeconds = Math.floor(diff / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (n: number) => String(n).padStart(2, '0');

        if (days > 0) return `${days}j ${pad(hours)}h ${pad(minutes)}m`;
        if (hours > 0) return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
        return `${pad(minutes)}m ${pad(seconds)}s`;
    }

    getDealTimeParts(item: any): { days: string; hours: string; minutes: string; seconds: string } {
        const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');
        if (!item.dealDateEnd) return { days: '00', hours: '00', minutes: '00', seconds: '00' };

        const end = new Date(item.dealDateEnd).getTime();
        if (isNaN(end)) return { days: '00', hours: '00', minutes: '00', seconds: '00' };

        const diff = Math.max(0, end - this.now);
        const totalSeconds = Math.floor(diff / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return { days: pad(days), hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) };
    }

    isDealUrgent(item: any): boolean {
        if (!item.dealDateEnd || this.isDealExpired(item)) return false;
        const end = new Date(item.dealDateEnd).getTime();
        if (isNaN(end)) return false;
        return (end - this.now) <= 24 * 3600 * 1000; 
    }

    toggleCategoryDropdown(): void {
        this.categoryDropdownOpen = !this.categoryDropdownOpen;
    }

    closeCategoryDropdown(): void {
        this.categoryDropdownOpen = false;
    }

    selectCategory(catId: string): void {
        this.categoryDropdownOpen = false;
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { cat: catId || null, page: null },
            queryParamsHandling: 'merge',
        });
    }

    toggleFacet(key: string): void {
        this.facetOpen[key] = this.facetOpen[key] === false ? true : false;
    }

    clearFeatureFilter(key: string): void {
        delete this.featureFilters[key];
        this.page = 1;
        this.loadItems();
    }

    private normalizeKey(value: string): string {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
    }

    private itemsForFacetCounts(excludedFeatureKey?: string): any[] {
        return this.allItemsForCounts.filter(item => {
            if (this.selectedCat && String(item.categoryId) !== String(this.selectedCat) && String(item.category) !== String(this.selectedCat)) {
                return false;
            }
            if (this.priceMin != null && item.price < this.priceMin) return false;
            if (this.priceMax != null && item.price > this.priceMax) return false;
            const q = this.search.trim().toLowerCase();
            if (q && !(item.title + item.description + item.category + item.vendor).toLowerCase().includes(q)) {
                return false;
            }

            return this.activeFeatureFilterKeys
                .filter(key => this.normalizeKey(key) !== this.normalizeKey(excludedFeatureKey || ''))
                .every(key => this.itemMatchesFeatureValues(item, key, this.featureFilters[key] || []));
        });
    }

    private buildFacetsFromLoadedItems(): FeatureFacet[] {
        const labels = new Map<string, string>();
        this.itemsForFacetCounts().forEach(item => {
            (item.features as ItemFeature[]).forEach(feature => {
                const normalized = this.normalizeKey(feature.key);
                if (normalized && !labels.has(normalized)) labels.set(normalized, feature.key);
            });
        });

        return Array.from(labels.entries())
            .map(([normalizedKey, key]) => {
                const options = new Map<string, number>();
                this.itemsForFacetCounts(key).forEach(item => {
                    (item.features as ItemFeature[])
                        .filter(feature => this.normalizeKey(feature.key) === normalizedKey)
                        .forEach(feature => options.set(feature.value, (options.get(feature.value) || 0) + 1));
                });
                return {
                    key,
                    options: Array.from(options.entries())
                        .map(([value, count]) => ({ value, count }))
                        .sort((a, b) => a.value.localeCompare(b.value, 'fr', { numeric: true })),
                };
            })
            .filter(facet => facet.options.length > 0)
            .sort((a, b) => a.key.localeCompare(b.key, 'fr', { numeric: true }));
    }

    private itemMatchesFeatureValues(item: any, key: string, selectedValues: string[]): boolean {
        if (!selectedValues.length) return true;
        const matchingValues = (item.features as ItemFeature[])
            .filter(feature => this.normalizeKey(feature.key) === this.normalizeKey(key))
            .map(feature => feature.value);

        return selectedValues.some(value => matchingValues.includes(value));
    }

    isFeatureValueSelected(key: string, value: string): boolean {
        return (this.featureFilters[key] || []).includes(value);
    }

    toggleFeatureValue(key: string, value: string): void {
        const arr = [...(this.featureFilters[key] || [])];
        const idx = arr.indexOf(value);
        if (idx > -1) {
            arr.splice(idx, 1);
        } else {
            arr.push(value);
        }

        if (arr.length === 0) {
            delete this.featureFilters[key];
        } else {
            this.featureFilters[key] = arr;
        }

        this.page = 1;
        this.loadItems();
    }

    applyFilters(): void {
        this.page = 1;
        this.loadItems();
    }

    goPage(p: number): void {
        if (p < 1 || p > this.totalPages || p === this.page) return;
        this.page = p;
        this.loadItems();
        window.scrollTo({ top: 200, behavior: 'smooth' });
    }

    resetFilters(): void {
        this.search = '';
        this.priceMin = null;
        this.priceMax = null;
        this.sortBy = 'newest';
        this.featureFilters = {};
        this.facetOpen = {};
        this.categoryDropdownOpen = false;
        this.vendorsRawCache = null;

        this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    }

    goDetail(item: any): void {
        if (this.type === 'vendeurs') {
            if (!this.isLoggedIn) {
                this.router.navigate(['/auth/login'], { queryParams: { returnUrl: `/shop/seller-details/${item.id}` } });
                return;
            }
            this.router.navigate(['/shop/seller-details', item.id]);
            return;
        }
        this.router.navigate([`/landing/${this.type}/${item.id}`]);
    }

    addToCart(item: any): void {
        if (!this.isLoggedIn) {
            this.showLoginToast = true;
            setTimeout(() => this.showLoginToast = false, 4000);
        } else {
            this.cartService.add(item);
        }
    }

    formatPrice(p: number): string {
        return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(p);
    }

    getStars(r: number): number[] {
        return Array(Math.min(5, Math.floor(r))).fill(0);
    }

    formatDate(d: string): string {
        if (!d) return '';
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return d;
        const diff = (Date.now() - dt.getTime()) / 1000;
        if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
        if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
        return dt.toLocaleDateString('fr-FR');
    }

    private getDemoItems(): any[] {
        if (this.type === 'vendeurs') {
            return Array.from({ length: 12 }, (_, i) => ({
                id: i + 1,
                title: `Boutique ${['TechShop', 'FashionHub', 'DecoStore', 'MobilePro', 'SportZone'][i % 5]}`,
                description: 'Boutique partenaire certifiee Tijara.',
                price: 0, oldPrice: null, discount: null, image: null,
                category: '', categoryId: null, vendor: '',
                location: ['Tunis', 'Sfax', 'Sousse'][i % 3],
                date: new Date(Date.now() - i * 86400000 * 5).toISOString(),
                badge: i % 3 === 0 ? 'Verifie' : null,
                rating: 3.5 + (i % 15) / 10, reviews: 10 + i * 7,
                bgColor: this.PROD_COLORS[i % this.PROD_COLORS.length],
                isVerified: i % 2 === 0, productCount: 12 + i * 3,
                features: [], raw: {},
            }));
        }

        if (this.type === 'prizes') {
            return Array.from({ length: 8 }, (_, i) => ({
                id: i + 1,
                title: `Lot ${['iPhone 15', "Bon d'achat 500 DT", 'PS5', 'Weekend Djerba', 'Trottinette electrique', 'Casque Sony', 'Smartwatch', 'Panier gourmand'][i % 8]}`,
                description: 'Lot remporte par un membre de la communaute Tijara.',
                price: 0, oldPrice: null, discount: null, image: null,
                category: '', categoryId: null,
                vendor: ['Ahmed B.', 'Sarra K.', 'Non attribue', 'Mehdi T.'][i % 4],
                location: '',
                date: new Date(Date.now() - i * 86400000 * 3).toISOString(),
                badge: null, rating: 0, reviews: 0,
                bgColor: this.PROD_COLORS[i % this.PROD_COLORS.length],
                isVerified: false, productCount: 0, features: [], raw: {},
            }));
        }

        const types: any = {
            annonces: [
                { title: 'Appartement S+2 a vendre', price: 85000, cat: 'Immobilier' },
                { title: 'iPhone 14 Pro Max', price: 1200, cat: 'Electronique' },
                { title: 'Toyota Corolla 2019', price: 25000, cat: 'Voitures' },
                { title: 'Cours de langue arabe', price: 15, cat: 'Services' },
                { title: 'Canape 3 places cuir', price: 650, cat: 'Maison' },
                { title: 'MacBook Pro M2', price: 1800, cat: 'Electronique' },
                { title: 'Location studio meuble', price: 300, cat: 'Immobilier' },
                { title: 'VTT 27 vitesses', price: 350, cat: 'Sports' },
                { title: 'Chiot Berger Allemand', price: 500, cat: 'Animaux' },
                { title: 'Machine a laver Samsung', price: 420, cat: 'Electromenager' },
                { title: 'Terrain 200m2 Sousse', price: 45000, cat: 'Immobilier' },
                { title: 'Refrigerateur double portes', price: 380, cat: 'Electromenager' },
            ],
            deals: [
                { title: '-50% Nike Air Max', price: 90, cat: 'Mode', discount: '50' },
                { title: 'Pack Xbox Series X + 3 jeux', price: 450, cat: 'Gaming', discount: '20' },
                { title: 'Montre Casio G-Shock', price: 125, cat: 'Accessoires', discount: '30' },
                { title: 'Tablette Samsung Galaxy Tab', price: 280, cat: 'Electronique', discount: '15' },
                { title: 'Parfum Calvin Klein', price: 55, cat: 'Beaute', discount: '40' },
                { title: 'Trousse maquillage 50 pieces', price: 35, cat: 'Beaute', discount: '60' },
                { title: 'Chaussures Adidas Stan Smith', price: 75, cat: 'Mode', discount: '25' },
                { title: 'Sac a dos 30L impermeable', price: 45, cat: 'Sports', discount: '35' },
                { title: 'Smartwatch Xiaomi Mi Band 7', price: 40, cat: 'Electronique', discount: '20' },
                { title: 'Cafetiere Nespresso Vertuo', price: 110, cat: 'Electromenager', discount:'30' },
                { title: 'Livres lot 5 romans francais', price: 25, cat: 'Culture', discount: '50' },
                { title: 'Matelas ergonomique 140x190', price: 320, cat: 'Maison', discount: '10' },
            ],
            produits: [
                { title: 'iPhone 15 Pro', price: 1350, cat: 'Electronique' },
                { title: 'Veste cuir homme', price: 189, cat: 'Mode' },
                { title: 'Canape scandinave', price: 850, cat: 'Maison' },
                { title: 'Samsung Galaxy S24', price: 980, cat: 'Electronique' },
                { title: 'Nike Air Max 270', price: 149, cat: 'Sports' },
                { title: 'MacBook Air M3', price: 1350, cat: 'Electronique' },
                { title: 'Robe ete 2024', price: 45, cat: 'Mode' },
                { title: 'Robot cuisine Moulinex', price: 220, cat: 'Electromenager' },
                { title: 'Livre Maths Terminale', price: 18, cat: 'Culture' },
                { title: 'Velo electrique urbain', price: 1200, cat: 'Sports' },
                { title: 'Casque Sony WH-1000XM5', price: 340, cat: 'Electronique' },
                { title: 'Parfum Dior Sauvage', price: 85, cat: 'Beaute' },
            ],
        };

        const src = types[this.type] || types['produits'];
        return src.map((x: any, i: number) => ({
            id: i + 1, title: x.title, description: '', price: x.price,
            oldPrice: null, discount: x.discount || null, image: null,
            category: x.cat, categoryId: null,
            vendor: ['TechShop', 'FashionHub', 'DecoStore'][i % 3],
            location: ['Tunis', 'Sfax', 'Sousse', 'Bizerte'][i % 4],
            date: new Date(Date.now() - i * 86400000 * 2).toISOString(),
            badge: i === 0 ? 'Nouveau' : x.discount ? `-${x.discount}%` : null,
            rating: 3.5 + (i % 15) / 10, reviews: 5 + i * 4,
            bgColor: this.PROD_COLORS[i % this.PROD_COLORS.length],
            isVerified: false, productCount: 0, features: [], raw: {},
        }));
    }
}