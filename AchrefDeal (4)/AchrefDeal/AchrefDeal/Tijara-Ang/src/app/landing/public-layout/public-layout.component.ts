import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { CategoriesService } from 'src/app/core/services/categories.service';
import { MessagesService } from 'src/app/core/services/messages.service';
import { NotificationsService } from 'src/app/core/services/notifications.service';


interface CategoryPill {
  id: number;
  label: string;
  icon: string;
}

interface FeatureLink {
  label: string;
}

@Component({
    selector: 'app-public-layout',
    templateUrl: './public-layout.component.html',
    standalone: false
})
export class PublicLayoutComponent implements OnInit {
    year      = new Date().getFullYear();
    menuOpen  = false;
    cart_length = 0;
    unreadMessages = 0;
    unreadNotifications = 0;
    notifications: any[] = [];

    categories: CategoryPill[] = [];
    activeCatId: number | null = null;

    hoveredCatId: number | null = null;
    private hoverCloseTimer: any = null;
    categoryFeaturesCache: Record<number, FeatureLink[]> = {};
    loadingFeaturesForCatId: number | null = null;

    private readonly CATEGORY_ICONS: Record<string, string> = {
        'Ã‰lectronique':  'ri-cpu-line',
        'VÃªtements':     'ri-t-shirt-line',
        'Alimentation':  'ri-restaurant-2-line',
        'Meubles':       'ri-sofa-line',
        'Voitures':      'ri-car-line',
        'Immobilier':    'ri-home-4-line',
        'BeautÃ©':        'ri-heart-pulse-line',
        'Sports':        'ri-basketball-line',
        'Livres':        'ri-book-2-line',
        'Services':      'ri-tools-line',
    };

    get isLoggedIn(): boolean {
        try { return !!localStorage.getItem('currentUser'); } catch { return false; }
    }
    get currentUser(): any {
        try { const r = localStorage.getItem('currentUser'); return r ? JSON.parse(r) : null; } catch { return null; }
    }

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private categoriesService: CategoriesService,
        private messagesService: MessagesService,
        private notificationsService: NotificationsService
    ) {}

    ngOnInit(): void {
        this.loadCategories();
        this.syncActiveCatFromUrl();
        this.loadCartCount();
        this.loadUnreadMessages();
        this.loadNotifications();
        setInterval(() => {
            this.loadCartCount();
            this.loadUnreadMessages();
            this.loadNotifications();
        }, 20000);

        this.router.events
            .pipe(filter(e => e instanceof NavigationEnd))
            .subscribe(() => this.syncActiveCatFromUrl());

        window.addEventListener('tijara-cart-updated', () => this.loadCartCount());
    }

    private syncActiveCatFromUrl(): void {
        const catParam = this.route.snapshot.firstChild?.queryParamMap.get('cat')
            ?? new URLSearchParams(window.location.search).get('cat');
        this.activeCatId = catParam ? Number(catParam) : null;
    }

    private loadCategories(): void {
        this.categoriesService.getCategories().subscribe({
            next: (r: any) => {
                const raw: any[] = Array.isArray(r) ? r : (r?.categories || []);
                this.categories = raw
                    .map((cat: any) => {
                        const id = cat.id ?? cat.IdCateg ?? cat.idCateg ?? null;
                        const label = cat.name_fr ?? cat.TitleFr ?? cat.title_fr ?? cat.name ?? '';
                        return {
                            id: id != null ? Number(id) : null,
                            label,
                            icon: this.CATEGORY_ICONS[label] || 'ri-price-tag-3-line',
                        };
                    })
                    .filter((cat): cat is CategoryPill => cat.id !== null && !!cat.label);
            },
            error: () => { this.categories = []; }
        });
    }

    onPillEnter(catId: number): void {
        clearTimeout(this.hoverCloseTimer);
        this.hoveredCatId = catId;

        if (this.categoryFeaturesCache[catId]) return;

        this.loadingFeaturesForCatId = catId;
        this.categoriesService.getCategoryFeatures(catId).subscribe({
            next: (data: any[]) => {
                const features = Array.isArray(data) ? data : [];
                this.categoryFeaturesCache[catId] = features
                    .map((f: any) => ({ label: f.nameFr ?? f.name_fr ?? f.name ?? '' }))
                    .filter(f => !!f.label);
                if (this.loadingFeaturesForCatId === catId) this.loadingFeaturesForCatId = null;
            },
            error: () => {
                this.categoryFeaturesCache[catId] = [];
                if (this.loadingFeaturesForCatId === catId) this.loadingFeaturesForCatId = null;
            }
        });
    }

    onPillLeave(): void {
        this.hoverCloseTimer = setTimeout(() => { this.hoveredCatId = null; }, 200);
    }

    keepPanelOpen(): void {
        clearTimeout(this.hoverCloseTimer);
    }

    getFeaturesFor(catId: number): FeatureLink[] {
        return this.categoryFeaturesCache[catId] || [];
    }

    selectCategory(catId: number): void {
        this.activeCatId = catId;
        this.hoveredCatId = null;
        this.menuOpen = false;
        this.router.navigate(['/landing/annonces'], { queryParams: { cat: catId } });
    }

    selectFeature(catId: number, featureLabel: string): void {
        this.activeCatId = catId;
        this.hoveredCatId = null;
        this.menuOpen = false;
        this.router.navigate(['/landing/annonces'], {
            queryParams: { cat: catId, feature: featureLabel }
        });
    }

    clearCategory(): void {
        this.activeCatId = null;
        this.router.navigate(['/landing/annonces']);
    }

    logout(): void {
        localStorage.removeItem('currentUser');
        this.router.navigate(['/landing']);
    }

    windowScroll(): void {
        const el = document.getElementById('pub-navbar');
        if (!el) return;
        if (document.documentElement.scrollTop > 50) el.classList.add('is-sticky');
        else el.classList.remove('is-sticky');
    }

    loadCartCount(): void {
        try {
            const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const key = u?.id ? `tijara_cart_${u.id}` : 'tijara_cart_guest';
            const cart = JSON.parse(localStorage.getItem(key) || '[]');
            this.cart_length = cart.reduce((sum: number, i: any) => sum + (i.qty || 1), 0);
        } catch { this.cart_length = 0; }
    }

    loadUnreadMessages(): void {
        if (!this.isLoggedIn) return;
        this.messagesService.getConversations().subscribe({
            next: (data: any[]) => {
                this.unreadMessages = data.reduce((s: number, c: any) => s + (c.unread_count || 0), 0);
            },
            error: () => {}
        });
    }

    loadNotifications(): void {
        if (!this.isLoggedIn) return;
        forkJoin({
            list: this.notificationsService.getNotifications(),
            unread: this.notificationsService.getUnreadNotificationsCount()
        }).subscribe({
            next: ({ list, unread }: any) => {
                this.notifications = list?.data ?? [];
                this.unreadNotifications = unread?.unread ?? 0;
            },
            error: () => {}
        });
    }

    markAllRead(): void {
        this.notificationsService.markAllNotificationsRead().subscribe({
            next: () => {
                this.notifications.forEach((n: any) => n.IsRead = 1);
                this.unreadNotifications = 0;
            }
        });
    }

    onNotificationClick(n: any): void {
        if (!n.IsRead) {
            this.notificationsService.markNotificationRead(n.IdNotification).subscribe({
                next: () => {
                    n.IsRead = 1;
                    this.unreadNotifications = Math.max(0, this.unreadNotifications - 1);
                }
            });
        }
        this.router.navigate(['/users/messages']);
    }
}
