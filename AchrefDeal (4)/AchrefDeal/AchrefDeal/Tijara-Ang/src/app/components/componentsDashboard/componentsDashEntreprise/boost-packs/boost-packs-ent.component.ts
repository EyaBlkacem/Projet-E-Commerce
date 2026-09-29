import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BoostPremiumService } from 'src/app/core/services/boost-premium.service';
import { AnnoncesService } from 'src/app/core/services/annonces.service';
import { ProductsService } from 'src/app/core/services/products.service';
import { BoostPack, BoostStatus } from 'src/app/core/models/boost-premium.models';

interface SelectableItem {
  type: 'product' | 'ad';
  id: number;
  label: string;
}

@Component({
  selector: 'app-boost-packs-ent',
  standalone: false,
  template: `
<app-breadcrumbs title="Packs de boost" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<div class="card border-0 shadow-sm mb-4 overflow-hidden"
     style="background:linear-gradient(135deg,#f06548 0%,#f7b84b 100%)">
  <div class="card-body text-white py-4">
    <div class="d-flex flex-wrap align-items-center gap-3">
      <div class="avatar-lg rounded-3 d-flex align-items-center justify-content-center"
           style="background:rgba(255,255,255,.2)">
        <i class="ri-rocket-2-line fs-1"></i>
      </div>
      <div class="flex-grow-1">
        <h3 class="text-white mb-1">
          @if (targetId) {
            Boostez "{{ targetLabel }}" 🚀
          } @else {
            Boostez votre visibilité 🚀
          }
        </h3>
        <p class="text-white-50 mb-0">Choisissez un pack pour mettre en avant vos annonces sur Tijara.</p>
      </div>
    </div>
  </div>
</div>

<!-- ─── Erreur de chargement du statut boost (réseau, item supprimé...) ─── -->
@if (statusError) {
  <div class="alert alert-warning d-flex align-items-center justify-content-between">
    <span><i class="ri-error-warning-line me-1"></i>{{ statusError }}</span>
    <button class="btn btn-sm btn-outline-secondary" (click)="loadStatus()">Réessayer</button>
  </div>
}

<!-- ─── Sélecteur produit/annonce (si aucune cible n'a été passée en query params) ─── -->
@if (!targetId) {
  <div class="card border-0 shadow-sm mb-4">
    <div class="card-body">
      <h6 class="mb-3"><i class="ri-cursor-line me-1"></i>Choisissez ce que vous voulez booster</h6>

      @if (loadingMyItems) {
        <div class="text-muted fs-13"><i class="ri-loader-4-line"></i> Chargement de vos produits et annonces...</div>
      } @else if (myItems.length === 0) {
        <p class="text-muted fs-13 mb-0">Vous n'avez ni produit ni annonce à booster pour le moment.</p>
      } @else {
        <div class="row g-2">
          <div class="col-md-6">
            <select class="form-select" [(ngModel)]="selectedItemKey">
              <option value="" disabled selected>-- Sélectionnez un produit ou une annonce --</option>
              @for (grp of groupedMyItems; track grp.type) {
                <optgroup [label]="grp.type === 'product' ? 'Mes produits' : 'Mes annonces'">
                  @for (it of grp.items; track it.id) {
                    <option [value]="it.type + ':' + it.id">{{ it.label }}</option>
                  }
                </optgroup>
              }
            </select>
          </div>
          <div class="col-md-3">
            <button class="btn btn-danger w-100" [disabled]="!selectedItemKey" (click)="confirmSelection()">
              Choisir
            </button>
          </div>
        </div>
      }
    </div>
  </div>
}

@if (targetId && currentStatus) {
  <div class="alert d-flex align-items-center justify-content-between flex-wrap gap-2"
       [class.alert-success]="currentStatus.isBoosted" [class.alert-secondary]="!currentStatus.isBoosted">
    <div>
      @if (currentStatus.isBoosted && currentStatus.boost) {
        <i class="ri-rocket-2-fill me-1"></i>
        Actuellement boosté avec le pack <strong>{{ currentStatus.boost.pack?.title }}</strong>
        — expire le {{ currentStatus.boost.endDate | date:'dd/MM/yyyy' }}
        <span class="badge bg-success ms-1">{{ daysLeft(currentStatus.boost.endDate) }} j restants</span>
      } @else {
        <i class="ri-information-line me-1"></i> Pas de boost actif pour le moment.
      }
    </div>
    @if (currentStatus.isBoosted) {
      <button class="btn btn-sm btn-outline-danger" (click)="startRemoval()" [disabled]="removing || pendingRemoval">
        {{ removing ? 'Retrait...' : 'Retirer le boost' }}
      </button>
    }
  </div>
  <div class="mb-3">
    <button class="btn btn-sm btn-outline-secondary" (click)="clearSelection()">
      <i class="ri-arrow-left-line me-1"></i>Changer de produit/annonce
    </button>
  </div>
}

<!-- ─── Confirmation de retrait du boost (remplace window.confirm/alert) ─── -->
@if (pendingRemoval) {
  <div class="card border-warning border-2 shadow-sm mb-4">
    <div class="card-body">
      <h6 class="mb-2"><i class="ri-error-warning-line me-1"></i>Confirmer le retrait du boost</h6>
      <p class="mb-3">
        Le boost actuel sera retiré immédiatement. Il ne sera <strong>pas remboursé</strong>.
      </p>
      @if (removeError) {
        <div class="alert alert-danger py-2 fs-13">{{ removeError }}</div>
      }
      <div class="d-flex gap-2">
        <button class="btn btn-danger" (click)="confirmRemoval()" [disabled]="removing">
          {{ removing ? 'Retrait...' : 'Confirmer le retrait' }}
        </button>
        <button class="btn btn-outline-secondary" (click)="cancelRemoval()" [disabled]="removing">
          Annuler
        </button>
      </div>
    </div>
  </div>
}

<!-- ─── Confirmation d'achat (remplace window.confirm/alert) ─── -->
@if (pendingPack) {
  <div class="card border-danger border-2 shadow-sm mb-4">
    <div class="card-body">
      <h6 class="mb-2"><i class="ri-shopping-cart-line me-1"></i>Confirmer l'achat</h6>
      <p class="mb-1">
        Pack <strong>{{ pendingPack.title }}</strong> — durée max {{ pendingPack.maxDuration }} jours
      </p>
      <p class="mb-3">
        Montant à débiter de votre wallet :
        <strong class="text-danger">{{ pendingPack.price | number:'1.0-2' }} TND</strong>
      </p>
      @if (purchaseError) {
        <div class="alert alert-danger py-2 fs-13">{{ purchaseError }}</div>
      }
      <div class="d-flex gap-2">
        <button class="btn btn-danger" (click)="confirmPurchase()" [disabled]="purchasingId !== null">
          {{ purchasingId !== null ? 'Traitement...' : 'Confirmer et payer' }}
        </button>
        <button class="btn btn-outline-secondary" (click)="cancelPurchase()" [disabled]="purchasingId !== null">
          Annuler
        </button>
      </div>
    </div>
  </div>
}

@if (loading) {
  <div class="text-center py-5"><div class="spinner-border text-danger"></div></div>
} @else if (packs.length === 0) {
  <div class="card border-0 shadow-sm">
    <div class="card-body text-center py-5">
      <i class="ri-rocket-line display-3 text-muted opacity-50"></i>
      <p class="text-muted mt-2 mb-0">Aucun pack disponible pour le moment.</p>
    </div>
  </div>
} @else {
  <div class="row g-3">
    @for (p of packs; track p.id) {
      <div class="col-md-6 col-xl-4">
        <div class="card border-0 shadow-sm h-100 pack-card">
          <div class="card-header bg-danger-subtle text-center py-3">
            <h5 class="mb-0 fw-bold text-danger">
              <i class="ri-rocket-2-line me-1"></i>{{ p.title }}
            </h5>
          </div>
          <div class="card-body text-center">
            <div class="d-flex align-items-baseline justify-content-center gap-2 mb-2">
              <h2 class="mb-0 fw-bold text-success">{{ p.price | number:'1.0-2' }}</h2>
              <span class="text-muted">TND</span>
            </div>
            @if (p.discount > 0) {
              <span class="badge bg-danger mb-3">-{{ p.discount }}%</span>
            }
            <p class="text-muted fs-12 mb-3">
              <i class="ri-time-line"></i> Durée max <strong>{{ p.maxDuration }}</strong> jours
            </p>
            <ul class="list-unstyled fs-13 text-start mb-0">
              @if (p.sliders)     { <li class="text-success mb-1"><i class="ri-check-double-line me-1"></i>Slider d'accueil</li> }
              @if (p.sideBar)     { <li class="text-success mb-1"><i class="ri-check-double-line me-1"></i>Sidebar</li> }
              @if (p.footer)      { <li class="text-success mb-1"><i class="ri-check-double-line me-1"></i>Footer</li> }
              @if (p.relatedPost) { <li class="text-success mb-1"><i class="ri-check-double-line me-1"></i>Posts similaires</li> }
              @if (p.firstLogin)  { <li class="text-success mb-1"><i class="ri-check-double-line me-1"></i>Box 1ère connexion</li> }
              @if (p.links)       { <li class="text-success mb-1"><i class="ri-check-double-line me-1"></i>Liens premium</li> }
              @if (!p.sliders && !p.sideBar && !p.footer && !p.relatedPost && !p.firstLogin && !p.links) {
                <li class="text-muted mb-1 fst-italic">Aucune option incluse</li>
              }
            </ul>
          </div>
          <div class="card-footer bg-white border-top">
            @if (targetId) {
              <button class="btn btn-danger w-100" (click)="startPurchase(p)" [disabled]="purchasingId !== null || pendingPack !== null">
                <i class="ri-shopping-cart-line me-1"></i>Booster avec ce pack
              </button>
            } @else {
              <button class="btn btn-outline-secondary w-100" disabled>
                Sélectionnez d'abord un produit/annonce
              </button>
            }
          </div>
        </div>
      </div>
    }
  </div>
}
`,
  styles: [`.pack-card { transition: transform .15s, box-shadow .15s; }
            .pack-card:hover { transform: translateY(-4px); box-shadow: 0 .8rem 1.5rem rgba(0,0,0,.12) !important; }`]
})
export class BoostPacksEntComponent implements OnInit {
  breadCrumbItems = [{ label: 'Vendeur' }, { label: 'Packs Boost', active: true }];

  packs: BoostPack[] = [];
  loading = true;
  purchasingId: number | null = null;
  removing = false;

  // Contexte de la cible (produit ou annonce), passé en query params
  // (?type=product&id=123&label=NomDuProduit) ou choisi via le sélecteur ci-dessous.
  targetType: 'product' | 'ad' | null = null;
  targetId: number | null = null;
  targetLabel = '';
  currentStatus: BoostStatus | null = null;

  // ✅ AJOUTÉ — message d'erreur si loadStatus() échoue (réseau, item
  // supprimé...). Auparavant l'échec était silencieux : currentStatus
  // restait null sans que l'utilisateur sache pourquoi rien ne s'affichait.
  statusError: string | null = null;

  // ✅ Sélecteur produit/annonce quand aucune cible n'est passée en query params
  myItems: SelectableItem[] = [];
  loadingMyItems = false;
  selectedItemKey = '';

  // ✅ Confirmation d'achat (remplace window.confirm() / alert() natifs)
  pendingPack: BoostPack | null = null;
  purchaseError: string | null = null;

  // ✅ AJOUTÉ — confirmation de retrait de boost (remplace window.confirm()
  // / alert() natifs, pour rester cohérent avec le panneau pendingPack
  // déjà utilisé pour l'achat).
  pendingRemoval = false;
  removeError: string | null = null;

  constructor(
    private boostPremiumService: BoostPremiumService, private annoncesService: AnnoncesService, private productsService: ProductsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const type = qp.get('type');
    const id = qp.get('id');
    this.targetLabel = qp.get('label') ?? '';

    if ((type === 'product' || type === 'ad') && id) {
      this.targetType = type;
      this.targetId = +id;
      this.loadStatus();
    } else {
      this.loadMyItems();
    }

    this.loadPacks();
  }

  get groupedMyItems(): { type: 'product' | 'ad'; items: SelectableItem[] }[] {
    const products = this.myItems.filter(i => i.type === 'product');
    const ads = this.myItems.filter(i => i.type === 'ad');
    const groups: { type: 'product' | 'ad'; items: SelectableItem[] }[] = [];
    if (products.length) groups.push({ type: 'product', items: products });
    if (ads.length) groups.push({ type: 'ad', items: ads });
    return groups;
  }

  // ─── Charge mes produits + mes annonces pour le sélecteur ──────────
  // ⚠️ getMyProducts() renvoie déjà res?.data ?? res ?? [] (mappé dans le
  // service). getMyAnnonces() renvoie la réponse HTTP brute (pas de .data
  // extrait) -> on le gère ici avec adsRes?.data ?? adsRes ?? [].
  private loadMyItems(): void {
    this.loadingMyItems = true;
    this.productsService.getMyProducts().subscribe({
      next: (products: any) => {
        const rawProducts: any[] = Array.isArray(products) ? products : (products?.data ?? []);
        const mappedProducts: SelectableItem[] = rawProducts.map((p: any) => ({
          type: 'product',
          id: p.IdProduct ?? p.id,
          label: p.TitleProduct ?? p.title ?? `Produit #${p.IdProduct ?? p.id}`,
        }));

        this.annoncesService.getMyAnnonces().subscribe({
          next: (adsRes: any) => {
            const rawAds: any[] = adsRes?.data ?? adsRes ?? [];
            const mappedAds: SelectableItem[] = rawAds.map((a: any) => ({
              type: 'ad',
              id: a.IdAd ?? a.id,
              label: a.TitleAd ?? a.title ?? `Annonce #${a.IdAd ?? a.id}`,
            }));

            this.myItems = [...mappedProducts, ...mappedAds];
            this.loadingMyItems = false;
          },
          error: () => { this.myItems = mappedProducts; this.loadingMyItems = false; }
        });
      },
      error: () => { this.loadingMyItems = false; }
    });
  }

  confirmSelection(): void {
    if (!this.selectedItemKey) return;
    const [type, idStr] = this.selectedItemKey.split(':');
    const item = this.myItems.find(i => i.type === type && String(i.id) === idStr);
    if (!item) return;

    this.targetType = item.type;
    this.targetId = item.id;
    this.targetLabel = item.label;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { type: item.type, id: item.id, label: item.label },
      queryParamsHandling: 'merge',
    });

    this.loadStatus();
  }

  clearSelection(): void {
    this.targetType = null;
    this.targetId = null;
    this.targetLabel = '';
    this.currentStatus = null;
    this.statusError = null;
    this.selectedItemKey = '';
    this.pendingPack = null;
    this.pendingRemoval = false;
    this.removeError = null;

    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    this.loadMyItems();
  }

  private loadPacks(): void {
    this.loading = true;
    this.boostPremiumService.getBoostPacks().subscribe({
      next: (packs: BoostPack[]) => {
        // getBoostPacks() renvoie déjà des BoostPack mappés (camelCase) et
        // l'API filtre déjà Active=1 côté requête (getPublicBoostPacks).
        // On garde ce filtre en défensif sur le champ "active" du modèle,
        // au cas où un pack désactivé entre-temps resterait dans le cache
        // ou serait renvoyé sans le filtre serveur.
        this.packs = (packs || []).filter(p => p.active);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  // ✅ CORRIGÉ — gère maintenant l'échec de la requête au lieu de le
  // laisser silencieux. Rendue publique pour permettre le bouton
  // "Réessayer" dans le template.
  loadStatus(): void {
    if (!this.targetId || !this.targetType) return;
    this.statusError = null;
    const status$ = this.targetType === 'product'
      ? this.boostPremiumService.getProductBoostStatus(this.targetId)
      : this.boostPremiumService.getAdBoostStatus(this.targetId); // VERIFIER type produit/ad selon this.type
    status$.subscribe({
      next: (s: any) => { this.currentStatus = s; },
      error: () => {
        this.currentStatus = null;
        this.statusError = 'Impossible de récupérer le statut du boost pour le moment.';
      }
    });
  }

  // ✅ Indicateur "boosté" : nombre de jours restants avant expiration
  daysLeft(endDate: string | null | undefined): number {
    if (!endDate) return 0;
    const end = new Date(endDate).getTime();
    if (isNaN(end)) return 0;
    return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  // ─── Achat étape 1 : ouvre le panneau de confirmation (remplace confirm()) ──
  startPurchase(p: BoostPack): void {
    this.purchaseError = null;
    this.pendingPack = p;
  }

  cancelPurchase(): void {
    this.pendingPack = null;
    this.purchaseError = null;
  }

  // ─── Achat étape 2 : appel réel après confirmation explicite de l'utilisateur ──
  confirmPurchase(): void {
    if (!this.targetId || !this.targetType || !this.pendingPack) return;

    const p = this.pendingPack;
    this.purchasingId = p.id;
    this.purchaseError = null;

    const purchase$ = this.targetType === 'product'
      ? this.boostPremiumService.boostProduct(this.targetId, p.id)
      : this.boostPremiumService.boostAd(this.targetId, p.id); // VERIFIER type produit/ad

    purchase$.subscribe({
      next: () => {
        this.purchasingId = null;
        this.pendingPack = null;
        this.loadStatus();
      },
      error: (err: any) => {
        this.purchasingId = null;
        const status = err?.status;
        if (status === 402) {
          this.purchaseError = 'Solde insuffisant dans votre wallet pour ce pack.';
        } else if (status === 422) {
          this.purchaseError = err?.error?.message ?? 'Wallet introuvable ou requête invalide.';
        } else {
          this.purchaseError = err?.error?.message ?? "Erreur lors de l'achat du boost.";
        }
      }
    });
  }

  // ─── Retrait étape 1 : ouvre le panneau de confirmation ────────────
  // ✅ REMPLACE l'ancien window.confirm() par le même schéma que l'achat
  // (pendingPack -> confirmPurchase), pour rester cohérent avec le reste
  // de l'app qui a déjà banni les dialogues natifs.
  startRemoval(): void {
    this.removeError = null;
    this.pendingRemoval = true;
  }

  cancelRemoval(): void {
    this.pendingRemoval = false;
    this.removeError = null;
  }

  // ─── Retrait étape 2 : appel réel après confirmation explicite ─────
  confirmRemoval(): void {
    if (!this.targetId || !this.targetType) return;

    this.removing = true;
    this.removeError = null;
    const remove$ = this.targetType === 'product'
      ? this.boostPremiumService.removeProductBoost(this.targetId)
      : this.boostPremiumService.removeAdBoost(this.targetId);

    remove$.subscribe({
      next: () => {
        this.removing = false;
        this.pendingRemoval = false;
        this.loadStatus();
      },
      error: (err: any) => {
        this.removing = false;
        this.removeError = err?.error?.message ?? 'Erreur lors du retrait du boost.';
      }
    });
  }
}