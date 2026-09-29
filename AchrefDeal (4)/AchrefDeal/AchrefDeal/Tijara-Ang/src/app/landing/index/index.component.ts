import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AssetsService } from 'src/app/core/services/assets.service';
import { BoostPremiumService } from 'src/app/core/services/boost-premium.service';
import { DealsService } from 'src/app/core/services/deals.service';
import { PublicCatalogService } from 'src/app/core/services/public-catalog.service';
import { CartService } from 'src/app/core/services/cart.service';

const CAT_COLORS  = ['primary','success','warning','danger','info','secondary','dark','primary'];
const CAT_ICONS   = [
    'ri-computer-line', 'ri-t-shirt-line', 'ri-home-2-line', 'ri-car-line',
    'ri-run-line', 'ri-book-open-line', 'ri-heart-line', 'ri-building-line'
];
const PROD_COLORS = ['#6691e7','#f06548','#0ab39c','#405189','#f7b84b','#299cdb'];

const CATEGORY_GROUPS: Record<number, { title: string; items: string[] }[]> = {
    1: [
        { title: 'Ordinateurs',                 items: ['Pc Portable', 'Pc Portable Gamer', 'Pc De Bureau', 'Pc Tout En Un'] },
        { title: 'Accessoires & Périphériques',  items: ['Casque & Écouteurs', 'Souris', 'Claviers', 'Webcam', 'Station D\'accueil'] },
        { title: 'Composants',                   items: ['Disque Dur Interne', 'Carte Graphique', 'Processeur', 'Barrette Mémoire', 'Carte Mère'] },
    ],
    2: [
        { title: 'Homme',  items: ['Vêtements', 'Chaussures', 'Accessoires'] },
        { title: 'Femme',  items: ['Vêtements', 'Chaussures', 'Sacs & Accessoires'] },
        { title: 'Enfant', items: ['Vêtements', 'Chaussures'] },
    ],
    3: [
        { title: 'Mobilier',    items: ['Salon', 'Chambre', 'Bureau'] },
        { title: 'Décoration', items: ['Luminaires', 'Textiles', 'Rangement'] },
        { title: 'Jardin',      items: ['Outils', 'Mobilier Extérieur'] },
    ],
    4: [
        { title: 'Véhicules',            items: ['Voiture Citadine', 'SUV', 'Utilitaire'] },
        { title: 'Pièces & Accessoires', items: ['Pneus', 'Batteries', 'Accessoires Intérieur'] },
    ],
    5: [
        { title: 'Fitness',           items: ['Musculation', 'Cardio', 'Yoga'] },
        { title: 'Sports collectifs', items: ['Football', 'Basketball'] },
        { title: 'Plein air',         items: ['Camping', 'Vélo'] },
    ],
    6: [
        { title: 'Littérature', items: ['Roman', 'Poésie', 'Bande Dessinée'] },
        { title: 'Scolaire',    items: ['Parascolaire', 'Manuels'] },
    ],
    7: [
        { title: 'Beauté', items: ['Maquillage', 'Parfums', 'Soin Visage'] },
        { title: 'Santé',  items: ['Compléments', 'Hygiène'] },
    ],
    8: [
        { title: 'Vente',    items: ['Appartement', 'Villa', 'Terrain'] },
        { title: 'Location', items: ['Appartement', 'Studio'] },
    ],
};

@Component({
    selector: 'app-index',
    templateUrl: './index.component.html',
    styleUrls: ['./index.component.scss'],
    standalone: false
})
export class IndexComponent implements OnInit, OnDestroy {

    now: number = Date.now();
    private countdownTimer: any = null;

    currentSection   = 'hero';
    year             = new Date().getFullYear();
    showLoginToast   = false;
    private toastTimer: any;

    categories:       any[] = [];
    categoriesLoading = true;

    private categoryNameById: Record<number, string> = {};

    featuredProducts: any[] = [];
    productsLoading   = true;

    premiumAnnonces: any[] = [];
    premiumAnnoncesLoading = true;

    premiumProducts: any[] = [];
    premiumProductsLoading = true;

    deals: any[] = [];
    dealsLoading = true;
    currentDealIndex = 0;
    private dealCarouselTimer: any;

    // ── Ajout : carrousel du hero unifié (deals + produits/annonces boostés) ──
    heroCarouselItems: any[] = [];

    private rawLatestProducts: any[] = [];
    private rawLatestAds: any[] = [];

    boostedSliderItems: any[] = [];
    boostedSliderLoading = true;
    currentBoostSlideIndex = 0;
    private boostSliderTimer: any;

    // ── Ajout : contrôle du défilement continu (bande catalogue) ──
    boostTrackPaused = false;

    boostedFooterItems: any[] = [];
    boostedFooterLoading = true;

    // ── Ajouts : Links (barre de liens sponsorisés) + FirstLogin (modal) ──
    boostedLinksItems: any[] = [];
    boostedLinksLoading = true;

    boostedFirstLoginItems: any[] = [];
    boostedFirstLoginLoading = true;

    @ViewChild('firstLoginModal') firstLoginModalRef!: TemplateRef<any>;

    prizes: any[] = [];
    prizesLoading = true;

    megaMenuCategoryId: number | null = null;
    private megaMenuTimer: any;

    searchQuery      = '';
    searchCategoryId: number | '' = '';

    userMenuOpen = false;
    isScrolled = false;

    mobileMenuOpen = false;

    steps = [
        { step: '01', icon: 'ri-search-2-line',        title: 'Parcourez',  desc: 'Explorez des milliers de produits dans toutes les catégories.' },
        { step: '02', icon: 'ri-message-3-line',       title: 'Contactez',  desc: 'Discutez directement avec le vendeur et négociez le meilleur prix.' },
        { step: '03', icon: 'ri-secure-payment-line',  title: 'Achetez',    desc: 'Finalisez votre achat en toute sécurité avec nos moyens de paiement.' },
    ];

    stats = [
        { value: '12 500+', label: 'Produits publiés',   icon: 'ri-shopping-bag-3-line' },
        { value: '3 200+',  label: 'Vendeurs actifs',    icon: 'ri-store-2-line'        },
        { value: '45 000+', label: 'Acheteurs inscrits', icon: 'ri-group-line'          },
        { value: '98%',     label: 'Satisfaction',       icon: 'ri-star-line'           },
    ];

    testimonials = [
        { name: 'Sami B.',    role: 'Acheteur', rating: 5, text: 'Excellente plateforme, j\'ai trouvé ce que je cherchais en quelques minutes. Livraison rapide !' },
        { name: 'Mariam K.',  role: 'Vendeuse', rating: 5, text: 'J\'ai ouvert ma boutique il y a 3 mois. Le dashboard vendeur est simple et mes ventes ont décollé.' },
        { name: 'Karim T.',   role: 'Acheteur', rating: 4, text: 'Prix très compétitifs et messagerie pratique avec les vendeurs. Je recommande vivement Tijara.' },
    ];

    constructor(
        private assetsService: AssetsService,
        private boostService: BoostPremiumService,
        private dealsService: DealsService,
        private publicCatalogService: PublicCatalogService,
        private router: Router,
        private cartService: CartService,
        private modalService: NgbModal,
    ) {}

    ngOnInit(): void {
        this.loadVitrine();
        this.loadDeals();
        this.loadPrizes();
        this.startCountdownClock();
    }

    ngOnDestroy(): void {
        this.stopCountdownClock();
        clearInterval(this.dealCarouselTimer);
        clearInterval(this.boostSliderTimer);
        clearTimeout(this.toastTimer);
        clearTimeout(this.megaMenuTimer);
    }

    // ── Ajout : spinner unique tant que les deals OU les items boostés
    // "sliders" ne sont pas encore arrivés ──
    get heroLoading(): boolean {
        return this.dealsLoading || this.boostedSliderLoading;
    }

    // ── Ajout : liste dupliquée pour un défilement en boucle infinie
    // sans "trou" visible (bande catalogue) ──
    get boostedSliderLoopItems(): any[] {
        return this.boostedSliderItems.length > 0
            ? [...this.boostedSliderItems, ...this.boostedSliderItems]
            : [];
    }

    private loadVitrine(): void {
        this.categoriesLoading      = true;
        this.productsLoading        = true;
        this.premiumProductsLoading = true;
        this.premiumAnnoncesLoading = true;

        this.publicCatalogService.getVitrine().subscribe({
            next: (res: any) => {
                this.rawLatestProducts = Array.isArray(res?.latestProducts) ? res.latestProducts : [];
                this.rawLatestAds      = Array.isArray(res?.latestAds)      ? res.latestAds      : [];

                this.applyCategories(res?.categories);
                this.applyProductSections(res?.latestProducts);
                this.applyPremiumAnnonces(res?.latestAds);
                this.loadBoostedPlacementItems();
            },
            error: () => {
                this.applyCategories(null);
                this.applyProductSections(null);
                this.applyPremiumAnnonces(null);
                this.boostedSliderLoading = false;
                this.boostedFooterLoading = false;
                this.boostedLinksLoading = false;
                this.boostedFirstLoginLoading = false;
                this.buildHeroCarousel();
            }
        });
    }

    private applyCategories(raw: any): void {
        const all: any[] = Array.isArray(raw) ? raw : [];

        if (all.length === 0) {
            this.categories = [
                { idCateg: 1, name: 'Électronique',     icon: 'ri-computer-line',   color: 'primary',   count: 248 },
                { idCateg: 2, name: 'Mode & Vêtements', icon: 'ri-t-shirt-line',    color: 'success',   count: 195 },
                { idCateg: 3, name: 'Maison & Jardin',  icon: 'ri-home-2-line',     color: 'warning',   count: 162 },
                { idCateg: 4, name: 'Voitures',         icon: 'ri-car-line',        color: 'danger',    count: 87  },
                { idCateg: 5, name: 'Sports & Loisirs', icon: 'ri-run-line',        color: 'info',      count: 134 },
                { idCateg: 6, name: 'Livres',           icon: 'ri-book-open-line',  color: 'secondary', count: 210 },
                { idCateg: 7, name: 'Beauté & Santé',   icon: 'ri-heart-line',      color: 'danger',    count: 176 },
                { idCateg: 8, name: 'Immobilier',       icon: 'ri-building-line',   color: 'dark',      count: 53  },
            ];
            this.categoryNameById = {};
            this.categories.forEach(c => { this.categoryNameById[c.idCateg] = c.name; });
            this.categoriesLoading = false;
            return;
        }

        this.categories = all.slice(0, 8).map((c: any, i: number) => ({
            idCateg: c.id   || c.id_categ || c.idCateg || c.IdCateg || i,
            name:    c.name_fr || c.TitleFr || c.nameFr || c.title_fr || c.name || c.title_en || 'Catégorie',
            icon:    CAT_ICONS[i % CAT_ICONS.length],
            color:   CAT_COLORS[i % CAT_COLORS.length],
            count:   c.active_deals ?? c.deals_count ?? 0,
        }));

        this.categoryNameById = {};
        all.forEach((c: any, i: number) => {
            const id   = c.id ?? c.id_categ ?? c.idCateg ?? c.IdCateg ?? i;
            const name = c.name_fr || c.TitleFr || c.nameFr || c.title_fr || c.name || c.title_en || 'Catégorie';
            this.categoryNameById[id] = name;
        });

        this.categoriesLoading = false;
    }

    private applyProductSections(raw: any): void {
        const all: any[] = (Array.isArray(raw) ? raw : []).slice(0, 50);

        if (all.length === 0) {
            this.featuredProducts = this.getDemoProducts();
            this.premiumProducts  = this.getDemoPremiumProducts();
            this.productsLoading = false;
            this.premiumProductsLoading = false;
            return;
        }

        const premiumRaw = [...all]
            .sort((a: any, b: any) => (b.ViewCount ?? 0) - (a.ViewCount ?? 0))
            .slice(0, 4);
        const premiumIds = new Set(premiumRaw.map((p: any) => this.getItemId(p)));
        this.premiumProducts = premiumRaw.map((p: any, i: number) => this.mapCardItem(p, i, 'produits'));

        const populairesRaw = all
            .filter((p: any) => !premiumIds.has(this.getItemId(p)))
            .slice(0, 6);
        this.featuredProducts = populairesRaw.map((p: any, i: number) => this.mapCardItem(p, i, 'produits'));

        this.productsLoading = false;
        this.premiumProductsLoading = false;
    }

    private applyPremiumAnnonces(raw: any): void {
        const all: any[] = (Array.isArray(raw) ? raw : []).slice(0, 50);
        const top = [...all]
            .sort((a: any, b: any) => (b.ViewCount ?? 0) - (a.ViewCount ?? 0))
            .slice(0, 4)
            .map((a: any, i: number) => this.mapCardItem(a, i, 'annonces'));
        this.premiumAnnonces = top.length > 0 ? top : this.getDemoPremiumAnnonces();
        this.premiumAnnoncesLoading = false;
    }

    private getItemId(item: any): any {
        return item.IdAd ?? item.IdProduct ?? item.IdDeal ?? item.id ?? null;
    }

    private extractFirstImagePath(raw: any): any {
        if (Array.isArray(raw)) { return raw[0] ?? null; }
        if (typeof raw === 'string') {
            const trimmed = raw.trim();
            if (trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) { return parsed[0] ?? null; }
                } catch {
                }
            }
            return trimmed || null;
        }
        return raw ?? null;
    }

    private getDemoProducts(): any[] {
        return [
            { id: 1, name: 'iPhone 14 Pro',           category: 'Électronique', price: 1200, oldPrice: 1400, seller: 'TechShop',   rating: 4.8, reviews: 124, badge: 'Nouveau',   bgColor: '#6691e7', image: null, isPremium: false, type: 'produits' },
            { id: 2, name: 'Veste en Cuir Noir',      category: 'Mode',         price: 189,  oldPrice: 250,  seller: 'FashionHub', rating: 4.5, reviews: 67,  badge: '-25%',      bgColor: '#f06548', image: null, isPremium: false, type: 'produits' },
            { id: 3, name: 'Canapé Moderne 3 places', category: 'Maison',       price: 850,  oldPrice: null, seller: 'DecoStore',  rating: 4.7, reviews: 42,  badge: null,        bgColor: '#0ab39c', image: null, isPremium: false, type: 'produits' },
            { id: 4, name: 'Samsung Galaxy S23',      category: 'Électronique', price: 980,  oldPrice: 1100, seller: 'MobilePro',  rating: 4.6, reviews: 98,  badge: 'Populaire', bgColor: '#405189', image: null, isPremium: false, type: 'produits' },
            { id: 5, name: 'Nike Air Max 270',         category: 'Sports',       price: 149,  oldPrice: 180,  seller: 'SportZone',  rating: 4.9, reviews: 213, badge: '-17%',      bgColor: '#f7b84b', image: null, isPremium: false, type: 'produits' },
            { id: 6, name: 'MacBook Air M2',          category: 'Électronique', price: 1350, oldPrice: 1500, seller: 'TechShop',   rating: 4.9, reviews: 87,  badge: 'Top vente', bgColor: '#299cdb', image: null, isPremium: false, type: 'produits' },
        ];
    }

    private loadDeals(): void {
        this.dealsLoading = true;
        this.dealsService.getDeals({ per_page: 8, page: 1 }).subscribe({
            next: (res: any) => {
                const all: any[] = Array.isArray(res) ? res : (res?.data || res?.deals || []);
                this.deals = all.slice(0, 8).map((d: any, i: number) => this.mapDealItem(d, i));
                this.dealsLoading = false;
                this.buildHeroCarousel();
            },
            error: () => {
                this.deals = [];
                this.dealsLoading = false;
                this.buildHeroCarousel();
            }
        });
    }

    private loadPrizes(): void {
        this.prizesLoading = true;
        this.publicCatalogService.getPublicPrizes().subscribe({
            next: (res: any) => {
                const all: any[] = Array.isArray(res) ? res : (res?.data || res?.prizes || []);
                this.prizes = all.slice(0, 6).map((p: any, i: number) => ({
                    id: p.IdPrize ?? p.id ?? (i + 1),
                    title: p.title || 'Cadeau',
                    description: p.description || '',
                    image: this.resolveImageUrl(p.image, 'prizes'),
                    bgColor: PROD_COLORS[(i + 2) % PROD_COLORS.length],
                }));
                this.prizesLoading = false;
            },
            error: () => {
                this.prizes = [];
                this.prizesLoading = false;
            }
        });
    }

    private mapDealItem(d: any, i: number): any {
        const dealId = d.IdDeal ?? d.id ?? (i + 1);
        const image = this.resolveImageUrl(`deal_${dealId}.jpg`, 'deals');
        const prizeImage = d.idprize?.image ? this.resolveImageUrl(d.idprize.image, 'prizes') : null;
        return {
            id:       dealId,
            title:    d.titleDeal || d.title || 'Offre spéciale',
            price:    parseFloat(d.priceDeal ?? d.price ?? '0'),
            discount: d.discountDeal ?? d.discount ?? null,
            image,
            seller:   d.ownerdeals || '',
            dateEnd:  d.dateEnd || null,
            prize:    d.idprize ? { title: d.idprize.title, image: prizeImage } : null,
            bgColor:  PROD_COLORS[i % PROD_COLORS.length],
        };
    }

    // ── Ajout : transforme un deal en item de carrousel générique ──
    private mapDealToHeroSlide(d: any): any {
        return {
            id:       d.id,
            kind:     'deal',
            title:    d.title,
            price:    d.price,
            image:    d.image,
            seller:   d.seller,
            bgColor:  d.bgColor,
            discount: d.discount,
            dateEnd:  d.dateEnd,
            prize:    d.prize,
        };
    }

    // ── Ajout : transforme un produit/annonce boosté en item de carrousel générique ──
    private mapBoostedToHeroSlide(item: any): any {
        return {
            id:         item.id,
            kind:       'boosted',
            title:      item.name,
            price:      item.price,
            image:      item.image,
            seller:     item.seller,
            bgColor:    item.bgColor,
            badgeLabel: item.badge || (item.type === 'produits' ? 'Produit boosté' : 'Annonce boostée'),
            routeType:  item.type,
        };
    }

    // ── Ajout : fusionne deals + produits/annonces boostés (placement "sliders")
    // dans le carrousel du hero, et relance le défilement automatique ──
    private buildHeroCarousel(): void {
        const dealSlides    = this.deals.map((d: any) => this.mapDealToHeroSlide(d));
        const boostedSlides = this.boostedSliderItems.map((item: any) => this.mapBoostedToHeroSlide(item));
        this.heroCarouselItems = [...dealSlides, ...boostedSlides];
        this.currentDealIndex = 0;
        this.startDealCarousel();
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

    isDealExpired(deal: any): boolean {
        if (!deal.dateEnd) return false;
        const end = new Date(deal.dateEnd).getTime();
        if (isNaN(end)) return false;
        return this.now >= end;
    }

    isDealUrgent(deal: any): boolean {
        if (!deal.dateEnd || this.isDealExpired(deal)) return false;
        const end = new Date(deal.dateEnd).getTime();
        if (isNaN(end)) return false;
        const hoursLeft = (end - this.now) / (1000 * 60 * 60);
        return hoursLeft > 0 && hoursLeft <= 24;
    }

    private startDealCarousel(): void {
        clearInterval(this.dealCarouselTimer);
        if (this.heroCarouselItems.length <= 1) { return; }
        this.dealCarouselTimer = setInterval(() => {
            this.currentDealIndex = (this.currentDealIndex + 1) % this.heroCarouselItems.length;
        }, 4500);
    }

    goToDeal(i: number): void {
        this.currentDealIndex = i;
        this.startDealCarousel();
    }

    nextDeal(): void { this.goToDeal((this.currentDealIndex + 1) % this.heroCarouselItems.length); }
    prevDeal(): void { this.goToDeal((this.currentDealIndex - 1 + this.heroCarouselItems.length) % this.heroCarouselItems.length); }

    // ── Modifié : redirige vers le deal OU vers la fiche produit/annonce boostée ──
    goToDealDetail(item: any): void {
        if (item.kind === 'boosted') {
            this.router.navigate([`/landing/${item.routeType}/${item.id}`]);
        } else {
            this.router.navigate(['/landing/deals', item.id]);
        }
    }

    private mapCardItem(item: any, i: number, type: 'produits' | 'annonces'): any {
        const idCateg = item.IdCateg ?? item.id_categ ?? item.idCateg ?? null;

        const rawImage = item.ImageAd ?? item.ImageProduct ?? item.image ?? item.image_url ?? null;
         console.log('rawImage:', rawImage);
        const firstImagePath = this.extractFirstImagePath(rawImage);
        const folder: 'ads' | 'products' = type === 'produits' ? 'products' : 'ads';
        console.log('firstImagePath:', firstImagePath);
        const image = this.resolveImageUrl(firstImagePath, folder);
        console.log('final URL:', image);

        return {
            id:        item.IdAd ?? item.IdProduct ?? item.IdDeal ?? item.id ?? (i + 1),
            name:      item.TitleAd || item.TitleProduct || item.name || item.title || 'Article',
            category:  (idCateg !== null ? this.categoryNameById[idCateg] : null) || item.category || item.category_name || '',
            price:     typeof item.price === 'number' ? item.price : parseFloat(item.PriceAd ?? item.PriceProduct ?? item.price ?? '0'),
            oldPrice:  item.original_price ? parseFloat(item.original_price) : null,
            seller:    item.Ownerads || item.vendor_name || item.shop_name || item.vendor || item.author_name || '',
            rating:    item.rating || item.avg_rating || 0,
            reviews:   item.review_count || 0,
            badge:     item.discount ? `-${item.discount}%` : null,
            bgColor:   PROD_COLORS[i % PROD_COLORS.length],
            image,
            isPremium: true,
            type,
        };
    }

    private resolveImageUrl(path: any, folder: 'ads' | 'products' | 'deals' | 'prizes'): string | null {
        if (!path || typeof path !== 'string' || !path.trim()) { return null; }
        if (/^https?:\/\//i.test(path)) { return path; }

        const base = this.assetsService.assetsBaseUrl.replace(/\/$/, '');

        if (folder === 'deals' || folder === 'prizes') {
            const filename = path.replace(/^\/+/, '').split('/').pop();
            return `${base}/assets/${folder}/${filename}`;
        }

        let cleanPath = path.replace(/^\/+/, '');

        if (!cleanPath.startsWith('assets/')) {
            const filename = cleanPath.split('/').pop();
            return `${base}/assets/${folder}/images/${filename}`;
        }

        cleanPath = cleanPath.replace(
            /^(assets\/(ads|products)\/)(?!images\/)/,
            '$1images/'
        );
        return `${base}/${cleanPath}`;
    }

    private loadBoostedPlacementItems(): void {
        this.boostedSliderLoading = true;
        this.boostedFooterLoading = true;
        this.boostedLinksLoading = true;
        this.boostedFirstLoginLoading = true;

        const productIds = this.rawLatestProducts
            .map((p: any) => p.IdProduct ?? p.id)
            .filter(Boolean)
            .slice(0, 30);
        const adIds = this.rawLatestAds
            .map((a: any) => a.IdAd ?? a.id)
            .filter(Boolean)
            .slice(0, 30);

        forkJoin({
            products: this.boostService.resolveBoostStatusesDetailed('products', productIds),
            ads:      this.boostService.resolveBoostStatusesDetailed('ads', adIds)
        }).subscribe({
            next: ({ products, ads }) => {
                const buildList = (placementFlag: 'sliders' | 'footer' | 'links' | 'firstLogin') => {
                    const boostedProducts = this.rawLatestProducts
                        .filter((p: any) => {
                            const status = products[p.IdProduct ?? p.id];
                            return !!(status?.isBoosted && status.boost?.pack?.[placementFlag]);
                        })
                        .map((p: any, i: number) => this.mapCardItem(p, i, 'produits'));

                    const boostedAds = this.rawLatestAds
                        .filter((a: any) => {
                            const status = ads[a.IdAd ?? a.id];
                            return !!(status?.isBoosted && status.boost?.pack?.[placementFlag]);
                        })
                        .map((a: any, i: number) => this.mapCardItem(a, i, 'annonces'));

                    return [...boostedProducts, ...boostedAds];
                };

                this.boostedSliderItems = buildList('sliders');
                this.boostedSliderLoading = false;
                this.currentBoostSlideIndex = 0;
                this.buildHeroCarousel();

                this.boostedFooterItems = buildList('footer');
                this.boostedFooterLoading = false;

                // ── Ajout : Links (barre discrète) ──
                this.boostedLinksItems = buildList('links').slice(0, 6);
                this.boostedLinksLoading = false;

                // ── Ajout : FirstLogin (modal à l'ouverture) ──
                this.boostedFirstLoginItems = buildList('firstLogin').slice(0, 4);
                this.boostedFirstLoginLoading = false;
                this.maybeShowFirstLoginBox();
            },
            error: () => {
                this.boostedSliderItems = [];
                this.boostedSliderLoading = false;
                this.boostedFooterItems = [];
                this.boostedFooterLoading = false;
                this.boostedLinksItems = [];
                this.boostedLinksLoading = false;
                this.boostedFirstLoginItems = [];
                this.boostedFirstLoginLoading = false;
                this.buildHeroCarousel();
            }
        });
    }

    // ── Ajout : ouvre la box "première connexion" si le flag posé par
    // LoginComponent est présent en session ET qu'il y a des items
    // firstLogin à montrer. Consomme le flag pour ne l'ouvrir qu'une fois. ──
    private maybeShowFirstLoginBox(): void {
        if (sessionStorage.getItem('showFirstLoginBox') !== 'true') return;
        sessionStorage.removeItem('showFirstLoginBox');
        if (this.boostedFirstLoginItems.length === 0) return;
        if (!this.firstLoginModalRef) return;
        this.modalService.open(this.firstLoginModalRef, { centered: true, size: 'md' });
    }

    private getDemoPremiumAnnonces(): any[] {
        return [
            { id: 201, name: 'Appartement S+2 Vue Mer',  category: 'Immobilier', price: 195000, oldPrice: null, seller: 'ImmoPrime', rating: 4.8, reviews: 34, badge: null, bgColor: '#405189', image: null, isPremium: true, type: 'annonces' },
            { id: 202, name: 'Range Rover Sport 2022',   category: 'Voitures',   price: 320000, oldPrice: null, seller: 'AutoLux',   rating: 5.0, reviews: 21, badge: null, bgColor: '#f06548', image: null, isPremium: true, type: 'annonces' },
            { id: 203, name: 'Villa avec Piscine Hammamet', category: 'Immobilier', price: 480000, oldPrice: null, seller: 'ImmoPrime', rating: 4.9, reviews: 18, badge: null, bgColor: '#0ab39c', image: null, isPremium: true, type: 'annonces' },
            { id: 204, name: 'Mercedes Classe C 2021',   category: 'Voitures',   price: 145000, oldPrice: null, seller: 'AutoLux',   rating: 4.7, reviews: 27, badge: null, bgColor: '#f7b84b', image: null, isPremium: true, type: 'annonces' },
        ];
    }

    private getDemoPremiumProducts(): any[] {
        return [
            { id: 301, name: 'iPhone 15 Pro Max',  category: 'Électronique', price: 2350, oldPrice: 2600, seller: 'TechTunis', rating: 4.9, reviews: 156, badge: null, bgColor: '#6691e7', image: null, isPremium: true, type: 'produits' },
            { id: 302, name: 'MacBook Pro M3 Max',  category: 'Électronique', price: 4200, oldPrice: 4600, seller: 'TechTunis', rating: 4.9, reviews: 89,  badge: null, bgColor: '#0ab39c', image: null, isPremium: true, type: 'produits' },
            { id: 303, name: 'Samsung QLED 65"',    category: 'Électronique', price: 3100, oldPrice: 3500, seller: 'TechTunis', rating: 4.8, reviews: 64,  badge: null, bgColor: '#405189', image: null, isPremium: true, type: 'produits' },
            { id: 304, name: 'Sony A7 IV Kit',      category: 'Électronique', price: 5400, oldPrice: null, seller: 'TechTunis', rating: 5.0, reviews: 31,  badge: null, bgColor: '#f7b84b', image: null, isPremium: true, type: 'produits' },
        ];
    }

    goToPremiumItem(item: any): void {
        this.router.navigate([`/landing/${item.type}/${item.id}`]);
    }

    getCategoryGroups(catId: number | null): { title: string; items: string[] }[] {
        if (catId === null) { return []; }
        return CATEGORY_GROUPS[catId] || [];
    }

    openMegaMenu(catId: number): void {
        clearTimeout(this.megaMenuTimer);
        this.megaMenuCategoryId = catId;
    }

    keepMegaMenuOpen(): void {
        clearTimeout(this.megaMenuTimer);
    }

    closeMegaMenu(): void {
        this.megaMenuTimer = setTimeout(() => { this.megaMenuCategoryId = null; }, 150);
    }

    goToCategory(catId: number): void {
        this.megaMenuCategoryId = null;
        this.router.navigate(['/landing/annonces'], { queryParams: { cat: catId } });
    }

    goToSubcategory(catId: number, item: string): void {
        this.megaMenuCategoryId = null;
        this.router.navigate(['/landing/annonces'], { queryParams: { cat: catId, q: item } });
    }

    onSearch(): void {
        const queryParams: any = {};
        if (this.searchCategoryId !== '') { queryParams.cat = this.searchCategoryId; }
        if (this.searchQuery.trim())      { queryParams.q   = this.searchQuery.trim(); }
        this.router.navigate(['/landing/annonces'], { queryParams });
    }

    get isLoggedIn(): boolean {
        try {
            const raw = localStorage.getItem('currentUser');
            return !!raw && !!JSON.parse(raw);
        } catch {
            return false;
        }
    }

    get currentUser(): any {
        try {
            const raw = localStorage.getItem('currentUser');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    addToCart(product: any): void {
        if (this.isLoggedIn) {
            this.cartService.add(product);
        } else {
            this.triggerLoginToast();
        }
    }

    goToLogin(): void {
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/landing' } });
    }

    toggleUserMenu(event?: Event): void {
        event?.stopPropagation();
        this.userMenuOpen = !this.userMenuOpen;
    }

    closeUserMenu(): void {
        this.userMenuOpen = false;
    }

    logout(): void {
        this.closeUserMenu();
        localStorage.removeItem('currentUser');
        this.router.navigate(['/landing']);
    }

    private triggerLoginToast(): void {
        this.showLoginToast = true;
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => { this.showLoginToast = false; }, 4500);
    }

    dismissToast(): void {
        this.showLoginToast = false;
        clearTimeout(this.toastTimer);
    }

    windowScroll() {
        const navbar = document.getElementById('navbar');
        const scrollY = document.body.scrollTop || document.documentElement.scrollTop;

        this.isScrolled = scrollY > 60;

        if (scrollY > 40) {
            navbar?.classList.add('is-sticky');
        } else {
            navbar?.classList.remove('is-sticky');
        }
        if (scrollY > 60) {
            navbar?.classList.add('is-compact');
        } else {
            navbar?.classList.remove('is-compact');
        }

        const btn = document.getElementById('back-to-top') as HTMLElement;
        if (btn) btn.style.display = (scrollY > 100) ? 'block' : 'none';
    }

    onSectionChange(sectionId: string) { this.currentSection = sectionId; }

    toggleMenu(): void {
        this.mobileMenuOpen = !this.mobileMenuOpen;
    }
    closeMenu(): void {
        this.mobileMenuOpen = false;
    }

    closeMenuOnBackdrop(event: Event): void {
        if (event.target === event.currentTarget) { this.closeMenu(); }
    }

    topFunction() { document.body.scrollTop = 0; document.documentElement.scrollTop = 0; }
    getStars(rating: number): number[] { return Array(Math.floor(rating)).fill(0); }
}