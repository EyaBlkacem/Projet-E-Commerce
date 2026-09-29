import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';

@Component({
  selector: 'app-sellers',
  templateUrl: './sellers.component.html',
  styleUrls: ['./sellers.component.scss'],
  standalone: false
})
export class SellersComponent implements OnInit {

  breadCrumbItems = [
    { label: 'Boutique', link: '/shop/products' },
    { label: 'Vendeurs', active: true }
  ];

  vendors: any[] = [];
  loading = true;
  error = '';
  search = '';

  page = 1;
  limit = 12;
  total = 0;

  constructor(
    private router: Router,
    private api: TijaraApiService
  ) {}

  ngOnInit(): void {
    this.loadVendors();
  }

  loadVendors(): void {
    this.loading = true;
    this.error = '';
    this.api.getVendors({ search: this.search || undefined, page: this.page, per_page: this.limit }) // ✅ CORRIGÉ — limit ignoré par le backend
      .subscribe({
        next: (res: any) => {
          this.vendors = res.data || [];
          this.total   = res.total || 0;
          this.loading = false;
        },
        error: () => {
          this.error   = 'Impossible de charger les vendeurs.';
          this.loading = false;
        }
      });
  }

  onSearch(): void {
    this.page = 1;
    this.loadVendors();
  }

  vendorInitials(v: any): string {
    const f = v.first_name?.[0] || '';
    const l = v.last_name?.[0] || '';
    return (f + l).toUpperCase() || '?';
  }

  goToVendor(id: number): void {
    this.router.navigate(['/shop/seller-details', id]);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.loadVendors();
  }
}

