import { Component, OnInit } from '@angular/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PublicCatalogService } from 'src/app/core/services/public-catalog.service';

interface Prize {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  datePublication: string | null;
  winnerName: string;
  isAttributed: boolean;
}

interface Winner { id: number; fullName: string; prizeTitle: string; prizeImage: string; }

@Component({
  selector: 'app-prizes-user',
  standalone: false,
  template: `
<app-breadcrumbs title="Prix & Tirages" [breadcrumbItems]="breadCrumbItems"></app-breadcrumbs>

<div class="card border-0 shadow-sm mb-4 overflow-hidden"
     style="background:linear-gradient(135deg,#f7b84b 0%,#0ab39c 100%)">
  <div class="card-body text-white py-4">
    <div class="d-flex flex-wrap align-items-center gap-3">
      <div class="avatar-lg rounded-3 d-flex align-items-center justify-content-center"
           style="background:rgba(255,255,255,.2)">
        <i class="ri-trophy-fill fs-1"></i>
      </div>
      <div class="flex-grow-1">
        <h3 class="text-white mb-1">Prix & cadeaux à gagner 🎁</h3>
        <p class="text-white-50 mb-0">Découvrez les prix et les gagnants de la communauté Tijara.</p>
      </div>
    </div>
  </div>
</div>

<!-- Prix disponibles -->
<div class="card border-0 shadow-sm mb-4">
  <div class="card-header bg-transparent py-3">
    <h6 class="mb-0 fw-semibold">
      <i class="ri-gift-line me-2 text-warning"></i>Prix disponibles
      <span class="badge bg-warning-subtle text-warning ms-2">{{ prizes.length }}</span>
    </h6>
  </div>
  <div class="card-body">
    @if (loading) { <div class="text-center py-3"><div class="spinner-border text-warning"></div></div> }
    @else if (prizes.length === 0) {
      <p class="text-center text-muted fs-13 py-4 mb-0">Aucun prix actif pour le moment.</p>
    } @else {
      <div class="row g-3">
        @for (p of prizes; track p.id) {
          <div class="col-md-6 col-xl-4">
            <div class="card border-0 shadow-sm h-100">
              <div class="position-relative">
                @if (p.imageUrl) {
                  <img [src]="p.imageUrl" alt="" class="card-img-top"
                       style="height:180px;object-fit:cover" (error)="p.imageUrl=''" />
                } @else {
                  <div class="card-img-top bg-warning-subtle d-flex align-items-center justify-content-center"
                       style="height:180px">
                    <i class="ri-gift-line text-warning" style="font-size:60px"></i>
                  </div>
                }
                <div class="position-absolute top-0 end-0 m-2">
                  @if (p.isAttributed) {
                    <span class="badge bg-success">Attribué</span>
                  } @else {
                    <span class="badge bg-warning">À gagner</span>
                  }
                </div>
              </div>
              <div class="card-body">
                <h6 class="fw-semibold mb-1">{{ p.title }}</h6>
                <p class="text-muted fs-12 mb-2">{{ p.description || '—' }}</p>
                @if (p.datePublication) {
                  <div class="fs-11 text-muted"><i class="ri-calendar-line"></i> {{ formatDate(p.datePublication) }}</div>
                }
                @if (p.isAttributed && p.winnerName) {
                  <div class="mt-2 fs-12 text-success fw-semibold">
                    <i class="ri-trophy-line"></i> Gagné par {{ p.winnerName }}
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  </div>
</div>

<!-- Hall of fame : masqué tant que /winners reste une route admin-only côté backend -->
@if (!winnersLoading && winners.length > 0) {
  <div class="card border-0 shadow-sm">
    <div class="card-header bg-transparent py-3">
      <h6 class="mb-0 fw-semibold">
        <i class="ri-trophy-fill me-2 text-warning"></i>Mur des gagnants
        <span class="badge bg-warning-subtle text-warning ms-2">{{ winners.length }}</span>
      </h6>
    </div>
    <div class="card-body">
      <div class="row g-3">
        @for (w of winners; track w.id) {
          <div class="col-md-6 col-xl-4">
            <div class="d-flex align-items-center gap-3 p-3 rounded bg-light">
              @if (w.prizeImage) {
                <img [src]="w.prizeImage" alt="" class="rounded" width="60" height="60" style="object-fit:cover" />
              } @else {
                <div class="rounded bg-warning-subtle text-warning d-flex align-items-center justify-content-center"
                     style="width:60px;height:60px"><i class="ri-trophy-line fs-22"></i></div>
              }
              <div class="flex-grow-1 min-w-0">
                <div class="fw-semibold fs-13 text-truncate">{{ w.fullName || '—' }}</div>
                <div class="fs-11 text-muted">a gagné</div>
                <div class="fs-12 text-warning fw-semibold text-truncate">{{ w.prizeTitle || '—' }}</div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  </div>
}
`,
})
export class PrizesUserComponent implements OnInit {
  breadCrumbItems = [{ label: 'Compte' }, { label: 'Prix & tirages', active: true }];

  prizes: Prize[]   = [];
  winners: Winner[] = [];
  loading           = true;
  winnersLoading    = false;

  constructor(private publicCatalogService: PublicCatalogService) {}

  ngOnInit(): void {
    this.loadPrizes();
    this.loadWinners();
  }

  private loadPrizes(): void {
    this.publicCatalogService.getPublicPrizes().pipe(
      catchError(() => of([] as any[]))
    ).subscribe((prizes: any[]) => {
      this.prizes = (prizes || []).map((p: any) => {
        const winner = p.user ?? null;
        const winnerName = winner
          ? (winner.Username || [winner.FirstName, winner.LastName].filter(Boolean).join(' '))
          : '';

        return {
          id:              +(p.idPrize ?? 0),
          title:            p.title ?? '',
          description:      p.description ?? '',
          // Le modèle Prizes expose "image_url" (attribut appended via
          // MediaUrl::build) ; "image" n'est que le nom de fichier brut
          // et ne peut pas être utilisé directement dans un <img src>.
          imageUrl:         p.image_url ?? '',
          // Le backend n'a pas de colonne "datePrize" : la vraie colonne
          // est "datePublication" (voir modèle Prizes).
          datePublication:  p.datePublication ?? null,
          // "idUser" sur Prizes = l'utilisateur à qui le prix a été
          // attribué (le gagnant). Le nom vient de la relation "user"
          // eager-loadée par PrizesController::index().
          winnerName,
          isAttributed:     !!p.idUser,
        };
      });
      this.loading = false;
    });
  }

  private loadWinners(): void {
    // GET /winners est protégé par le middleware 'admin' côté backend
    // (routes/api.php) — aucune route publique équivalente n'existe pour
    // un compte utilisateur/vendeur. Tant que ça reste vrai côté backend,
    // on n'émet volontairement pas cet appel HTTP (il renverrait un 403
    // systématique, visible et inutile dans les devtools) et on masque
    // simplement la section "Mur des gagnants" (winners.length === 0).
    //
    // Si une route publique en lecture seule est ajoutée un jour côté
    // backend (ex: GET /winners/public), rebrancher ici l'appel à
    // this.publicCatalogService.getPublicWinners() (+ getPublicWinnerDetail
    // pour chaque id si l'index ne renvoie pas les relations user/prize).
    this.winners = [];
    this.winnersLoading = false;
  }

  formatDate(d: string | null): string {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
  }
}