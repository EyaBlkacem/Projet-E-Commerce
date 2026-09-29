import { Component, OnInit, OnDestroy } from '@angular/core';
import { AssetsService } from 'src/app/core/services/assets.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DealsService } from 'src/app/core/services/deals.service';
import { PrizesService } from 'src/app/core/services/prizes.service';
import { WinnersService } from 'src/app/core/services/winners.service';

@Component({
  selector: 'app-deals-ent',
  templateUrl: './deals-ent.component.html',
  standalone: false
})
export class DealsEntComponent implements OnInit, OnDestroy {

  now: number = Date.now();
  private countdownTimer: any = null;

  breadCrumbItems = [
    { label: 'Vendeur' },
    { label: 'Mes Deals & Promos', active: true }
  ];

  myDeals: any[] = [];
  publicDeals: any[] = [];
  activeTab: 'miennes' | 'toutes' = 'miennes';
  loading       = true;
  showForm      = false;
  submitting    = false;
  submitSuccess = '';
  submitError   = '';
  imagePreview  = '';
  imageFile: File | null = null;
  dealForm!: FormGroup;

  private currentUserId = 0;

  private likedDealIds = new Set<number>();
  private likeRecordIds: Record<number, number> = {};
  liking: Record<number, boolean> = {};

  // ===================== GESTION DES PRIZES =====================

  prizeForm!: FormGroup;
  prizeFormDealId: number | null = null;
  prizeImageFile: File | null = null;
  prizeImagePreview = '';
  prizeSubmitting = false;
  prizeSubmitError = '';
  drawing: Record<number, boolean> = {};

  constructor(
    private dealsService: DealsService,
    private prizesService: PrizesService,
    private winnersService: WinnersService,
    private assetsService: AssetsService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
      this.currentUserId = user?.id ?? user?.IdUser ?? 0;
    } catch { this.currentUserId = 0; }

    this.loadMine();
    this.loadPublic();
    this.initForm();
    this.initPrizeForm();
    this.startCountdownClock();
  }

  initForm(): void {
    this.dealForm = this.fb.group({
      title:       ['', [Validators.required, Validators.minLength(5)]],
      content:     ['', [Validators.required, Validators.minLength(10)]],
      price:       ['', [Validators.pattern(/^\d+(\.\d{1,3})?$/)]],
      discount:    ['', [Validators.pattern(/^\d{1,3}$/)]],
      quantity:    [''],
      dateEnd:     [''],
      categoryId:  [null],
    });
  }

  get f() { return this.dealForm.controls; }

  initPrizeForm(): void {
    this.prizeForm = this.fb.group({
      title:       ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
    });
  }
  get pf() { return this.prizeForm.controls; }

  private mapDeal(raw: any): any {
    const id = raw.IdDeal ?? raw.id;
    return {
      id,
      title:           raw.titleDeal ?? raw.title ?? 'Sans titre',
      content:         raw.descriptionDeal ?? raw.content ?? '',
      details:         raw.detailsDeal ?? '',
      price:           raw.priceDeal ?? null,
      discount:        raw.discountDeal ?? null,
      quantity:        raw.quantity ?? null,
      totalCount:      raw.TotalCount ?? null,
      image_url:       this.resolveImage(raw),
      category_id:     raw.idCateg ?? null,
      status:          (raw.active === 1 || raw.active === true) ? 'approved' : 'pending',
      author_name:     raw.iduser?.NameUser ?? raw.iduser?.name ?? 'Vendeur',
      shop_name:       raw.iduser?.ShopName ?? '',
      created_at:      raw.datePublication ?? raw.created_at ?? '',
      dateEnd:         raw.dateEnd ?? null,
      likes_count:     raw.likes ?? 0,
      views:            raw.ViewCount ?? 0,
      quantityProgress: raw.QuantityProgress ?? 0,
      timeRemaining:    raw.TimeRemaining ?? null,
      timeProgress:     raw.TimeProgress ?? 0,
      isExpired:        raw.IsExpired ?? false,
      prize:            null,
      hasWinner:        false,
      winnerName:       null,
      raw
    };
  }

  // Utilise en priorité l'URL renvoyée par le backend (image_url), sinon
  // reconstruit à partir du nom de fichier réellement stocké (imageDeal).
  // FIX : certains enregistrements historiques ont imageDeal qui contient
  // directement une data URI (base64) ou une URL absolue au lieu d'un simple
  // nom de fichier — dans ce cas on ne préfixe surtout pas avec
  // "/assets/deals/", sinon on obtient une URL invalide du type
  // "http://localhost:8000/assets/deals/data:image/jpeg;base64,...".
  // On ne devine plus jamais un nom de fichier depuis l'id du deal.
  private resolveImage(raw: any): string | null {
    if (raw.image_url) return raw.image_url;

    if (raw.imageDeal) {
      const value: string = raw.imageDeal;
      if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) {
        return value;
      }
      return `${this.assetsService.assetsBaseUrl}/assets/deals/${value}`;
    }

    return null;
  }

  loadMine(): void {
    this.loading = true;
    this.dealsService.getMyDeals().subscribe({
      next: (res: any) => {
        const raw: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.myDeals = raw.map((d: any) => this.mapDeal(d));
        this.loadPrizesForDeals();
        this.loading = false;
      },
      error: () => { this.myDeals = []; this.loading = false; }
    });
  }

  private loadPrizesForDeals(): void {
    this.myDeals.forEach(deal => {
      this.prizesService.getPrizeForDeal(deal.id).subscribe({
        next: (prize: any) => {
          deal.prize = prize;
          deal.hasWinner = false;
          deal.winnerName = null;

          const idPrize = prize?.idPrize ?? prize?.IdPrize;
          if (idPrize) {
            this.winnersService.getWinnerForPrize(idPrize).subscribe({
              next: (winner: any) => {
                if (winner?.user) {
                  deal.hasWinner  = true;
                  deal.winnerName = `${winner.user.FirstName ?? ''} ${winner.user.LastName ?? ''}`.trim();
                }
              },
              error: () => {}
            });
          }
        },
        error: () => { deal.prize = null; deal.hasWinner = false; deal.winnerName = null; }
      });
    });
  }

  loadPublic(): void {
    this.dealsService.getDeals({ __raw: { active: 1, per_page: 50 } }).subscribe({
      next: (res: any) => {
        const raw: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.publicDeals = raw.map((d: any) => this.mapDeal(d));
      },
      error: () => { this.publicDeals = []; }
    });
  }

  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image trop volumineuse (max 5 Mo).');
      return;
    }
    this.imageFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => { this.imagePreview = e.target.result; };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.imagePreview = '';
    this.imageFile = null;
  }

  submit(): void {
    if (this.dealForm.invalid) return;
    this.submitting  = true;
    this.submitError = '';

    const val = this.dealForm.value;
    const formData = new FormData();
    formData.append('titleDeal', val.title?.trim());
    formData.append('descriptionDeal', val.content?.trim());
    formData.append('active', '0');
    if (val.price)      formData.append('priceDeal', val.price);
    if (val.discount)   formData.append('discountDeal', val.discount);
    if (val.quantity)   formData.append('quantity', val.quantity);
    if (val.dateEnd)    formData.append('dateEnd', val.dateEnd);
    if (val.categoryId) formData.append('idCateg', val.categoryId);
    if (this.imageFile) formData.append('image', this.imageFile);

    this.dealsService.createDeal(formData).subscribe({
      next: (res: any) => {
        const created = res?.data ?? res;
        this.submitting    = false;
        this.showForm      = false;
        this.submitSuccess = (created?.active === 1)
          ? '✅ Deal publié avec succès ! Il est maintenant visible sur la boutique.'
          : '⏳ Deal soumis ! En attente de validation par l\'administrateur.';
        this.imagePreview  = '';
        this.imageFile     = null;
        this.dealForm.reset();
        this.loadMine();
        setTimeout(() => { this.submitSuccess = ''; }, 6000);
      },
      error: (err: any) => {
        this.submitting  = false;
        this.submitError = err?.error?.message || 'Erreur lors de la soumission.';
      }
    });
  }

  deleteDeal(id: number): void {
    if (!confirm('Supprimer ce deal ?')) return;
    this.dealsService.deleteDeal(id).subscribe({
      next: () => { this.myDeals = this.myDeals.filter(d => d.id !== id); }
    });
  }

  like(deal: any): void {
    if (this.liking[deal.id]) return;
    this.liking[deal.id] = true;

    if (this.likedDealIds.has(deal.id)) {
      const likeId = this.likeRecordIds[deal.id];
      if (!likeId) { this.liking[deal.id] = false; return; }
      this.dealsService.removeDealLike(likeId).subscribe({
        next: () => {
          deal.likes_count = Math.max(0, (deal.likes_count || 0) - 1);
          this.likedDealIds.delete(deal.id);
          delete this.likeRecordIds[deal.id];
        },
        error: () => {},
        complete: () => { this.liking[deal.id] = false; }
      });
    } else {
      this.dealsService.addDealLike(deal.id).subscribe({
        next: (res: any) => {
          const created = res?.data ?? res;
          deal.likes_count = (deal.likes_count || 0) + 1;
          this.likedDealIds.add(deal.id);
          this.likeRecordIds[deal.id] = created?.IdDealLike ?? created?.id;
        },
        error: () => {},
        complete: () => { this.liking[deal.id] = false; }
      });
    }
  }

  isLiked(dealId: number): boolean {
    return this.likedDealIds.has(dealId);
  }

  getStatusClass(s: string): string {
    switch (s) {
      case 'approved': return 'bg-success-subtle text-success';
      case 'pending':  return 'bg-warning-subtle text-warning';
      default:         return 'bg-secondary-subtle text-secondary';
    }
  }

  getStatusLabel(s: string): string {
    switch (s) {
      case 'approved': return 'Approuvé';
      case 'pending':  return 'En attente';
      default:         return s;
    }
  }

  // ===================== MÉTHODES PRIZES =====================

  openPrizeForm(deal: any): void {
    this.prizeFormDealId   = deal.id;
    this.prizeSubmitError  = '';
    this.prizeImageFile    = null;
    this.prizeImagePreview = '';
    this.prizeForm.reset();
  }

  closePrizeForm(): void {
    this.prizeFormDealId = null;
  }

  onPrizeImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image trop volumineuse (max 5 Mo).');
      return;
    }
    this.prizeImageFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => { this.prizeImagePreview = e.target.result; };
    reader.readAsDataURL(file);
  }

  // ✅ CORRIGÉ — idUser n'est plus envoyé depuis le front : le backend
  // (PrizesController::store) l'assigne désormais lui-même via auth()->id(),
  // et vérifie en plus que le deal ciblé appartient bien au vendeur connecté.
  // Envoyer idUser ici serait à la fois inutile (ignoré côté serveur) et
  // trompeur pour quiconque relit ce code plus tard.
  submitPrize(deal: any): void {
    if (this.prizeForm.invalid || !this.prizeImageFile) {
      this.prizeSubmitError = !this.prizeImageFile
        ? 'Une image est obligatoire pour créer un lot.'
        : 'Merci de remplir le titre du lot.';
      return;
    }

    this.prizeSubmitting = true;
    this.prizeSubmitError = '';

    const val = this.prizeForm.value;
    const formData = new FormData();
    formData.append('image', this.prizeImageFile);
    formData.append('title', val.title.trim());
    if (val.description) formData.append('description', val.description.trim());
    formData.append('IdDeal', String(deal.id));
    formData.append('active', '1');

    this.prizesService.createPrize(formData).subscribe({
      next: (created: any) => {
        this.prizeSubmitting = false;
        deal.prize = created;
        deal.hasWinner = false;
        deal.winnerName = null;
        this.prizesService.clearPrizesCache();
        this.closePrizeForm();
      },
      error: (err: any) => {
        this.prizeSubmitting = false;
        this.prizeSubmitError = err?.error?.message || 'Erreur lors de la création du lot.';
      }
    });
  }

  drawWinner(deal: any): void {
    const idPrize = deal.prize?.idPrize ?? deal.prize?.IdPrize;
    if (!idPrize || this.drawing[idPrize]) return;

    if (!confirm(`Tirer au sort le gagnant du lot "${deal.prize.title}" ? Cette action est définitive.`)) return;

    this.drawing[idPrize] = true;
    this.winnersService.createWinner(idPrize).subscribe({
      next: (res: any) => {
        const winnerUser = res?.data?.user;
        deal.hasWinner  = true;
        deal.winnerName = winnerUser
          ? `${winnerUser.FirstName ?? ''} ${winnerUser.LastName ?? ''}`.trim()
          : null;
        this.drawing[idPrize] = false;
      },
      error: (err: any) => {
        alert(err?.error?.message || 'Erreur lors du tirage au sort.');
        this.drawing[idPrize] = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.stopCountdownClock();
  }

  startCountdownClock(): void {
    if (this.countdownTimer) return;
    this.countdownTimer = setInterval(() => { this.now = Date.now(); }, 1000);
  }

  stopCountdownClock(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  getDealTimeParts(deal: any): { days: string; hours: string; minutes: string; seconds: string } {
    const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');
    if (!deal.dateEnd) return { days: '00', hours: '00', minutes: '00', seconds: '00' };
    const end = new Date(deal.dateEnd).getTime();
    if (isNaN(end)) return { days: '00', hours: '00', minutes: '00', seconds: '00' };
    const diff = Math.max(0, end - this.now);
    const totalSeconds = Math.floor(diff / 1000);
    return {
      days: pad(Math.floor(totalSeconds / 86400)),
      hours: pad(Math.floor((totalSeconds % 86400) / 3600)),
      minutes: pad(Math.floor((totalSeconds % 3600) / 60)),
      seconds: pad(totalSeconds % 60)
    };
  }

  isDealExpired(deal: any): boolean {
    if (!deal.dateEnd) return false;
    const end = new Date(deal.dateEnd).getTime();
    if (isNaN(end)) return false;
    return (end - this.now) <= 0;
  }

  isDealUrgent(deal: any): boolean {
    if (!deal.dateEnd || this.isDealExpired(deal)) return false;
    const end = new Date(deal.dateEnd).getTime();
    if (isNaN(end)) return false;
    return (end - this.now) <= 3600 * 1000;
  }
}