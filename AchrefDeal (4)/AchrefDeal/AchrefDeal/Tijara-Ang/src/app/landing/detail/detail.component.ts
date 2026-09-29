import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AnnoncesService } from 'src/app/core/services/annonces.service';
import { AssetsService } from 'src/app/core/services/assets.service';
import { BoostPremiumService } from 'src/app/core/services/boost-premium.service';
import { DealsService } from 'src/app/core/services/deals.service';
import { MessagesService } from 'src/app/core/services/messages.service';
import { PublicCatalogService } from 'src/app/core/services/public-catalog.service';
import { ProductsService } from 'src/app/core/services/products.service';
import { ReviewsService } from 'src/app/core/services/reviews.service';
import { WishlistService } from 'src/app/core/services/wishlist.service';
import { PrizesService } from 'src/app/core/services/prizes.service';
import { WinnersService } from 'src/app/core/services/winners.service';

@Component({
    selector: 'app-public-detail',
    templateUrl: './detail.component.html',
    styleUrls: ['./detail.component.scss'],
    standalone: false
})
export class PublicDetailComponent implements OnInit, OnDestroy {

    type: 'annonces' | 'deals' | 'produits' | 'prizes' = 'produits';
    item: any = null;
    similar: any[] = [];
    loading = true;
    showLoginToast = false;
    selectedImage = 0;
    qty = 1;

    now: number = Date.now();
    private countdownTimer: any = null;

    private readonly PROD_COLORS = ['#6691e7','#f06548','#0ab39c','#405189','#f7b84b','#299cdb'];

    get isLoggedIn(): boolean {
        try { return !!localStorage.getItem('currentUser'); } catch { return false; }
    }

    get isPrize(): boolean {
        return this.type === 'prizes';
    }

    get dealProgressPercent(): number {
        if (!this.item?.totalCount) return 0;
        return Math.min(100, Math.round((this.item.quantitySold / this.item.totalCount) * 100));
    }

    isDealEnded(): boolean {
        if (!this.item) return false;
        if (this.item.isActive === false) return true;
        if (this.item.dealEndDate) {
            const end = new Date(this.item.dealEndDate);
            if (!isNaN(end.getTime()) && end.getTime() < Date.now()) return true;
        }
        return false;
    }

    isDealExpired(): boolean {
        if (this.type !== 'deals' || !this.item?.dealEndDate) return false;
        const end = new Date(this.item.dealEndDate).getTime();
        return !isNaN(end) && this.now >= end;
    }

    isDealUrgent(): boolean {
        if (this.type !== 'deals' || !this.item?.dealEndDate || this.isDealExpired()) return false;
        const end = new Date(this.item.dealEndDate).getTime();
        if (isNaN(end)) return false;
        return (end - this.now) <= 3600 * 1000;
    }

    getDealTimeParts(): { days: string; hours: string; minutes: string; seconds: string } {
        const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');
        if (!this.item?.dealEndDate) return { days: '00', hours: '00', minutes: '00', seconds: '00' };

        const end = new Date(this.item.dealEndDate).getTime();
        if (isNaN(end)) return { days: '00', hours: '00', minutes: '00', seconds: '00' };

        const diff = Math.max(0, end - this.now);
        const totalSeconds = Math.floor(diff / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return { days: pad(days), hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) };
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

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private annoncesService: AnnoncesService,
        private assetsService: AssetsService,
        private boostService: BoostPremiumService,
        private dealsService: DealsService,
        private messagesService: MessagesService,
        private publicCatalogService: PublicCatalogService,
        private productsService: ProductsService,
        private reviewsService: ReviewsService,
        private wishlistService: WishlistService,
        private prizesService: PrizesService,
        private winnersService: WinnersService
    ) {}

    ngOnInit(): void {
        this.route.data.subscribe(d => {
            if (d['listingType']) this.type = d['listingType'];
            if (this.type === 'deals') this.startCountdownClock();
        });
        this.route.params.subscribe(p => { if (p['id']) this.load(+p['id']); });
    }

    ngOnDestroy(): void {
        this.stopCountdownClock();
    }

    private unwrap(r: any): any {
        return (r && typeof r === 'object' && 'data' in r) ? r.data : r;
    }

    private extractId(item: any, i: number): number {
        if (this.type === 'deals')    return item.IdDeal ?? item.id ?? i + 1;
        if (this.type === 'annonces') return item.IdAd ?? item.id ?? i + 1;
        if (this.type === 'produits') return item.IdProduct ?? item.id ?? i + 1;
        return item.id ?? i + 1;
    }

    private load(id: number): void {
        this.loading = true;
        this.item = null;
        this.similar = [];
        this.isLiked = false;

        if (this.type === 'prizes') {
            this.publicCatalogService.getPublicPrizes().subscribe({
                next: (r: any) => {
                    const raw: any[] = Array.isArray(r) ? r : (r?.data || []);
                    const found = raw.find((x: any) => x.id_prize === id || x.id === id);
                    this.item = found ? this.mapItem(found, 0) : null;
                    this.loading = false;
                },
                error: () => {
                    this.item = this.getDemoItem(id);
                    this.loading = false;
                }
            });
            return;
        }

        const call = this.type === 'annonces' ? this.annoncesService.getAnnonce(id)
                   : this.type === 'deals'    ? this.dealsService.getDeal(id)
                   : this.productsService.getProduct(id);

        call.subscribe({
            next: (r: any) => {
                this.item = this.mapItem(this.unwrap(r), 0);
                this.isLiked = !!this.item.likedByUser;
                this.loadLikedState();
                this.loadBoostStatus(id);
                this.loadSimilar();
                this.loadReviews(id);
                if (this.type === 'deals') this.loadPrizeForDeal(id);
                this.loading = false;
            },
            error: () => {
                this.item = this.getDemoItem(id);
                this.similar = this.getDemoSimilar();
                this.loading = false;
            }
        });
    }

    // ===================== PRIZE (lot à gagner) sur un deal public =====================
    // Le composant public n'affichait jusque-là jamais le lot lié à un deal ni son
    // éventuel gagnant, contrairement à l'espace vendeur (deals-ent.component.ts).
    // On récupère ici le prize associé, et son gagnant s'il a déjà été tiré au sort.
    prize: any = null;
    prizeWinnerName: string | null = null;

    private loadPrizeForDeal(dealId: number): void {
        this.prize = null;
        this.prizeWinnerName = null;

        this.prizesService.getPrizeForDeal(dealId).subscribe({
            next: (prize: any) => {
                this.prize = prize;
                const idPrize = prize?.idPrize ?? prize?.IdPrize;
                if (idPrize) {
                    this.winnersService.getWinnerForPrize(idPrize).subscribe({
                        next: (winner: any) => {
                            if (winner?.user) {
                                this.prizeWinnerName = `${winner.user.FirstName ?? ''} ${winner.user.LastName ?? ''}`.trim();
                            }
                        },
                        error: () => {}
                    });
                }
            },
            error: () => { this.prize = null; this.prizeWinnerName = null; }
        });
    }

    private loadBoostStatus(id: number): void {
        if (this.type !== 'produits' && this.type !== 'annonces') return;

        const call = this.type === 'produits'
            ? this.boostService.getProductBoostStatus(id)
            : this.boostService.getAdBoostStatus(id);

        call.subscribe({
            next: (status: any) => {
                if (this.item) this.item.isBoosted = !!status?.isBoosted;
            },
            error: () => {
                if (this.item) this.item.isBoosted = false;
            }
        });
    }

    private loadSimilar(): void {
        const call = this.type === 'annonces' ? this.annoncesService.getAnnonces()
                   : this.type === 'deals'    ? this.dealsService.getDeals()
                   : this.productsService.getProducts({ per_page: 6 }); // FIX — limit ignoré par le backend (attend per_page)

        call.subscribe({
            next: (r: any) => {
                const unwrapped = this.unwrap(r);
                const raw: any[] = Array.isArray(unwrapped) ? unwrapped : (unwrapped?.data || unwrapped?.products || unwrapped?.deals || unwrapped?.ads || []);
                this.similar = raw
                    .filter(x => this.extractId(x, 0) !== this.item?.id)
                    .slice(0, 4)
                    .map((x, i) => this.mapItem(x, i + 1));
                this.loadSimilarBoostInfo();
            },
            error: () => { this.similar = this.getDemoSimilar(); }
        });
    }

    private loadSimilarBoostInfo(): void {
        if (this.type !== 'produits' && this.type !== 'annonces') return;
        if (!this.similar.length) return;

        const requests = this.similar.map(s =>
            (this.type === 'produits'
                ? this.boostService.getProductBoostStatus(s.id)
                : this.boostService.getAdBoostStatus(s.id)
            ).pipe(catchError(() => of(null)))
        );

        forkJoin(requests).subscribe((statuses) => {
            this.similar = this.similar
                .map((s, i) => ({
                    ...s,
                    isBoostedRelated: !!(statuses[i]?.isBoosted && statuses[i]?.boost?.pack?.relatedPost)
                }))
                .sort((a, b) => (b.isBoostedRelated ? 1 : 0) - (a.isBoostedRelated ? 1 : 0));
        });
    }

    private loadLikedState(): void {
        if (!this.isLoggedIn || !this.item) return;

        if (this.type === 'annonces') {
            this.annoncesService.getMyAdLikes().subscribe({
                next: (res: any) => {
                    const data: any[] = Array.isArray(res) ? res : (res?.data || []);
                    const match = data.find((l: any) => l.IdAd === this.item.id);
                    if (match) {
                        this.isLiked = true;
                        this.item.dealLikeId = match.IdLike;
                    }
                },
                error: () => {}
            });
        }
    }

    private resolveImageUrl(raw: string | null | undefined): string | null {
        if (!raw || typeof raw !== 'string') return null;
        if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

        const cleanPath = raw.replace(/\\/g, '/');
        const filename = cleanPath.split('/').pop();

        if (cleanPath.includes('/')) {
            let withImages = cleanPath;
            if (!withImages.includes('/images/')) {
                const parts = withImages.split('/');
                const fname = parts.pop();
                withImages = [...parts, 'images', fname].join('/');
            }
            const withLeadingSlash = withImages.startsWith('/') ? withImages : `/${withImages}`;
            return `${this.assetsService.assetsBaseUrl}${withLeadingSlash}`;
        }

        const folder = this.type === 'annonces' ? 'assets/ads/images'
                     : this.type === 'produits' ? 'assets/products/images'
                     : null;

        return folder ? `${this.assetsService.assetsBaseUrl}/${folder}/${filename}` : null;
    }

    // FIX — l'ancienne version devinait un nom de fichier depuis l'id du deal
    // ("deal_{id}.jpg"), qui ne correspond jamais au nom réellement généré côté
    // backend (uniqid('deal_') + extension d'origine). On lit maintenant le vrai
    // champ imageDeal renvoyé par l'API, avec le même garde-fou que dans
    // deals-ent.component.ts pour les cas où imageDeal contient déjà une data URI
    // ou une URL absolue.
    private resolveDealImageUrl(raw: any): string | null {
        if (raw?.image_url) return raw.image_url;

        const rawImage = raw?.imageDeal ?? raw?.ImageDeal;
        if (!rawImage) return null;

        const value = String(rawImage);
        if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) {
            return value;
        }
        return `${this.assetsService.assetsBaseUrl}/assets/deals/${value}`;
    }

    private mapItem(item: any, i: number): any {
        if (!item) {
            return this.getDemoItem(i);
        }

        if (this.type === 'prizes') {
            return {
                id: item.id_prize ?? item.IdPrize ?? item.id ?? i + 1,
                title: item.title ?? item.TitlePrize ?? 'Sans titre',
                description: item.description ?? item.DescriptionPrize ?? '',
                details: '',
                price: 0,
                oldPrice: null,
                discount: null,
                images: [],
                image: this.resolveImageUrl(item.image ?? item.ImagePrize),
                category: '',
                vendor: item.winner_name ?? item.WinnerName ?? 'Non attribué',
                vendorId: item.id_user ?? item.IdUser ?? null,
                location: '',
                date: item.date_prize ?? item.DatePrize ?? '',
                rating: 0,
                reviews: 0,
                badge: null,
                bgColor: this.PROD_COLORS[i % this.PROD_COLORS.length],
                stock: null,
                phone: '',
                features: [],
                likeCount: 0,
                viewCount: 0,
                likedByUser: false,
                dealLikeId: null,
                productLikeId: null,
                quantitySold: null,
                totalCount: null,
                dealEndDate: null,
                isActive: true,
                isBoosted: false,
                isBoostedRelated: false,
            };
        }

        const price = parseFloat(
            item.PriceAd ?? item.PriceProduct ?? item.PriceDeal ?? item.priceDeal
            ?? item.price ?? item.Price ?? item.deal_price ?? '0'
        ) || 0;

        let resolvedImages: string[] = [];
        let mainImage: string | null = null;

        if (this.type === 'deals') {
            mainImage = this.resolveDealImageUrl(item);
            resolvedImages = mainImage ? [mainImage] : [];
        } else {
            const imageSource = item.ImageAd ?? item.ImageProduct ?? item.image ?? item.image_url;

            let parsedSource = imageSource;
            if (typeof imageSource === 'string') {
                try {
                    parsedSource = JSON.parse(imageSource);
                } catch {
                    parsedSource = imageSource;
                }
            }

            const rawImageList: string[] = Array.isArray(parsedSource)
                ? parsedSource
                : (parsedSource ? [parsedSource] : []);

            resolvedImages = rawImageList
                .map((img: string) => this.resolveImageUrl(img))
                .filter((img: string | null): img is string => !!img);

            const firstImageSource = Array.isArray(parsedSource) ? parsedSource[0] : parsedSource;
            mainImage = this.resolveImageUrl(firstImageSource);
        }

        const discountRaw = item.discount ?? item.discountDeal ?? null;
        const discountValue = discountRaw ? parseFloat(discountRaw) : null;

        return {
            id:          this.extractId(item, i),
            title:       item.TitleAd || item.TitleProduct || item.TitleDeal || item.titleDeal
                         || item.title || item.name || 'Sans titre',
            description: item.DescriptionAd || item.DescriptionProduct || item.DescriptionDeal
                         || item.descriptionDeal || item.description || item.content || '',
            details:     item.DetailsAd || item.DetailsProduct || item.DetailsDeal || item.detailsDeal
                         || item.details || '',
            price,
            oldPrice:    item.original_price ? parseFloat(item.original_price) : null,
            discount:    discountValue,
            images:      resolvedImages,
            image:       mainImage,
            category:    item.category || item.category_name || '',
            vendor:      item.vendor_name || item.shop_name || item.ownerdeals || '',
            vendorId:    item.vendor_id || item.IdUser || item.id_user || item.idUser || null,
            location:    item.LocationAd || item.city || item.location || item.locationDeal || '',
            date:        item.DatePublication || item.created_at || item.date_publication
                         || item.CreationDate || item.dateStart || item.startDate
                         || item.datePublication || '',
            rating:      parseFloat(item.rating || item.avg_rating || '0') || 0,
            reviews:     item.review_count || 0,
            badge:       item.is_boost ? 'Boost' : discountValue ? `-${Math.round(discountValue)}%` : null,
            bgColor:     this.PROD_COLORS[i % this.PROD_COLORS.length],
            stock:       item.QuantityProduct ?? item.quantity ?? item.qte
                         ?? item.TotalCount ?? item.totalCount ?? null,
            phone:       item.phone || item.Telephone || item.telephone || '',
            features:    this.toFeatures(item.features ?? item.values ?? item.Features ?? item.attributes ?? item.featureValues),
            likeCount:   parseInt(item.LikeCount ?? item.like_count ?? item.likes ?? '0', 10) || 0,
            viewCount:   parseInt(item.ViewCount ?? item.view_count ?? '0', 10) || 0,
            likedByUser: !!(item.liked ?? item.isLiked ?? item.is_liked),
            dealLikeId:  null,
            productLikeId: null,
            quantitySold: item.quantity != null ? parseInt(item.quantity, 10) : null,
            totalCount:   item.TotalCount != null ? parseInt(item.TotalCount, 10) : null,
            dealEndDate:  item.dateEnd || null,
            isActive:     item.active != null ? !!item.active : true,
            isBoosted:    false,
            isBoostedRelated: false,
        };
    }

    private toFeatures(source: unknown): { key: string; value: string }[] {
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
            .filter((feature) => !!feature.key && !!feature.value);
    }

    getStars(r: number): number[] { return Array(Math.min(5, Math.floor(r))).fill(0); }
    getEmptyStars(r: number): number[] { return Array(5 - Math.min(5, Math.floor(r))).fill(0); }

    formatPrice(p: number): string {
        return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 2 }).format(p);
    }

    formatDate(d: string): string {
        if (!d) return '';
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    isWishlisted = false;
    wishlistLoading = false;

    private get wishlistType(): 'ads' | 'deals' | 'products' {
        return this.type === 'annonces' ? 'ads' : this.type === 'deals' ? 'deals' : 'products';
    }

    toggleWishlist(): void {
        if (this.isPrize) return;
        if (!this.isLoggedIn) {
            this.showLoginToast = true;
            setTimeout(() => this.showLoginToast = false, 4000);
            return;
        }

        const wType = this.wishlistType;
        this.wishlistLoading = true;
        if (this.isWishlisted) {
            this.wishlistService.removeFromWishlist(wType, this.item.id).subscribe({
                next: () => { this.isWishlisted = false; this.wishlistLoading = false; },
                error: () => { this.wishlistLoading = false; }
            });
        } else {
            this.wishlistService.addToWishlist(wType, this.item.id).subscribe({
                next: () => { this.isWishlisted = true; this.wishlistLoading = false; },
                error: () => { this.wishlistLoading = false; }
            });
        }
    }

    isLiked = false;
    likeLoading = false;

    toggleLike(): void {
        if (this.isPrize) return;
        if (!this.isLoggedIn) {
            this.showLoginToast = true;
            setTimeout(() => this.showLoginToast = false, 4000);
            return;
        }

        this.likeLoading = true;

        if (this.type === 'deals') {
            if (this.isLiked && this.item.dealLikeId) {
                this.dealsService.removeDealLike(this.item.dealLikeId).subscribe({
                    next: () => {
                        this.isLiked = false;
                        this.item.likeCount = Math.max(0, this.item.likeCount - 1);
                        this.item.dealLikeId = null;
                        this.likeLoading = false;
                    },
                    error: () => { this.likeLoading = false; }
                });
            } else if (!this.isLiked) {
                this.dealsService.addDealLike(this.item.id).subscribe({
                    next: (res: any) => {
                        this.isLiked = true;
                        this.item.likeCount += 1;
                        this.item.dealLikeId = res?.data?.IdLike ?? null;
                        this.likeLoading = false;
                    },
                    error: () => { this.likeLoading = false; }
                });
            } else {
                this.likeLoading = false;
            }
            return;
        }

        if (this.type === 'produits') {
            if (this.isLiked && this.item.productLikeId) {
                this.productsService.removeProductLike(this.item.productLikeId).subscribe({
                    next: () => {
                        this.isLiked = false;
                        this.item.likeCount = Math.max(0, this.item.likeCount - 1);
                        this.item.productLikeId = null;
                        this.likeLoading = false;
                    },
                    error: () => { this.likeLoading = false; }
                });
            } else if (!this.isLiked) {
                this.productsService.addProductLike(this.item.id).subscribe({
                    next: (res: any) => {
                        this.isLiked = true;
                        this.item.likeCount += 1;
                        this.item.productLikeId = res?.data?.IdLike ?? null;
                        this.likeLoading = false;
                    },
                    error: () => { this.likeLoading = false; }
                });
            } else {
                this.likeLoading = false;
            }
            return;
        }

        this.annoncesService.toggleLike(this.item.id).subscribe({
            next: (r: any) => {
                const liked = r?.liked ?? !this.isLiked;
                this.isLiked = liked;
                this.item.likeCount = Math.max(0, this.item.likeCount + (liked ? 1 : -1));
                this.likeLoading = false;
            },
            error: () => { this.likeLoading = false; }
        });
    }

    reviews: any[]      = [];
    reviewSummary: any  = { total: 0, average: 0 };
    showReviewForm      = false;
    reviewRating        = 5;
    reviewComment       = '';
    reviewSubmitting    = false;
    reviewError         = '';

    loadReviews(id: number): void {
        if (this.isPrize) return;
        const t = this.type === 'annonces' ? 'ad' : this.type === 'deals' ? 'deal' : 'product';

        this.reviewsService.getReviews(t, id).subscribe({
            next: (r: any) => {
                this.reviews = Array.isArray(r) ? r : (r?.data || []);
            },
            error: () => { this.reviews = []; }
        });
    }

    submitReview(): void {
        if (this.isPrize) return;
        if (!this.isLoggedIn) {
            this.showLoginToast = true;
            setTimeout(() => this.showLoginToast = false, 4000);
            return;
        }
        this.reviewSubmitting = true;
        this.reviewError      = '';
        const t = this.type === 'annonces' ? 'ad' : this.type === 'deals' ? 'deal' : 'product';
        this.reviewsService.addReviewGeneric(t, this.item.id, { rating: this.reviewRating, comment: this.reviewComment })
            .subscribe({
                next: () => {
                    this.reviewSubmitting = false;
                    this.showReviewForm   = false;
                    this.reviewComment    = '';
                    this.reviewRating     = 5;
                    this.loadReviews(this.item.id);
                },
                error: (e: any) => {
                    this.reviewSubmitting = false;
                    this.reviewError = e?.error?.message || 'Erreur lors de la soumission.';
                }
            });
    }

    setRating(n: number): void { this.reviewRating = n; }

    trackReview(index: number, rev: any): number {
        return rev?.idReview ?? index;
    }

    orderSubmitting = false;
    orderError = '';
    orderSuccess = false;

    private get cartKey(): string {
        try {
            const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return u?.id ? `tijara_cart_${u.id}` : 'tijara_cart_guest';
        } catch { return 'tijara_cart_guest'; }
    }

    addToCart(): void {
        if (this.isPrize || this.type === 'annonces') return;
        if (!this.isLoggedIn) {
            this.showLoginToast = true;
            setTimeout(() => this.showLoginToast = false, 4000);
            return;
        }
        if (!this.item) return;

        this.orderError = '';
        this.orderSuccess = false;

        const productForCart = {
            id: this.item.id,
            name: this.item.title,
            image: this.item.image,
            price: this.item.price,
            vendor: this.item.vendor,
            stock: this.type === 'deals'
                ? (this.item.totalCount ?? this.item.quantitySold ?? 999)
                : (this.item.stock ?? 999),
        };

        let cart: { product: any; qty: number }[] = [];
        try {
            const saved = localStorage.getItem(this.cartKey);
            cart = saved ? JSON.parse(saved) : [];
        } catch {
            cart = [];
        }

        const existing = cart.find(c => c.product.id === productForCart.id);
        if (existing) {
            existing.qty += this.qty;
        } else {
            cart.push({ product: productForCart, qty: this.qty });
        }

        localStorage.setItem(this.cartKey, JSON.stringify(cart));

        this.orderSuccess = true;
        setTimeout(() => this.orderSuccess = false, 4000);
    }

    showContactForm = false;
    contactMessage = '';
    contactSending = false;
    contactError = '';
    contactSuccess = '';


    contactVendor(): void {
        if (!this.isLoggedIn) {
            this.showLoginToast = true;
            setTimeout(() => this.showLoginToast = false, 4000);
            return;
        }
        this.contactError = '';
        this.contactSuccess = '';
        this.showContactForm = !this.showContactForm;
    }
sendContactMessage(): void {
    if (!this.item?.vendorId) {
        this.contactError = 'Vendeur introuvable pour cette annonce.';
        return;
    }
    if (!this.contactMessage.trim()) return;

    this.contactSending = true;
    this.contactError = '';

    this.messagesService.startConversationWithMessage({
        user_id: this.item.vendorId,
        product_id: this.item.id,
        product_name: this.item.title,
        content: this.contactMessage.trim()
    }).subscribe({
        next: () => {
            this.contactSuccess = 'Message envoyé ! Le vendeur vous répondra bientôt.';
            this.contactMessage = '';
            this.contactSending = false;
            this.showContactForm = false;
            setTimeout(() => this.contactSuccess = '', 4000);
        },
        error: () => {
            this.contactSending = false;
            this.contactError = "Impossible d'envoyer le message.";
        }
    });
}

    goSimilar(item: any): void {
        this.router.navigate([`/landing/${this.type}/${item.id}`])
            .then(() => { this.load(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }

    back(): void { this.router.navigate([`/landing/${this.type}`]); }

    private getDemoItem(id: number): any {
        if (this.type === 'prizes') {
            return {
                id, title: 'iPhone 15 Pro',
                description: 'Lot remporté par un membre de la communauté Tijara.',
                details: '', price: 0, oldPrice: null, discount: null,
                images: [], image: null,
                category: '', vendor: 'Non attribué', vendorId: null,
                location: '', date: new Date().toISOString(),
                rating: 0, reviews: 0, badge: null,
                bgColor: '#405189', stock: null, phone: '',
                features: [],
                likeCount: 0, viewCount: 0, likedByUser: false, dealLikeId: null, productLikeId: null,
                quantitySold: null, totalCount: null, dealEndDate: null, isActive: true,
                isBoosted: false, isBoostedRelated: false,
            };
        }
        return {
            id, title: 'Article de démonstration', description: 'Description complète de cet article disponible sur Tijara.',
            details: 'Cet article est en excellent état. Livraison possible sur toute la Tunisie.',
            price: 299, oldPrice: 350, discount: 15, images: [], image: null,
            category: 'Électronique', vendor: 'TechShop Tijara', vendorId: 1,
            location: 'Tunis', date: new Date().toISOString(),
            rating: 4.5, reviews: 32, badge: '-15%',
            bgColor: '#405189', stock: 5, phone: '+216 99 000 000',
            features: [
                { key: 'Marque', value: 'Démo' },
                { key: 'État', value: 'Neuf' },
            ],
            likeCount: 0, viewCount: 0, likedByUser: false, dealLikeId: null, productLikeId: null,
            quantitySold: 9, totalCount: 130, dealEndDate: null, isActive: true,
            isBoosted: false, isBoostedRelated: false,
        };
    }

    private getDemoSimilar(): any[] {
        return Array.from({ length: 4 }, (_, i) => ({
            id: i + 100, title: `Article similaire ${i + 1}`,
            price: 100 + i * 50, oldPrice: null, discount: null,
            image: null, category: 'Électronique',
            vendor: 'TechShop', location: 'Tunis',
            date: new Date().toISOString(), rating: 4, reviews: 10,
            badge: null, bgColor: this.PROD_COLORS[i % this.PROD_COLORS.length],
        }));
    }
}