import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';

export interface Product {
  id: number;
  name: string;
  category: string;
  category_name?: string;
  price: number;
  oldPrice?: number;
  discount?: number;
  rating: number;
  reviewCount: number;
  image: string;
  image_url?: string;
  badge?: string;
  badgeClass?: string;
  stock: number;
  views?: number;
  likes?: number;
  dealEndsAt?: string | null;
  isNearlyExpired?: boolean;
  vendor: string;
  vendor_name?: string;
  vendor_id?: number;
}

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
  standalone: false
})
export class ProductsComponent implements OnInit {

  breadCrumbItems = [
    { label: 'Tijara' },
    { label: 'Boutique', active: true }
  ];

  viewMode: 'grid' | 'list' = 'grid';
  searchTerm = '';
  selectedCategory = 'Tous';
  sortBy = 'default';
  currentPage = 1;
  itemsPerPage = 9;
  loading = true;

  priceMin: number | null = null;
  priceMax: number | null = null;
  maxProductPrice = 5000;

  categories: string[] = ['Tous'];

  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  cartItems: { product: Product; qty: number }[] = [];

  constructor(private router: Router, private api: TijaraApiService) {}

  ngOnInit(): void {
    this.loadCart();
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.api.getProducts().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res.data || []);
        this.allProducts = data.map((p: any) => this.mapProduct(p));

        // Build category list from products
        const cats = [...new Set(this.allProducts.map(p => p.category).filter(Boolean))];
        this.categories = ['Tous', ...cats];
        // Set max price slider ceiling
        const prices = this.allProducts.map(p => p.price).filter(Boolean);
        this.maxProductPrice = prices.length ? Math.ceil(Math.max(...prices) / 100) * 100 : 5000;
        this.loading = false;
        this.applyFilters();
      },
      error: () => { this.loading = false; }
    });
  }

  // ── Mapping Product (Laravel, PascalCase) -> forme attendue par le template ──
  // Même logique que mapProduct() dans seller-details.component.ts, qui a été
  // confirmée fonctionnelle contre la vraie forme renvoyée par /api/products.
  private mapProduct(p: any): Product {
    const rawImg = p.ImageProduct ?? p.image_url ?? p.image;
    const firstImg = Array.isArray(rawImg) ? rawImg[0] : rawImg;
    let image = 'assets/images/products/img-1.png';
    if (firstImg) {
      const clean = String(firstImg).replace(/\\/g, '/');
      const filename = clean.split('/').pop();
      image = clean.startsWith('http')
        ? clean
        : this.api.assetsBaseUrl + '/assets/products/images/' + filename;
    }

    // Products n'ont pas de date de fin cote back (contrairement aux Deals) -> jamais de countdown ici
    const dealDate = null;
    const isNearlyExpired = false;
    const badge = p.badge ?? (p.discount ? '-' + p.discount + '%' : '');
    const badgeClass = p.badgeClass || 'bg-primary-subtle text-primary';

    return {
      id:            p.IdProduct ?? p.id,
      name:          p.TitleProduct || p.title || p.name || 'Sans titre',
      category:      p.category_name || p.category || 'Autre',
      category_name: p.category_name,
      price:         parseFloat(p.PriceProduct ?? p.price ?? '0') || 0,
      rating:        parseFloat(p.avg_rating || p.rating || '0') || 0,
      reviewCount:   p.review_count || 0,
      image,
      image_url:     image,
      stock:         p.stock ?? p.Stock ?? 0,
      views:         Number(p.nbrViews ?? p.NbrViews ?? p.views ?? p.views_count ?? p.Views ?? 0) || 0,
      likes:         Number(p.likes ?? p.like_count ?? p.NbLikes ?? p.NbrLikes ?? p.Likes ?? 0) || 0,
      dealEndsAt:    dealDate,
      isNearlyExpired,
      badge,
      badgeClass,
      vendor:        p.vendor_name || p.shop_name || 'Vendeur',
      vendor_name:   p.vendor_name,
      vendor_id:     Number(p.IdUser ?? p.vendor_id) || undefined,
    };
  }

  private get cartKey(): string {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
      return u?.id ? 'tijara_cart_' + u.id : 'tijara_cart_guest';
    } catch { return 'tijara_cart_guest'; }
  }

  loadCart() {
    const saved = localStorage.getItem(this.cartKey);
    this.cartItems = saved ? JSON.parse(saved) : [];
  }

  get pagedProducts(): Product[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredProducts.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredProducts.length / this.itemsPerPage);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  applyFilters() {
    let result = [...this.allProducts];
    if (this.selectedCategory !== 'Tous') {
      result = result.filter(p => p.category === this.selectedCategory);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.vendor.toLowerCase().includes(term)
      );
    }
    if (this.priceMin !== null && this.priceMin > 0) {
      result = result.filter(p => p.price >= this.priceMin!);
    }
    if (this.priceMax !== null && this.priceMax > 0) {
      result = result.filter(p => p.price <= this.priceMax!);
    }
    switch (this.sortBy) {
      case 'price_asc':  result.sort((a, b) => a.price - b.price); break;
      case 'price_desc': result.sort((a, b) => b.price - a.price); break;
      case 'rating':     result.sort((a, b) => b.rating - a.rating); break;
      case 'newest':     result.sort((a, b) => b.id - a.id); break;
    }
    this.filteredProducts = result;
    this.currentPage = 1;
  }

  selectCategory(cat: string) {
    this.selectedCategory = cat;
    this.applyFilters();
  }

  resetFilters() {
    this.searchTerm = '';
    this.selectedCategory = 'Tous';
    this.priceMin = null;
    this.priceMax = null;
    this.sortBy = 'default';
    this.applyFilters();
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.selectedCategory !== 'Tous') count++;
    if (this.searchTerm.trim()) count++;
    if (this.priceMin) count++;
    if (this.priceMax) count++;
    return count;
  }

  categoryCount(cat: string): number {
    if (cat === 'Tous') return this.allProducts.length;
    return this.allProducts.filter(p => p.category === cat).length;
  }

  getStars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  getDealCountdown(product: Product): string {
    if (!product.dealEndsAt) return '';
    const remainingMs = Date.parse(product.dealEndsAt) - Date.now();
    if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 'Expiré';
    const totalMinutes = Math.max(0, Math.floor(remainingMs / 60000));
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return days + 'j ' + hours + 'h';
    if (hours > 0) return hours + 'h ' + minutes + 'm';
    return minutes + 'm';
  }

  getDealBadgeClass(product: Product): string {
    return product.isNearlyExpired ? 'bg-warning-subtle text-warning' : 'bg-info-subtle text-info';
  }

  addToCart(product: Product) {
    const existing = this.cartItems.find(i => i.product.id === product.id);
    if (existing) { existing.qty++; } else { this.cartItems.push({ product, qty: 1 }); }
    localStorage.setItem(this.cartKey, JSON.stringify(this.cartItems));
    const btn = document.getElementById('cart-btn-' + product.id);
    if (btn) {
      btn.classList.add('btn-success');
      btn.innerHTML = '<i class="ri-check-line"></i>';
      setTimeout(() => {
        btn.classList.remove('btn-success');
        btn.innerHTML = '<i class="ri-shopping-cart-line"></i>';
      }, 1200);
    }
  }

  isInCart(productId: number): boolean {
    return this.cartItems.some(i => i.product.id === productId);
  }

  goDetail(id: number) { this.router.navigate(['/shop/product-detail', id]); }
  goCart() { this.router.navigate(['/shop/cart']); }
  goSeller(vendorId: number) { this.router.navigate(['/shop/seller-details', vendorId]); }

  get cartCount(): number {
    return this.cartItems.reduce((sum, i) => sum + i.qty, 0);
  }
}



