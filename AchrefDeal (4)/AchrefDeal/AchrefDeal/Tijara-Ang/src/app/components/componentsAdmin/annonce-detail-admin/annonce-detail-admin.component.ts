import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { CategoriesService } from 'src/app/core/services/categories.service';
import { ReviewsService } from 'src/app/core/services/reviews.service';
import { UsersVendorsService } from 'src/app/core/services/users-vendors.service';
import { AnnoncesService } from 'src/app/core/services/annonces.service';
import { CategoryStyleService } from 'src/app/core/services/category-style.service';
import { CatalogAdminService } from 'src/app/core/services/catalog-admin.service';

interface FeatureRow {
  idFV:  number | null; 
  title: string;        
  value: string;        
  unit:  string;        
}

interface ImageEntry {
  url:    string;
  index:  number;  
  broken?: boolean; 
}

interface AnnonceDetail {
  id:             number;
  title:          string;
  description:    string;
  price:          string;
  image:          string;
  images:         ImageEntry[];
  features:       FeatureRow[];
  category:       string;
  location:       string;
  authorId:       number | null;
  authorName:     string;
  authorVerified: boolean;
  shopName:       string;
  active:         boolean;
  date:           string | null;
  likesCount:     number;
  commentsCount:  number;
  
  phone:          string;
  email:          string;
}

interface CommentRow {
  id: number;
  content: string;
  author_name: string;
  created_at: string;
}

@Component({
  selector: 'app-annonce-detail-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Détail de l'annonce" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

@if (loading) {
  <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
} @else if (!annonce) {
  <div class="card border-0 shadow-sm">
    <div class="card-body text-center py-5">
      <i class="ri-file-search-line display-3 text-muted opacity-50"></i>
      <h5 class="mt-3">Annonce introuvable</h5>
      <a routerLink="/admin/annonces" class="btn btn-primary mt-2">Retour à la liste</a>
    </div>
  </div>
} @else {

  <!-- ═════ En-tête ═════ -->
  <div class="card border-0 shadow-sm mb-4">
    <div class="card-body d-flex flex-wrap align-items-start justify-content-between gap-3">
      <div class="d-flex align-items-center gap-2">
        <a routerLink="/admin/annonces" class="btn btn-light btn-sm rounded-circle" style="width:36px;height:36px">
          <i class="ri-arrow-left-line"></i>
        </a>
        <div>
          <h4 class="fw-bold mb-1">{{ annonce.title }}</h4>
          <span class="badge rounded-pill" [class]="annonce.active ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'">
            <i [class]="annonce.active ? 'ri-checkbox-circle-fill me-1' : 'ri-time-fill me-1'"></i>
            {{ annonce.active ? 'Approuvée' : 'En attente' }}
          </span>
          <span class="text-muted fs-12 ms-2">ID #{{ annonce.id }}</span>
        </div>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <button *ngIf="!annonce.active" class="btn btn-success btn-sm" (click)="approve()">
          <i class="ri-check-line me-1"></i>Approuver
        </button>
        <button *ngIf="annonce.active" class="btn btn-warning btn-sm text-white" (click)="reject()">
          <i class="ri-close-line me-1"></i>Désapprouver
        </button>
        <button *ngIf="!editMode" class="btn btn-primary btn-sm" (click)="startEdit()">
          <i class="ri-edit-line me-1"></i>Modifier
        </button>
      </div>
    </div>
  </div>

  <div class="row g-4">
    <!-- ═════ Colonne principale ═════ -->
    <div class="col-lg-8">
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body">

          @if (!editMode) {
            <!-- ── Mode lecture : image unique ── -->
            <div class="mb-4 text-center">
              <img *ngIf="heroImageUrl" [src]="heroImageUrl" alt="" class="img-fluid rounded-3" style="max-height:320px;object-fit:cover" (error)="onHeroImageError()" />
              <div *ngIf="!heroImageUrl" class="an-img-placeholder">
                <i class="ri-image-line"></i>
                <span class="fs-12">Aucune image</span>
              </div>
            </div>

            <!-- ── Mode lecture : TOUS les détails ── -->
            <h6 class="fw-semibold text-muted fs-12 text-uppercase mb-2">Description complète</h6>
            <p class="fs-14 mb-4" style="white-space:pre-wrap">{{ annonce.description || 'Aucune description fournie.' }}</p>

            <div class="row g-3 mb-4">
              <div class="col-6 col-md-4">
                <div class="an-stat an-stat-purple">
                  <div class="an-stat-icon"><i class="ri-price-tag-3-line"></i></div>
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Prix</div>
                  <div class="fw-bold fs-18">{{ annonce.price }} <span class="fs-12 text-muted">TND</span></div>
                </div>
              </div>
              <div class="col-6 col-md-4">
                <div class="an-stat an-stat-blue">
                  <div class="an-stat-icon"><i class="ri-price-tag-2-line"></i></div>
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Catégorie</div>
                  <div class="fs-14">{{ annonce.category || '—' }}</div>
                </div>
              </div>
              <div class="col-6 col-md-4">
                <div class="an-stat an-stat-blue">
                  <div class="an-stat-icon"><i class="ri-map-pin-line"></i></div>
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Localisation</div>
                  <div class="fs-14">{{ annonce.location || '—' }}</div>
                </div>
              </div>
              <div class="col-6 col-md-4">
                <div class="an-stat an-stat-orange">
                  <div class="an-stat-icon"><i class="ri-calendar-line"></i></div>
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Date de publication</div>
                  <div class="fs-14">{{ formatDate(annonce.date) }}</div>
                </div>
              </div>
              <div class="col-6 col-md-4">
                <div class="an-stat an-stat-red">
                  <div class="an-stat-icon"><i class="ri-heart-line"></i></div>
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Vues / Likes</div>
                  <div class="fs-14">{{ annonce.likesCount }}</div>
                </div>
              </div>
              <div class="col-6 col-md-4">
                <div class="an-stat an-stat-primary">
                  <div class="an-stat-icon"><i class="ri-chat-3-line"></i></div>
                  <div class="fs-11 text-uppercase text-muted fw-semibold mb-1">Commentaires</div>
                  <div class="fs-14">{{ annonce.commentsCount }}</div>
                </div>
              </div>
            </div>

            <!-- ── Caractéristiques (lecture) ── -->
            <h6 class="fw-semibold text-muted fs-12 text-uppercase mb-2">Caractéristiques</h6>
            @if (annonce.features.length === 0) {
              <p class="fs-13 text-muted mb-0">Aucune caractéristique renseignée.</p>
            } @else {
              <div class="table-responsive">
                <table class="table table-sm mb-0">
                  <tbody>
                    @for (f of annonce.features; track f.idFV) {
                      <tr>
                        <td class="fs-13 fw-semibold" style="width:40%">{{ f.title }}</td>
                        <td class="fs-13 text-muted">{{ f.value }} <span *ngIf="f.unit">{{ f.unit }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

          } @else {
            <!-- ── Mode édition : formulaire complet ── -->

            <!-- Images : galerie + ajout/suppression -->
            <div class="mb-4">
              <label class="form-label fs-12 fw-semibold text-muted">Photos</label>
              <div class="d-flex flex-wrap gap-2 mb-2">
                @for (img of annonce.images; track img.index) {
                  <div class="an-img-thumb-wrap" *ngIf="!img.broken">
                    <img [src]="img.url" alt="" class="an-img-thumb" (error)="img.broken = true" />
                    <button *ngIf="img.index >= 0" type="button" class="an-img-remove"
                            (click)="removeImage(img.index)" [disabled]="imageBusy" title="Supprimer cette photo">
                      <i class="ri-close-line"></i>
                    </button>
                  </div>
                }
              </div>
              <input type="file" accept="image/*" multiple class="form-control form-control-sm" style="max-width:280px"
                     (change)="onImageSelected($event)" [disabled]="imageBusy" />
              <div class="fs-11 text-muted mt-1">Vous pouvez sélectionner plusieurs photos à la fois.</div>
              <div *ngIf="imageBusy" class="fs-12 text-muted mt-1">
                <span class="spinner-border spinner-border-sm me-1"></span>Envoi des photos…
              </div>
              <div *ngIf="imageError" class="fs-12 text-danger mt-1">{{ imageError }}</div>
            </div>

            <div class="mb-3">
              <label class="form-label fs-12 fw-semibold text-muted">Titre <span class="text-danger">*</span></label>
              <input type="text" class="form-control" [(ngModel)]="editForm.title" />
            </div>
            <div class="mb-3">
              <label class="form-label fs-12 fw-semibold text-muted">Description</label>
              <textarea class="form-control" rows="6" [(ngModel)]="editForm.description"></textarea>
            </div>
            <div class="row g-3 mb-3">
              <div class="col-6">
                <label class="form-label fs-12 fw-semibold text-muted">Prix (TND)</label>
                <input type="number" class="form-control" [(ngModel)]="editForm.price" />
              </div>
              <div class="col-6">
                <label class="form-label fs-12 fw-semibold text-muted">Localisation</label>
                <select class="form-select" [(ngModel)]="editForm.location">
                  <option value="">— Sélectionner une ville —</option>
                  @for (c of cities; track c.id) {
                    <option [value]="c.title">{{ c.title }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label fs-12 fw-semibold text-muted">Statut</label>
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm flex-fill"
                        [class.btn-success]="editForm.active" [class.btn-light]="!editForm.active"
                        (click)="editForm.active = true">
                  <i class="ri-checkbox-circle-line me-1"></i>Approuvée
                </button>
                <button type="button" class="btn btn-sm flex-fill"
                        [class.btn-warning]="!editForm.active" [class.btn-light]="editForm.active"
                        (click)="editForm.active = false">
                  <i class="ri-time-line me-1"></i>En attente
                </button>
              </div>
            </div>

            <!-- Caractéristiques : lignes éditables -->
            <div class="mb-3">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <label class="form-label fs-12 fw-semibold text-muted mb-0">Caractéristiques</label>
                <button type="button" class="btn btn-light btn-sm" (click)="addFeatureRow()">
                  <i class="ri-add-line me-1"></i>Ajouter
                </button>
              </div>
              <div *ngIf="editForm.features.length === 0" class="fs-12 text-muted mb-2">
                Aucune caractéristique. Clique sur "Ajouter" pour en créer une.
              </div>
              <div *ngFor="let f of editForm.features; let i = index" class="row g-2 mb-2 align-items-center">
                <div class="col-4">
                  <input type="text" class="form-control form-control-sm" placeholder="Titre (ex: Couleur)" [(ngModel)]="f.title" />
                </div>
                <div class="col-4">
                  <input type="text" class="form-control form-control-sm" placeholder="Valeur (ex: Rouge)" [(ngModel)]="f.value" />
                </div>
                <div class="col-3">
                  <input type="text" class="form-control form-control-sm" placeholder="Unité (optionnel)" [(ngModel)]="f.unit" />
                </div>
                <div class="col-1 text-end">
                  <button type="button" class="btn btn-light btn-sm text-danger" (click)="removeFeatureRow(i)" title="Retirer">
                    <i class="ri-delete-bin-line"></i>
                  </button>
                </div>
              </div>
            </div>

            <div *ngIf="saveError" class="alert alert-danger fs-13 py-2 px-3">{{ saveError }}</div>

            <div class="d-flex justify-content-end gap-2 mt-4">
              <button class="btn btn-light" (click)="cancelEdit()" [disabled]="saving">Annuler</button>
              <button class="btn btn-primary" (click)="save()" [disabled]="saving">
                <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
                <i *ngIf="!saving" class="ri-save-line me-1"></i>
                {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          }
        </div>
      </div>

      <!-- ═════ Commentaires ═════ -->
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-transparent py-3">
          <h6 class="mb-0 fw-semibold">
            <i class="ri-chat-3-line me-2 text-primary"></i>Commentaires ({{ comments.length }})
          </h6>
        </div>
        <div class="card-body p-0">
          @if (comments.length === 0) {
            <p class="text-center text-muted fs-13 py-4 mb-0">Aucun commentaire sur cette annonce.</p>
          } @else {
            <div class="p-3">
              @for (c of comments; track c.id) {
                <div class="d-flex gap-2 mb-3 pb-3 border-bottom">
                  <div class="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold fs-11"
                       style="width:32px;height:32px;flex-shrink:0">
                    {{ getInitials(c.author_name) }}
                  </div>
                  <div>
                    <div class="fs-13 fw-semibold">{{ c.author_name || '—' }}</div>
                    <div class="fs-13 text-muted">{{ c.content }}</div>
                    <div class="fs-11 text-muted mt-1">{{ formatDate(c.created_at) }}</div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>

    <!-- ═════ Colonne latérale : Auteur + actions ═════ -->
    <div class="col-lg-4">
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body text-center">
          <div class="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold mx-auto mb-3"
               style="width:72px;height:72px;font-size:24px">
            {{ getInitials(annonce.authorName) }}
          </div>
          <h6 class="fw-bold mb-1">
            {{ annonce.authorName || '—' }}
            <i *ngIf="annonce.authorVerified" class="ri-shield-check-fill text-success fs-13" title="Vendeur vérifié"></i>
          </h6>
          <p class="text-muted fs-12 mb-3">{{ annonce.shopName || 'Vendeur' }}</p>

          <!--  Contact annonceur -->
          <div class="text-start fs-13 mb-3">
            <div class="d-flex align-items-center gap-2 mb-1" *ngIf="annonce.phone">
              <i class="ri-phone-line text-muted"></i>
              <a [href]="'tel:' + annonce.phone" class="text-body text-decoration-none">{{ annonce.phone }}</a>
            </div>
            <div class="d-flex align-items-center gap-2" *ngIf="annonce.email">
              <i class="ri-mail-line text-muted"></i>
              <a [href]="'mailto:' + annonce.email" class="text-body text-decoration-none text-truncate">{{ annonce.email }}</a>
            </div>
            <div *ngIf="!annonce.phone && !annonce.email" class="text-muted">Aucun contact renseigné.</div>
          </div>

          <button class="btn btn-light btn-sm w-100" (click)="goToAuthor()" [disabled]="!annonce.authorId">
            <i class="ri-user-line me-1"></i>Voir le profil
          </button>
        </div>
      </div>

      <div class="card border-0 shadow-sm">
        <div class="card-header bg-transparent py-3">
          <h6 class="mb-0 fw-semibold fs-13"><i class="ri-flashlight-line me-2 text-primary"></i>Actions rapides</h6>
        </div>
        <div class="card-body d-flex flex-column gap-2">
          <button class="btn btn-light btn-sm text-start" (click)="startEdit()" [disabled]="editMode">
            <i class="ri-edit-line me-2"></i>Modifier l'annonce
          </button>
          <button *ngIf="!annonce.active" class="btn btn-light btn-sm text-start" (click)="approve()">
            <i class="ri-check-line me-2 text-success"></i>Approuver
          </button>
          <button *ngIf="annonce.active" class="btn btn-light btn-sm text-start" (click)="reject()">
            <i class="ri-close-line me-2 text-warning"></i>Désapprouver
          </button>
          <a routerLink="/admin/annonces" class="btn btn-light btn-sm text-start">
            <i class="ri-arrow-left-line me-2"></i>Retour à la liste
          </a>
        </div>
      </div>
    </div>
  </div>
}
`,
  styles: [`
    .an-img-placeholder {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 6px; height: 180px; border-radius: 12px;
      background: #f8f9fc; color: #9298a8; border: 1px dashed #e2e5ed;
    }
    .an-img-placeholder i { font-size: 32px; }

    .an-img-thumb-wrap { position: relative; width: 84px; height: 84px; }
    .an-img-thumb { width: 100%; height: 100%; object-fit: cover; border-radius: 10px; }
    .an-img-remove {
      position: absolute; top: -6px; right: -6px; width: 22px; height: 22px; border-radius: 50%;
      border: none; background: #f06548; color: #fff; display: flex; align-items: center;
      justify-content: center; font-size: 13px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,.2);
    }
    .an-img-remove:disabled { opacity: .5; cursor: not-allowed; }

    .an-stat {
      position: relative;
      padding: 14px 16px 14px 44px;
      border-radius: 12px;
      background: #f8f9fc;
      height: 100%;
    }
    .an-stat-icon {
      position: absolute; left: 12px; top: 14px;
      width: 22px; height: 22px; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; color: #6c757d; background: rgba(108,117,125,.12);
    }
    .an-stat-purple  .an-stat-icon { color: #6249e8; background: rgba(98,73,232,.12); }
    .an-stat-blue    .an-stat-icon { color: #2b8fd6; background: rgba(43,143,214,.12); }
    .an-stat-orange  .an-stat-icon { color: #f7a53b; background: rgba(247,165,59,.12); }
    .an-stat-red     .an-stat-icon { color: #e04f4f; background: rgba(224,79,79,.12); }
    .an-stat-primary .an-stat-icon { color: #405189; background: rgba(64,81,137,.12); }
    .an-stat-teal    .an-stat-icon { color: #0ab39c; background: rgba(10,179,156,.12); }

    :host-context([data-bs-theme="dark"]) {
      .an-img-placeholder {
        background: var(--bs-tertiary-bg, #23262b);
        border-color: var(--bs-border-color, #32363d);
        color: var(--bs-secondary-color, #9299a8);
      }
      .an-stat { background: var(--bs-tertiary-bg, #23262b); }
      .card {
        background: var(--bs-card-bg, #1e2126);
        border-color: var(--bs-border-color, #32363d);
        box-shadow: 0 2px 12px rgba(0, 0, 0, .35) !important;
      }
      .bg-light {
        background-color: var(--bs-tertiary-bg, #23262b) !important;
      }
      .text-dark { color: var(--bs-body-color, #e9ecef) !important; }
      .card-header { border-color: var(--bs-border-color, #32363d) !important; }
      .form-control {
        background-color: var(--bs-tertiary-bg, #23262b);
        border-color: var(--bs-border-color, #32363d);
        color: var(--bs-body-color, #e9ecef);
      }
      .form-control::placeholder { color: var(--bs-secondary-color, #9299a8); }
      .form-control:focus { background-color: var(--bs-tertiary-bg, #23262b); }
      .btn-light {
        --bs-btn-bg: var(--bs-tertiary-bg, #23262b);
        --bs-btn-color: var(--bs-body-color, #e9ecef);
        --bs-btn-border-color: var(--bs-border-color, #32363d);
        --bs-btn-hover-bg: var(--bs-secondary-bg, #2a2e35);
        --bs-btn-hover-color: var(--bs-emphasis-color, #f4f5f7);
        --bs-btn-hover-border-color: var(--bs-border-color, #32363d);
      }
      .border-bottom { border-color: var(--bs-border-color, #32363d) !important; }
    }
  `],
})
export class AnnonceDetailAdminComponent implements OnInit {
  breadCrumbItems = [{ label: 'Admin' }, { label: 'Annonces' }, { label: 'Détail', active: true }];

  loading  = true;
  
  heroIndex = 0;
  annonce: AnnonceDetail | null = null;
  comments: CommentRow[] = [];

  editMode  = false;
  editForm  = { title: '', description: '', price: '', location: '', active: true, features: [] as FeatureRow[] };
  saving    = false;
  saveError = '';

  imageBusy  = false;
  imageError = '';

  cities: { id: number; title: string }[] = [];

  constructor(private route: ActivatedRoute, private router: Router, private api: TijaraApiService, private categories: CategoriesService, private reviews: ReviewsService, private usersVendors: UsersVendorsService, private annonces: AnnoncesService, private catStyle: CategoryStyleService, private catalogAdmin: CatalogAdminService) {}

  private loadCities(): void {
    this.catalogAdmin.adminList('cities', { per_page: 200 }).subscribe({
      next: (res: any) => {
        const arr: any[] = res?.data || res || [];
        this.cities = arr
          .map((c: any) => ({
            id:     +(c.id_city ?? c.IdCity ?? c.id ?? 0),
            title:   c.title    ?? c.Title   ?? '',
            active: !!(c.active ?? c.Active  ?? true),
          }))
          .filter((c: any) => c.id > 0 && c.active)
          .sort((a: any, b: any) => a.title.localeCompare(b.title));
      },
      error: () => { this.cities = []; },
    });
  }

  private categoryNames: Record<number, string> = {};

  
  get heroImageUrl(): string {
    if (!this.annonce) return '';
    return this.annonce.images[this.heroIndex]?.url || '';
  }

  onHeroImageError(): void {
    this.heroIndex++;
  }

  
  private firstImageUrl(raw: any, id: number): string {
    return this.allImages(raw, id)[0]?.url || '';
  }

 
  private allImages(raw: any, id: number): ImageEntry[] {
    let filenames: string[] = [];
    if (Array.isArray(raw)) {
      filenames = raw;
    } else if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) filenames = parsed;
        else if (typeof parsed === 'string' && parsed) filenames = [parsed];
      } catch {
        filenames = [raw];
      }
    }
    const entries: ImageEntry[] = filenames.map((f, i) => ({
      url: f.includes('/')
        ? `${this.annonces.assetBaseUrl}/${f.replace(/^\/+/, '')}`
        : `${this.annonces.assetBaseUrl}/assets/ads/images/${f}`,
      index: i,
    }));

    // Ancien fallback par convention de nom (ad_{id}.jpg), utilisé seulement
    // pour les annonces créées avant l'existence du tableau ImageAd (donc
    // sans aucune entrée dedans). Dès qu'il y a au moins une vraie photo
    // dans ImageAd, on ne l'affiche plus : ce fichier n'est pas suivi côté
    // backend (absent de ImageAd) et ne peut donc pas être supprimé via
    // l'API existante, ce qui bloquait le bouton de suppression.
    if (entries.length === 0) {
      entries.push({ url: `${this.annonces.assetBaseUrl}/assets/ads/images/ad_${id}.jpg`, index: -1 });
    }
    return entries;
  }

  ngOnInit(): void {
    const id = +(this.route.snapshot.paramMap.get('id') || 0);
    if (!id) { this.loading = false; return; }
    this.loadCities();
    this.categories.getCategories({ per_page: 200 }).subscribe({
      next: (res: any) => {
        (res?.data || res || []).forEach((c: any) => {
          this.categoryNames[c.IdCateg] = c.TitleFr || c.TitleEn || '';
        });
        this.load(id);
      },
      error: () => this.load(id),
    });
  }

  load(id: number): void {
    this.loading = true;
    this.heroIndex = 0;
    this.annonces.getAnnonce(id).subscribe({
      next: (res: any) => {
        const a = res?.data ?? res;
        if (!a) { this.annonce = null; this.loading = false; return; }
        const images = this.allImages(a.ImageAd, a.IdAd);
        this.annonce = {
          id:             a.IdAd,
          title:           a.TitleAd ?? '—',
          description:     a.DescriptionAd ?? '',
          price:           String(a.PriceAd ?? '0'),
          image:           images[0]?.url || '',
          images,
          
          features:        (a.values || []).map((v: any) => ({
            idFV:  v.IdFV ?? null,
            title: v.feature?.TitleFeature ?? '',
            value: v.ValueFeature ?? '',
            unit:  v.feature?.UnitFeature ?? '',
          })),
          category:        this.catStyle.canonicalLabel(this.categoryNames[a.IdCateg] || ''),
          location:        a.LocationAd ?? '',
          authorId:        a.IdUser ?? null,
          authorName:      a.Ownerads ?? '—',
          authorVerified:  false,
          shopName:        '',
          active:         !!a.Active,
          date:            a.DatePublication ?? null,
          likesCount:      +(a.LikeCount ?? 0),
          commentsCount:   0,
         
          phone:           a.Telephone ?? '',
          email:           a.Email ?? '',
        };
        this.loading = false;
        this.loadComments(id);
        if (a.IdUser) this.loadAuthorInfo(a.IdUser);
      },
      error: () => { this.loading = false; }
    });
  }

  private loadAuthorInfo(idUser: number): void {
    this.usersVendors.getAdminUserDetails(idUser).subscribe((res: any) => {
      const u = res?.data;
      if (!u || !this.annonce) return;
      this.annonce.authorVerified = !!u.IsBusinessAccount;
    });
  }

  loadComments(id: number): void {
    this.reviews.getComments(id).subscribe({
      next: (res: any) => {
        const rows = res?.data || [];
        this.comments = rows.map((c: any) => ({
          id:          c.IdComment,
          content:     c.Content,
          author_name: c.IdUser ? `Utilisateur #${c.IdUser}` : '—',
          created_at:  c.CreatedAt,
        }));
        if (this.annonce) this.annonce.commentsCount = res?.total ?? this.comments.length;
      },
      error: () => {}
    });
  }

  goToAuthor(): void {
    if (!this.annonce?.authorId) return;
    this.router.navigate(['/admin/user-detail', this.annonce.authorId]);
  }

  approve(): void {
    if (!this.annonce) return;
    this.annonces.approveAnnonce(this.annonce.id).subscribe({
      next:  () => { this.annonce!.active = true; },
      error: () => alert('Approbation impossible.'),
    });
  }

  reject(): void {
    if (!this.annonce) return;
    if (!confirm(`Désapprouver l'annonce "${this.annonce.title}" ?`)) return;
    this.annonces.rejectAnnonce(this.annonce.id).subscribe({
      next:  () => { this.annonce!.active = false; },
      error: () => alert('Action impossible.'),
    });
  }

  startEdit(): void {
    if (!this.annonce) return;
    this.editForm = {
      title:       this.annonce.title,
      description: this.annonce.description,
      price:       this.annonce.price,
      location:    this.annonce.location,
      active:      this.annonce.active,
      
      features:    this.annonce.features.map(f => ({ ...f })),
    };
    this.saveError  = '';
    this.imageError = '';
    this.editMode   = true;
  }

  cancelEdit(): void {
    this.editMode   = false;
    this.saveError  = '';
    this.imageError = '';
  }

  addFeatureRow(): void {
    this.editForm.features.push({ idFV: null, title: '', value: '', unit: '' });
  }

  removeFeatureRow(i: number): void {
    this.editForm.features.splice(i, 1);
  }


  save(): void {
    if (!this.annonce) return;
    if (!this.editForm.title.trim()) { this.saveError = 'Le titre est obligatoire.'; return; }

    this.saving    = true;
    this.saveError = '';

    const features = this.editForm.features
      .filter(f => f.title.trim() && f.value.trim())
      .map(f => ({
        TitleFeature: f.title.trim(),
        ValueFeature: f.value.trim(),
        UnitFeature:  f.unit.trim() || null,
      }));

    const payload: any = {
      TitleAd:       this.editForm.title.trim(),
      DescriptionAd: this.editForm.description.trim(),
      PriceAd:       this.editForm.price,
      LocationAd:    this.editForm.location,
      Active:        this.editForm.active ? 1 : 0,
    };

    if (features.length > 0) payload.Features = features;

    this.annonces.updateAnnonceAdmin(this.annonce.id, payload).subscribe({
      next: (res: any) => {
        const a = this.annonce!;
        a.title       = this.editForm.title;
        a.description = this.editForm.description;
        a.price       = this.editForm.price;
        a.location    = this.editForm.location;
        a.active      = this.editForm.active;
       
        const updated = res?.data ?? res;
        if (updated?.values) {
          a.features = updated.values.map((v: any) => ({
            idFV:  v.IdFV ?? null,
            title: v.feature?.TitleFeature ?? '',
            value: v.ValueFeature ?? '',
            unit:  v.feature?.UnitFeature ?? '',
          }));
        }
        this.saving   = false;
        this.editMode = false;
      },
      error: (err: any) => {
        this.saving    = false;
        this.saveError = err?.error?.message || 'Modification impossible. Vérifiez votre connexion.';
      }
    });
  }


  onImageSelected(event: Event): void {
    if (!this.annonce) return;
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (!files.length) return;

    this.imageBusy  = true;
    this.imageError = '';
    this.annonces.addAnnonceImageAdmin(this.annonce.id, files).subscribe({
      next: () => {
        this.imageBusy = false;
        input.value = '';
        this.load(this.annonce!.id); 
      },
      error: (err: any) => {
        this.imageBusy  = false;
        this.imageError = err?.error?.message || "Envoi des photos impossible.";
      },
    });
  }

  
  removeImage(index: number): void {
    if (!this.annonce) return;
    if (!confirm('Supprimer cette photo ?')) return;

    this.imageBusy  = true;
    this.imageError = '';
    this.annonces.removeAnnonceImageAdmin(this.annonce.id, index).subscribe({
      next: () => {
        this.imageBusy = false;
        this.load(this.annonce!.id);
      },
      error: (err: any) => {
        this.imageBusy  = false;
        this.imageError = err?.error?.message || 'Suppression de la photo impossible.';
      },
    });
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }
}
