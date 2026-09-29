import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { IaApiService } from 'src/app/core/services/ia-api.service';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  standalone: false
})
export class ProductDetailComponent implements OnInit {

  breadCrumbItems = [
    { label: 'Boutique', link: '/shop/products' },
    { label: 'Détail produit', active: true }
  ];

  // ⚠️ AJOUTÉ — type de l'item affiché, lu depuis le queryParam ?type=
  // envoyé par seller-details.component.ts (goDetail). Par défaut 'product'
  // pour ne rien casser sur tous les liens existants qui ne passent pas
  // ce paramètre (products.component, listing.component, etc. — tous
  // pointent déjà légitimement vers des produits).
  itemType: 'product' | 'ad' = 'product';

  product: any = null;
  loading = true;
  quantity = 1;
  selectedImage = '';
  activeTab = 'description';
  cartItems: { product: any; qty: number }[] = [];
  addedToCart = false;
  relatedProducts: any[]  = [];
  similarProducts: any[]  = [];
  aiScore: any            = null;
  loadingSimilar          = false;

  // Reviews
  reviews: any[]   = [];
  reviewStats: any = null;
  reviewsLoading   = false;
  myRating         = 0;
  myComment        = '';
  submittingReview = false;
  reviewError      = '';
  reviewSuccess    = '';
  currentUserId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: TijaraApiService,
    private ia: IaApiService
  ) {}

  private get cartKey(): string {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
      return u?.id ? `tijara_cart_${u.id}` : 'tijara_cart_guest';
    } catch { return 'tijara_cart_guest'; }
  }

  ngOnInit(): void {
    const saved = localStorage.getItem(this.cartKey);
    this.cartItems = saved ? JSON.parse(saved) : [];

    const raw = localStorage.getItem('currentUser');
    if (raw) { try { this.currentUserId = JSON.parse(raw).id; } catch {} }

    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      const type = this.route.snapshot.queryParamMap.get('type');
      this.itemType = type === 'ad' ? 'ad' : 'product';

      if (!id) return;

      if (this.itemType === 'ad') {
        this.loadAnnonce(id);
      } else {
        this.loadProduct(id);
      }
    });
  }

  loadProduct(id: number): void {
    this.loading = true;
    this.api.getProduct(id).subscribe({
      next: (p: any) => {
        this.product = {
          ...p,
          id:       p.id ?? p.IdProduct,
          image:    p.image_url || 'assets/images/products/img-1.png',
          category: p.category_name || 'Autre',
          vendor:   p.vendor_name || 'Vendeur',
          rating:   p.avg_rating || 0,
          reviewCount: p.review_count || 0,
        };
        this.selectedImage = this.product.image;
        this.loading = false;
        this.addedToCart = this.cartItems.some(i => i.product.id === id);
        this.loadReviews(id);
        this.loadSimilarProducts(id);
        this.loadAiScore(id);
      },
      error: () => { this.loading = false; }
    });
  }

  // ⚠️ AJOUTÉ — équivalent de loadProduct() pour une annonce (table `Ads`,
  // pas `Products`). Utilise l'endpoint unitaire déjà existant
  // getAnnonce(id) -> GET /ads/{id}, pas de filtrage client nécessaire.
  //
  // Les avis, produits similaires et le score IA sont des fonctionnalités
  // liées uniquement aux Products côté back (endpoints /products/{id}/reviews,
  // IA...). Il n'existe aucun endpoint équivalent pour les Ads → on ne les
  // appelle pas pour éviter d'interroger getProductReviews()/getPrediction()
  // avec un id qui appartient à une table différente (ça renverrait les avis
  // d'un Product qui a accidentellement le même id numérique — faux positif
  // silencieux, pire qu'une absence de données).
  loadAnnonce(id: number): void {
    this.loading = true;
    this.api.getAnnonce(id).subscribe({
      next: (a: any) => {
        const raw = (a as any)?.data ?? a;
        const rawImg = raw.ImageAd ?? raw.image;
        const firstImg = Array.isArray(rawImg) ? rawImg[0] : rawImg;
        const image = firstImg
          ? (String(firstImg).startsWith('http')
              ? firstImg
              : `${this.api.assetsBaseUrl}/assets/products/images/${String(firstImg).replace(/\\/g, '/').split('/').pop()}`)
          : 'assets/images/products/img-1.png';

        this.product = {
          id: raw.IdAd,
          title: raw.TitleAd || 'Sans titre',
          description: raw.DescriptionAd || raw.DetailsAd || '',
          price: parseFloat(raw.PriceAd ?? '0') || 0,
          image,
          category: raw.category_name || 'Autre',
          vendor: raw.vendor_name || 'Vendeur',
          vendorId: raw.IdUser,
          rating: 0,
          reviewCount: 0,
          stock: null, // pas de notion de stock pour une annonce
        };
        this.selectedImage = this.product.image;
        this.loading = false;
        this.addedToCart = this.cartItems.some(i => i.product.id === id);
        // Pas d'avis, de similaires ni de score IA pour une annonce.
        this.reviews = [];
        this.reviewStats = null;
        this.reviewsLoading = false;
        this.similarProducts = [];
        this.loadingSimilar = false;
        this.aiScore = null;
      },
      error: () => { this.loading = false; }
    });
  }

  loadReviews(productId: number): void {
    this.reviewsLoading = true;
    this.api.getProductReviews(productId).subscribe({
      next: (res: any) => {
        this.reviews      = res.reviews || [];
        this.reviewStats  = res.stats;
        this.reviewsLoading = false;
        const mine = this.reviews.find(r => r.user_id === this.currentUserId);
        if (mine) { this.myRating = mine.rating; this.myComment = mine.comment || ''; }
      },
      error: () => { this.reviewsLoading = false; }
    });
  }

  loadSimilarProducts(productId: number): void {
    this.loadingSimilar = true;
    this.ia.getSimilarProducts(productId).subscribe({
      next: (res: any) => {
        this.similarProducts = (res.similar || []).slice(0, 4);
        this.loadingSimilar  = false;
      },
      error: () => { this.loadingSimilar = false; }
    });
  }

  loadAiScore(productId: number): void {
    this.ia.getPrediction(productId).subscribe({
      next: (res: any) => { this.aiScore = res; },
      error: () => {}
    });
  }

  get aiScoreClass(): string {
    const s = this.aiScore?.success_score || 0;
    if (s >= 70) return 'text-success';
    if (s >= 40) return 'text-warning';
    return 'text-danger';
  }

  get aiScoreBg(): string {
    const s = this.aiScore?.success_score || 0;
    if (s >= 70) return 'bg-success';
    if (s >= 40) return 'bg-warning';
    return 'bg-danger';
  }

  submitReview(): void {
    if (!this.myRating) { this.reviewError = 'Veuillez sélectionner une note.'; return; }
    if (!this.currentUserId) { this.reviewError = 'Connectez-vous pour laisser un avis.'; return; }

    this.submittingReview = true;
    this.reviewError      = '';
    this.reviewSuccess    = '';

    this.api.addReview(this.product.id, { rating: this.myRating, comment: this.myComment }).subscribe({
      next: () => {
        this.submittingReview = false;
        this.reviewSuccess    = 'Votre avis a été enregistré !';
        this.loadReviews(this.product.id);
      },
      error: (err: any) => {
        this.submittingReview = false;
        this.reviewError = err?.error?.message || 'Erreur lors de l\'envoi.';
      }
    });
  }

  get avgRating(): number {
    return this.reviewStats?.avg_rating ? parseFloat(this.reviewStats.avg_rating.toFixed(1)) : 0;
  }

  getRatingPct(star: number): number {
    if (!this.reviewStats?.total) return 0;
    const key = `r${star}` as keyof typeof this.reviewStats;
    return Math.round((this.reviewStats[key] / this.reviewStats.total) * 100);
  }

  getStars(n: number): number[] { return Array.from({ length: 5 }, (_, i) => i + 1); }

  increaseQty() { if (this.product && (this.product.stock == null || this.quantity < this.product.stock)) this.quantity++; }
  decreaseQty() { if (this.quantity > 1) this.quantity--; }

  addToCart() {
    if (!this.product) return;
    const existing = this.cartItems.find(i => i.product.id === this.product.id);
    if (existing) { existing.qty += this.quantity; } else { this.cartItems.push({ product: this.product, qty: this.quantity }); }
    localStorage.setItem(this.cartKey, JSON.stringify(this.cartItems));
    this.addedToCart = true;
  }

  buyNow() { this.addToCart(); this.router.navigate(['/shop/cart']); }
  goBack() { this.router.navigate(['/shop/products']); }
  goSeller(vendorId: number) { this.router.navigate(['/shop/seller-details', vendorId]); }
  goRelated(id: number) { this.router.navigate(['/shop/product-detail', id]); }
}
