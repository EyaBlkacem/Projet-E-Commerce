import { Component, OnInit } from '@angular/core';
import { AssetsService } from 'src/app/core/services/assets.service';
import { ActivatedRoute } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AnnoncesService } from 'src/app/core/services/annonces.service';
import { CategoriesService } from 'src/app/core/services/categories.service';
import { WishlistService } from 'src/app/core/services/wishlist.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

@Component({
  selector: 'app-annonces-ent',
  templateUrl: './annonces-ent.component.html',
  standalone: false
})
export class AnnoncesEntComponent implements OnInit {

  breadcrumbItems = [
    { label: 'Mon Espace' },
    { label: 'Annonces', active: true }
  ];

  annonces: any[]   = [];
  myAnnonces: any[] = [];
  activeTab: 'toutes' | 'miennes' = 'toutes';
  loading       = true;
  showForm      = false;
  submitting    = false;
  submitSuccess = '';
  submitError   = '';
  imagePreview  = '';
  selectedImageFile: File | null = null;
  imageError = '';
  galleryFiles: File[] = [];
  galleryPreviews: string[] = [];
  galleryError = '';
  readonly maxGalleryImages = 8;
  isDragOver    = false;
  expandedComments: Record<number, boolean> = {};
  comments: Record<number, any[]>           = {};
  commentText: Record<number, string>       = {};
  currentUserId = 0;
  annonceForm!: FormGroup;

  canPublish = false;
  userRoleLabel = '';

  categories: any[]    = [];
  selectedCategId: number | null = null;
  categoryFeatures: any[] = [];

  readonly titleMaxLength = 100;

  public Editor = ClassicEditor;
  public editorConfig = {
    toolbar: ['bold', 'italic', 'underline', 'numberedList', 'bulletedList', 'link', 'removeFormat']
  };

  wishlistedAdIds = new Set<number>();

  searchTerm  = '';
  searchInput = '';
  private searchSubject = new Subject<string>();
  currentPage = 1;
  pageSize    = 6;
  sortBy: 'recent' | 'oldest' | 'likes' = 'recent';

  // ─── Filtres avancés ───────────────────────────────────────────
  showAdvancedFilters = false;
  filterCategoryId: number | null = null;
  filterType: '' | 'annonce' | 'deal' = '';
  filterDateFrom = '';
  filterDateTo   = '';

  filterFeatures: Record<string, string[]> = {};
  filterCategoryFeatures: any[] = [];
  loadingFilterFeatures = false;

  filterPriceMin: number | null = null;
  filterPriceMax: number | null = null;
  filterCondition = '';

  categoryDropdownOpen = false;

  facetOpen: Record<string, boolean> = { price: true, category: true };

  filteredAnnonces: any[] = [];
  filteredMyAnnonces: any[] = [];
  paginatedAnnonces: any[] = [];
  paginatedMyAnnonces: any[] = [];
  totalPages = 1;
  totalPagesMine = 1;
  pagesArray: number[] = [];
  pagesArrayMine: number[] = [];
  loadingMine = true;
  liking: Record<number, boolean> = {};

  private readonly frMonths: Record<string, number> = {
    'janv': 0, 'jan': 0,
    'févr': 1, 'fevr': 1, 'fév': 1, 'fev': 1,
    'mars': 2,
    'avr': 3,
    'mai': 4,
    'juin': 5,
    'juil': 6,
    'août': 7, 'aout': 7,
    'sept': 8,
    'oct': 9,
    'nov': 10,
    'déc': 11, 'dec': 11,
  };

  constructor(
    private annoncesService: AnnoncesService, private categoriesService: CategoriesService, private wishlistService: WishlistService, private assetsService: AssetsService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    let user: any = {};
    try {
      user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    } catch {
      user = {};
    }
    this.currentUserId = user.id || 0;

    this.userRoleLabel = this.resolveUserRole(user);
    // Ce composant n'est monté que dans le dashboard Entreprise (routing dédié) :
    // la publication ne doit donc jamais être bloquée ici, quel que soit le
    // libellé exact du rôle renvoyé par le backend (ex: "Vendeur").
    this.canPublish = true;

    this.loadWishlistIds();
    this.loadAll();
    this.loadMine();
    this.initForm();
    this.loadCategories();

    this.route.queryParams.subscribe(params => {
      if ((params['create'] === 'true' || params['create'] === true) && this.canPublish) {
        this.showForm = true;
        this.activeTab = 'miennes';
      }
    });

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm = term;
      this.currentPage = 1;
      this.updateFilteredLists();
    });

    this.annonceForm.get('categoryId')!.valueChanges.subscribe(id => {
      this.onCategoryChange(id);
    });
  }

  private resolveUserRole(user: any): string {
    const candidate =
      user?.role ??
      user?.Role ??
      user?.userRole ??
      user?.type ??
      user?.account_type ??
      user?.accountType ??
      user?.RoleName ??
      user?.role_name ??
      user?.roleName ??
      '';
    return candidate != null ? String(candidate) : '';
  }

  openForm(): void {
    if (!this.canPublish) return;
    this.showForm = !this.showForm;
  }

  initForm(): void {
    this.annonceForm = this.fb.group({
      title:      ['', [Validators.required, Validators.minLength(5), Validators.maxLength(this.titleMaxLength)]],
      content:    ['', [Validators.required, Validators.minLength(10)]],
      price:      ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
      details:    [''],
      categoryId: [null],
      features:   this.fb.array([])
    });
  }

  get features(): FormArray {
    return this.annonceForm.get('features') as FormArray;
  }

  get featureControls(): FormGroup[] {
    return this.features.controls as FormGroup[];
  }

  getFeatureControl(index: number): FormGroup {
    return this.features.at(index) as FormGroup;
  }

  // ══════════════════════════════════════════════════════════════
  // ✅ Normalise les objets renvoyés par l'API Laravel (PascalCase :
  // IdAd, TitleAd, DescriptionAd, PriceAd, IdCateg, Type...) vers les
  // clés camelCase/snake_case attendues partout ailleurs dans ce
  // composant et dans le template (id, title, content, price,
  // category_id, created_at, likes_count...).
  // ══════════════════════════════════════════════════════════════
  //
  // ✅ CORRIGÉ — l'ancienne version faisait une simple concaténation
  // (assetsBaseUrl + chemin brut renvoyé par l'API, ex: "assets/ads/ad_1.jpg"),
  // ce qui donnait une URL cassée car les fichiers sont réellement stockés
  // par AdsController::storeMediaFiles() dans public/assets/ads/images/
  // (voir IMAGES_FOLDER = 'assets/ads/images' dans AdsController.php).
  // On ne garde donc que le NOM DE FICHIER et on reconstruit toujours le
  // bon chemin nous-mêmes, peu importe ce que l'API renvoie exactement
  // (assets/ads/ad_1.jpg, ads/ad_1.jpg, ad_1.jpg, etc.).
  private resolveImageUrl(raw: string | null | undefined): string | null {
    if (!raw || typeof raw !== 'string') return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

    const cleanPath = raw.replace(/\\/g, '/');
    const filename = cleanPath.split('/').pop();
    if (!filename) return null;

    return `${this.assetsService.assetsBaseUrl}/assets/ads/images/${filename}`;
  }

  // ✅ Extrait la première image utilisable à partir du champ ImageAd
  // renvoyé par l'API (tableau JSON, ex: ["ad_6.jpg","ad_6_2.jpg"], ou
  // simple chaîne). C'est ce champ-là, pas "image_url"/"ImageUrl" (qui
  // n'existe pas côté backend, cf. AdsController::mediaUrls()), qui
  // contient réellement les photos.
  private resolveFirstImage(raw: any): string | null {
    const source = raw.ImageAd ?? raw.image ?? raw.image_url ?? raw.ImageUrl;
    let parsed = source;

    if (typeof source === 'string') {
      try { parsed = JSON.parse(source); } catch { parsed = source; }
    }

    const first = Array.isArray(parsed) ? parsed[0] : parsed;
    return this.resolveImageUrl(first);
  }

  // ══════════════════════════════════════════════════════════════
  // ✅ CONFIRMÉ via AdsController.php (fourni par l'utilisateur) — le
  // modèle Ads n'a AUCUN champ "status" ni "rejection_reason". La seule
  // colonne de modération réelle est "Active" (0|1), basculée uniquement
  // via PATCH /ads/{id}/activate (réservé aux admins, cf. routes/api.php
  // Section 4). Il n'existe donc pas de 3ᵉ état "rejeté" ni de motif de
  // rejet côté backend. On dérive un statut à 2 états à partir de Active.
  // ══════════════════════════════════════════════════════════════
  private resolveAdStatus(raw: any): string {
    const active = raw.Active ?? raw.IsActive ?? raw.active;
    return active ? 'approved' : 'pending';
  }

  private mapAd(raw: any): any {
    return {
      id:             raw.IdAd ?? raw.id,
      title:          raw.TitleAd ?? raw.title,
      content:        raw.DescriptionAd ?? raw.content,
      price:          raw.PriceAd ?? raw.price,
      details:        raw.DetailsAd ?? raw.details,
      category_id:    raw.IdCateg ?? raw.category_id,
      type:           raw.Type ?? raw.type,
      // ✅ dérivé de Active, voir resolveAdStatus() ci-dessus.
      status:         this.resolveAdStatus(raw),
      // ✅ champ inexistant côté backend (pas de workflow de rejet pour
      // les annonces) : ne sera jamais peuplé, conservé uniquement pour
      // ne pas casser le template si le backend en ajoute un un jour.
      rejection_reason: raw.rejection_reason ?? raw.RejectionReason,
      // ✅ image_url est désormais une URL absolue déjà résolue ; le
      // template n'a plus besoin de faire imgBase + ...
      image_url:      this.resolveFirstImage(raw),
      author_name:    raw.author_name ?? raw.AuthorName ?? raw.vendor_name ?? raw.VendorName ?? raw.user?.name ?? raw.User?.NameUser,
      author_role:    raw.author_role ?? raw.AuthorRole,
      shop_name:      raw.shop_name ?? raw.ShopName,
      user_id:        raw.user_id ?? raw.IdUser,
      created_at:     raw.created_at ?? raw.CreatedAt,
      likes_count:    raw.likes_count ?? 0,
      views:          raw.ViewCount ?? raw.NbrViews ?? 0,
      comments_count: raw.comments_count ?? 0,
      features:       raw.features ?? raw.Features ?? [],
      raw
    };
  }

  loadAll(): void {
    this.loading = true;
    this.annoncesService.getAnnonces().subscribe({
      next: (res: any) => {
        const data: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.annonces = (Array.isArray(data) ? data : []).map(a => this.mapAd(a));
        this.loading = false;
        this.updateFilteredLists();
      },
      error: () => {
        this.annonces = [];
        this.loading = false;
        this.updateFilteredLists();
      }
    });
  }

  loadMine(): void {
    this.loadingMine = true;
    this.annoncesService.getAnnoncesByUser(this.currentUserId).subscribe({
      next: (res: any) => {
        const data: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.myAnnonces = (Array.isArray(data) ? data : []).map(a => this.mapAd(a));
        this.loadingMine = false;
        this.updateFilteredLists();
      },
      error: () => {
        this.myAnnonces = [];
        this.loadingMine = false;
        this.updateFilteredLists();
      }
    });
  }

  loadCategories(): void {
    this.categoriesService.getCategories().subscribe({
      next: (data: any) => {
        const categories = Array.isArray(data)
          ? data
          : Array.isArray(data?.categories)
            ? data.categories
            : [];

        this.categories = categories
          .map((cat: any) => {
            const rawId = cat.id ?? cat.idCateg ?? cat.IdCateg ?? cat.category_id ?? null;
            const parsedId = rawId != null ? Number(rawId) : null;

            return {
              id:       Number.isFinite(parsedId) ? parsedId : null,
              name_fr:  cat.name_fr ?? cat.nameFr ?? cat.name ?? cat.TitleFr ?? cat.title_fr ?? '',
              name_en:  cat.name_en ?? cat.nameEn ?? cat.title_en ?? cat.TitleEn ?? '',
              raw:      cat
            };
          })
          .filter((cat: any) => cat.id !== null);
      },
      error: () => { this.categories = []; }
    });
  }

  onCategoryChange(categId: number | null): void {
    const categoryId = categId != null ? Number(categId) : null;
    this.selectedCategId  = Number.isFinite(categoryId as number) ? categoryId : null;
    this.categoryFeatures = [];
    this.features.clear();
    if (!this.selectedCategId) return;

    this.categoriesService.getCategoryFeatures(this.selectedCategId).subscribe({
      next: (res: any) => {
        const features = Array.isArray(res) ? res : (res?.data ?? []);
        this.categoryFeatures = Array.isArray(features) ? features : [];

        this.features.clear();
        this.categoryFeatures.forEach((feat: any) => {
          const label = feat.nameFr ?? feat.name_fr ?? feat.name ?? 'Champ';
          const type = feat.inputType ?? feat.type ?? 'text';
          this.features.push(this.fb.group({
            key:       [label],
            value:     [''],
            inputType: [type]
          }));
        });
      },
      error: () => {
        this.categoryFeatures = [];
        this.features.clear();
      }
    });
  }

  get f() { return this.annonceForm.controls; }

  get selectedCategoryName(): string {
    const cat = this.categories.find(c => c.id === this.selectedCategId);
    return cat ? cat.name_fr : '';
  }

  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.handleImageFile(file);
  }

  onGallerySelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addGalleryFiles(Array.from(input.files));
    input.value = '';
  }

  removeGalleryImage(index: number): void {
    this.galleryFiles.splice(index, 1);
    this.galleryPreviews.splice(index, 1);
  }

  get imgBase(): string {
    return this.assetsService.assetsBaseUrl;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleImageFile(file);
  }

  private handleImageFile(file: File): void {
    this.imageError = '';
    if (!file.type.startsWith('image/')) {
      this.imageError = 'Fichier non valide, veuillez choisir une image.';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.imageError = 'Image trop volumineuse (max 2 MB).';
      return;
    }
    this.selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => { this.imagePreview = e.target.result; };
    reader.readAsDataURL(file);
  }

  private addGalleryFiles(files: File[]): void {
    this.galleryError = '';
    for (const file of files) {
      if (this.galleryFiles.length >= this.maxGalleryImages) {
        this.galleryError = `Vous pouvez ajouter jusqu'à ${this.maxGalleryImages} photos.`;
        break;
      }
      if (!file.type.startsWith('image/')) {
        this.galleryError = 'Seules les images JPG, PNG ou WEBP sont acceptées.';
        continue;
      }
      if (file.size > 2 * 1024 * 1024) {
        this.galleryError = 'Chaque photo de galerie doit faire au maximum 2 MB.';
        continue;
      }
      this.galleryFiles.push(file);
      const reader = new FileReader();
      reader.onload = () => this.galleryPreviews.push(String(reader.result));
      reader.readAsDataURL(file);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // ✅ Les clés du payload matchent exactement les règles de
  // validation de AdsController::store() :
  //   - title      -> TitleAd        (required|string|max:250)
  //   - content    -> DescriptionAd  (nullable|string)
  //   - price      -> PriceAd        (required)
  //   - details    -> DetailsAd
  //   - categoryId -> IdCateg
  //   - type       -> Type
  //   - IdUser ajouté explicitement : Ads::create($data) fait un
  //     mass-assign brut, sans IdUser l'annonce serait créée SANS
  //     propriétaire.
  //   - features[].key/value -> Features[].TitleFeature/ValueFeature,
  //     seul format que AdsController::resolveFeatureValueIds() sait
  //     lire (validation: 'Features.*.TitleFeature' / '...ValueFeature').
  // ══════════════════════════════════════════════════════════════
  submit(): void {
    if (!this.canPublish) {
      this.submitError = 'Cette action est réservée aux comptes Entreprise.';
      return;
    }
    if (this.annonceForm.invalid) return;
    this.submitting  = true;
    this.submitError = '';

    const categoryId = this.annonceForm.get('categoryId')?.value;

    const features = this.features.value
      .filter((item: any) => String(item.value || '').trim() !== '')
      .map((item: any) => ({
        TitleFeature: item.key,
        ValueFeature: String(item.value).trim()
      }));

    const payload: any = {
      TitleAd:       this.annonceForm.value.title,
      DescriptionAd: this.annonceForm.value.content,
      PriceAd:       this.annonceForm.value.price,
      Type:          'annonce',
      IdUser:        this.currentUserId,
      // Le backend existant modère les annonces avec la colonne Active :
      // 0 = en attente, 1 = approuvée par l'administrateur.
      Active:        0,
    };
    if (this.annonceForm.value.details) {
      payload.DetailsAd = this.annonceForm.value.details;
    }
    if (categoryId) {
      payload.IdCateg = categoryId;
    }
    if (features.length > 0) {
      payload.Features = features;
    }

    this.annoncesService.createAnnonce(payload).subscribe({
      next: (created: any) => {
        const annonceId = created?.data?.IdAd ?? created?.IdAd ?? created?.id ?? created?.data?.id;
        this.uploadAnnonceMedia(annonceId);
      },
      error: (err: any) => {
        this.submitting  = false;
        this.submitError = err?.error?.message || 'Erreur lors de la soumission.';
      }
    });
  }

  // ✅ AdsController::addMedia() valide 'ImageAd' comme *tableau*
  // ('ImageAd' => 'nullable|array', 'ImageAd.*' => 'image|...'). Le
  // champ FormData doit donc s'appeler "ImageAd[]" (avec crochets), pas
  // "image", sinon Laravel refuse la requête.
  private uploadAnnonceMedia(annonceId: number | undefined): void {
    if (!annonceId) {
      this.finishSubmitSuccess();
      return;
    }

    const filesToUpload: File[] = [];
    if (this.selectedImageFile) filesToUpload.push(this.selectedImageFile);
    filesToUpload.push(...this.galleryFiles);

    if (filesToUpload.length === 0) {
      this.finishSubmitSuccess();
      return;
    }

    let remaining = filesToUpload.length;
    let hadError = false;

    filesToUpload.forEach(file => {
      const mediaData = new FormData();
      mediaData.append('ImageAd[]', file);
      this.annoncesService.addAnnonceMedia(annonceId, mediaData).subscribe({
        next: () => {
          remaining--;
          if (remaining === 0) this.finishSubmitSuccess(hadError);
        },
        error: () => {
          hadError = true;
          remaining--;
          if (remaining === 0) this.finishSubmitSuccess(hadError);
        }
      });
    });
  }

  private finishSubmitSuccess(hadMediaError = false): void {
    this.submitting        = false;
    this.showForm          = false;
    this.submitSuccess     = hadMediaError
      ? 'Annonce créée, mais certaines photos n\'ont pas pu être envoyées.'
      : 'Annonce soumise avec succès ! Elle sera visible après validation par l\'administrateur.';
    this.imagePreview      = '';
    this.selectedImageFile = null;
    this.galleryFiles = [];
    this.galleryPreviews = [];
    this.galleryError = '';
    this.categoryFeatures  = [];
    this.selectedCategId   = null;
    this.resetAnnonceForm();
    this.loadMine();
    setTimeout(() => { this.submitSuccess = ''; }, 6000);
  }

  resetAnnonceForm(): void {
    this.annonceForm.reset({ title: '', content: '', price: '', details: '', categoryId: null });
    this.features.clear();
    this.imageError = '';
    this.imagePreview = '';
    this.selectedImageFile = null;
    this.galleryFiles = [];
    this.galleryPreviews = [];
    this.galleryError = '';
  }

  cancelForm(): void {
    this.resetAnnonceForm();
    this.categoryFeatures = [];
    this.selectedCategId = null;
    this.showForm = false;
    this.submitError = '';
  }

  deleteAnnonce(id: number): void {
    if (!confirm('Supprimer cette annonce ?')) return;
    this.annoncesService.deleteAnnonce(id).subscribe({
      next: () => { this.loadMine(); }
    });
  }

  like(ann: any): void {
    if (this.liking[ann.id]) {
      return;
    }
    this.liking[ann.id] = true;
    this.annoncesService.toggleLike(ann.id).subscribe({
      next: (r: any) => {
        ann.likes_count += r.liked ? 1 : -1;
      },
      error: () => {},
      complete: () => {
        this.liking[ann.id] = false;
      }
    });
  }

  toggleComments(ann: any): void {
    this.expandedComments[ann.id] = !this.expandedComments[ann.id];
    if (this.expandedComments[ann.id] && !this.comments[ann.id]) {
      this.annoncesService.toggleLike(ann.id).subscribe({
        next: (data: any) => {
          this.comments[ann.id] = Array.isArray(data) ? data : (data?.data ?? []);
        },
        error: () => { this.comments[ann.id] = []; }
      });
    }
  }

  postComment(ann: any): void {
    const text = (this.commentText[ann.id] || '').trim();
    if (!text) return;
    this.annoncesService.addComment(ann.id, text).subscribe({
      next: (c: any) => {
        if (!this.comments[ann.id]) this.comments[ann.id] = [];
        this.comments[ann.id].push(c);
        ann.comments_count++;
        this.commentText[ann.id] = '';
      },
      error: () => {}
    });
  }

  // ✅ 'rejected' n'existe pas côté backend (voir resolveAdStatus), mais
  // conservé ici pour ne rien casser si un vrai statut est ajouté un jour.
  getStatusClass(s: string): string {
    switch (s) {
      case 'approved': return 'bg-success-subtle text-success';
      case 'pending':  return 'bg-warning-subtle text-warning';
      case 'rejected': return 'bg-danger-subtle text-danger';
      default:         return 'bg-secondary-subtle text-secondary';
    }
  }

  getStatusLabel(s: string): string {
    switch (s) {
      case 'approved': return 'Approuvée';
      case 'pending':  return 'En attente';
      case 'rejected': return 'Rejetée';
      default:         return s;
    }
  }

  // ✅ data.map plantait ici : la réponse de /ads-wishlist n'est pas
  // toujours un tableau brut (elle peut arriver enveloppée dans
  // { data: [...] }). On applique le même garde-fou Array.isArray(...)
  // que partout ailleurs dans ce fichier avant d'appeler .map().
  loadWishlistIds(): void {
    this.wishlistService.getWishlistAds().subscribe({
      next: (res: any) => {
        const data: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.wishlistedAdIds = new Set(
          (Array.isArray(data) ? data : []).map((item: any) => item.targetId)
        );
      },
      error: () => { this.wishlistedAdIds = new Set(); }
    });
  }

  isWishlisted(annId: number): boolean {
    return this.wishlistedAdIds.has(annId);
  }

  toggleWishlist(ann: any): void {
    if (this.wishlistedAdIds.has(ann.id)) {
      this.wishlistService.removeFromWishlist('ads', ann.id).subscribe({
        next: () => { this.wishlistedAdIds.delete(ann.id); },
        error: () => {}
      });
    } else {
      this.wishlistService.addToWishlist('ads', ann.id).subscribe({
        next: () => { this.wishlistedAdIds.add(ann.id); },
        error: () => {}
      });
    }
  }

  toTimestamp(dateStr: string): number {
    const d = this.parseDateSafe(dateStr);
    return d ? d.getTime() : 0;
  }

  safeDate(dateStr: string): Date | null {
    return this.parseDateSafe(dateStr);
  }

  private parseDateSafe(dateStr: string): Date | null {
    if (!dateStr) return null;

    const direct = new Date(dateStr);
    if (!isNaN(direct.getTime())) return direct;

    const cleaned = dateStr.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
    const match = cleaned.match(/^([a-zéû]+)\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)?$/i);

    if (match) {
      const [, monthStr, day, year, hourStr, minute, ampm] = match;
      const month = this.frMonths[monthStr];
      if (month !== undefined) {
        let hour = parseInt(hourStr, 10);
        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
        const parsed = new Date(
          parseInt(year, 10), month, parseInt(day, 10),
          hour, parseInt(minute, 10)
        );
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }

    return null;
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchInput);
  }

  clearSearch(): void {
    this.searchInput = '';
    this.searchTerm  = '';
    this.currentPage = 1;
    this.updateFilteredLists();
  }

  setActiveTab(tab: 'toutes' | 'miennes'): void {
    this.activeTab = tab;
    this.clearSearch();
  }

  onSortChange(): void {
    this.currentPage = 1;
    this.updateFilteredLists();
  }

  // ─── Filtres avancés ───────────────────────────────────────────

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  toggleFacet(key: string): void {
    this.facetOpen[key] = this.facetOpen[key] === false ? true : false;
  }

  get selectedFilterCategoryName(): string {
    const cat = this.categories.find(c => c.id === this.filterCategoryId);
    return cat ? cat.name_fr : '';
  }

  get activeFeatureFilterKeys(): string[] {
    return Object.keys(this.filterFeatures).filter(k => (this.filterFeatures[k] || []).length > 0);
  }

  get activeFiltersCount(): number {
    let count = 0;
    if (this.filterCategoryId) count++;
    if (this.filterType) count++;
    if (this.filterDateFrom) count++;
    if (this.filterDateTo) count++;
    if (this.filterPriceMin != null) count++;
    if (this.filterPriceMax != null) count++;
    if (this.filterCondition) count++;
    this.activeFeatureFilterKeys.forEach(k => count += this.filterFeatures[k].length);
    return count;
  }

  private normalizeKey(key: string): string {
    return (key || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private isConditionKey(key: string): boolean {
    const norm = this.normalizeKey(key);
    return norm === 'etat' || norm === 'condition' || norm === 'etat du produit';
  }

  get availableConditions(): string[] {
    const source = this.activeTab === 'toutes' ? this.annonces : this.myAnnonces;
    const values = new Set<string>();
    source.forEach(ann => {
      if (Array.isArray(ann.features)) {
        ann.features.forEach((f: any) => {
          if (this.isConditionKey(f.key) && f.value) {
            values.add(String(f.value).trim());
          }
        });
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }

  toggleCategoryDropdown(): void {
    this.categoryDropdownOpen = !this.categoryDropdownOpen;
  }

  closeCategoryDropdown(): void {
    this.categoryDropdownOpen = false;
  }

  selectFilterCategory(categId: number | null): void {
    this.onFilterCategoryChange(categId);
    this.categoryDropdownOpen = false;
  }

  getCategoryCount(categId: number | null): number {
    const source = this.activeTab === 'toutes' ? this.annonces : this.myAnnonces;
    if (categId === null) return source.length;
    return source.filter(a => Number(a.category_id) === Number(categId)).length;
  }

  onFilterCategoryChange(categId: number | null): void {
    const id = categId != null ? Number(categId) : null;
    this.filterCategoryId = Number.isFinite(id as number) ? id : null;
    this.filterFeatures = {};
    this.filterCategoryFeatures = [];
    this.currentPage = 1;

    if (!this.filterCategoryId) {
      this.updateFilteredLists();
      return;
    }

    this.loadingFilterFeatures = true;
    this.categoriesService.getCategoryFeatures(this.filterCategoryId).subscribe({
      next: (res: any) => {
        const features = Array.isArray(res) ? res : (res?.data ?? []);
        this.filterCategoryFeatures = Array.isArray(features) ? features : [];
        this.loadingFilterFeatures = false;
        this.updateFilteredLists();
      },
      error: () => {
        this.filterCategoryFeatures = [];
        this.loadingFilterFeatures = false;
        this.updateFilteredLists();
      }
    });
  }

  onFilterTypeChange(): void {
    this.currentPage = 1;
    this.updateFilteredLists();
  }

  onFilterDateChange(): void {
    this.currentPage = 1;
    this.updateFilteredLists();
  }

  onFilterFeatureChange(): void {
    this.currentPage = 1;
    this.updateFilteredLists();
  }

  onFilterPriceChange(): void {
    this.currentPage = 1;
    this.updateFilteredLists();
  }

  onFilterConditionChange(): void {
    this.currentPage = 1;
    this.updateFilteredLists();
  }

  toggleFeatureValue(key: string, value: string): void {
    const arr = [...(this.filterFeatures[key] || [])];
    const idx = arr.indexOf(value);
    if (idx > -1) { arr.splice(idx, 1); } else { arr.push(value); }

    if (arr.length === 0) {
      const { [key]: _removed, ...rest } = this.filterFeatures;
      this.filterFeatures = rest;
    } else {
      this.filterFeatures = { ...this.filterFeatures, [key]: arr };
    }
    this.onFilterFeatureChange();
  }

  isFeatureValueSelected(key: string, value: string): boolean {
    return (this.filterFeatures[key] || []).includes(value);
  }

  clearFeatureFilter(key: string): void {
    const { [key]: _removed, ...rest } = this.filterFeatures;
    this.filterFeatures = rest;
    this.onFilterFeatureChange();
  }

  resetAdvancedFilters(): void {
    this.filterCategoryId = null;
    this.filterType = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.filterFeatures = {};
    this.filterCategoryFeatures = [];
    this.filterPriceMin = null;
    this.filterPriceMax = null;
    this.filterCondition = '';
    this.currentPage = 1;
    this.updateFilteredLists();
  }

  private get priceSourceItems(): any[] {
    return this.activeTab === 'toutes' ? this.annonces : this.myAnnonces;
  }

  get priceBoundMin(): number {
    const prices = this.priceSourceItems.map(a => parseFloat(a.price)).filter(p => Number.isFinite(p));
    return prices.length ? Math.floor(Math.min(...prices)) : 0;
  }

  get priceBoundMax(): number {
    const prices = this.priceSourceItems.map(a => parseFloat(a.price)).filter(p => Number.isFinite(p));
    return prices.length ? Math.ceil(Math.max(...prices)) : 1000;
  }

  get priceMinPct(): number {
    const range = this.priceBoundMax - this.priceBoundMin || 1;
    return ((this.filterPriceMin ?? this.priceBoundMin) - this.priceBoundMin) / range * 100;
  }

  get priceMaxPct(): number {
    const range = this.priceBoundMax - this.priceBoundMin || 1;
    return ((this.filterPriceMax ?? this.priceBoundMax) - this.priceBoundMin) / range * 100;
  }

  onPriceMinChange(v: number): void {
    let val = Number(v);
    if (this.filterPriceMax != null && val > this.filterPriceMax) val = this.filterPriceMax;
    this.filterPriceMin = val;
    this.onFilterPriceChange();
  }

  onPriceMaxChange(v: number): void {
    let val = Number(v);
    if (this.filterPriceMin != null && val < this.filterPriceMin) val = this.filterPriceMin;
    this.filterPriceMax = val;
    this.onFilterPriceChange();
  }

  private itemsForFacetCounts(): any[] {
    const source = this.priceSourceItems;
    return source.filter(a => {
      if (this.filterCategoryId && Number(a.category_id) !== Number(this.filterCategoryId)) return false;
      if (this.filterType && a.type !== this.filterType) return false;

      const price = parseFloat(a.price);
      if (this.filterPriceMin != null && (!Number.isFinite(price) || price < this.filterPriceMin)) return false;
      if (this.filterPriceMax != null && (!Number.isFinite(price) || price > this.filterPriceMax)) return false;

      if (this.filterDateFrom) {
        const from = new Date(this.filterDateFrom).getTime();
        const t = this.toTimestamp(a.created_at);
        if (!t || t < from) return false;
      }
      if (this.filterDateTo) {
        const to = new Date(this.filterDateTo).getTime() + (24 * 60 * 60 * 1000 - 1);
        const t = this.toTimestamp(a.created_at);
        if (!t || t > to) return false;
      }

      if (this.filterCondition) {
        const cf = Array.isArray(a.features) ? a.features.find((f: any) => this.isConditionKey(f.key)) : null;
        if (!cf || String(cf.value).trim() !== this.filterCondition) return false;
      }

      return true;
    });
  }

  get featureFacets(): { key: string; options: { value: string; count: number }[] }[] {
    if (!this.filterCategoryId || this.filterCategoryFeatures.length === 0) return [];

    const baseItems = this.itemsForFacetCounts();

    return this.filterCategoryFeatures
      .map((feat: any) => {
        const label = feat.nameFr ?? feat.name_fr ?? feat.name ?? 'Champ';
        const counts = new Map<string, number>();

        baseItems.forEach(item => {
          const found = Array.isArray(item.features)
            ? item.features.find((f: any) => f.key === label)
            : null;
          if (found && found.value != null && String(found.value).trim() !== '') {
            const v = String(found.value).trim();
            counts.set(v, (counts.get(v) || 0) + 1);
          }
        });

        const options = Array.from(counts.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));

        return { key: label, options };
      })
      .filter(facet => facet.options.length > 0);
  }

  private matchesAdvancedFilters(ann: any): boolean {
    if (this.filterCategoryId && Number(ann.category_id) !== Number(this.filterCategoryId)) {
      return false;
    }

    if (this.filterType && ann.type !== this.filterType) {
      return false;
    }

    if (this.filterDateFrom) {
      const from = new Date(this.filterDateFrom).getTime();
      const annTime = this.toTimestamp(ann.created_at);
      if (!annTime || annTime < from) return false;
    }

    if (this.filterDateTo) {
      const to = new Date(this.filterDateTo).getTime() + (24 * 60 * 60 * 1000 - 1);
      const annTime = this.toTimestamp(ann.created_at);
      if (!annTime || annTime > to) return false;
    }

    const price = parseFloat(ann.price);
    if (this.filterPriceMin != null && (!Number.isFinite(price) || price < this.filterPriceMin)) {
      return false;
    }
    if (this.filterPriceMax != null && (!Number.isFinite(price) || price > this.filterPriceMax)) {
      return false;
    }

    if (this.filterCondition) {
      const conditionFeature = Array.isArray(ann.features)
        ? ann.features.find((f: any) => this.isConditionKey(f.key))
        : null;
      if (!conditionFeature || String(conditionFeature.value).trim() !== this.filterCondition) {
        return false;
      }
    }

    const activeFeatureFilters = this.activeFeatureFilterKeys;
    if (activeFeatureFilters.length > 0) {
      if (!Array.isArray(ann.features) || ann.features.length === 0) return false;
      for (const key of activeFeatureFilters) {
        const selectedValues = this.filterFeatures[key] || [];
        const found = ann.features.find((f: any) => f.key === key);
        if (!found) return false;
        if (!selectedValues.includes(String(found.value).trim())) return false;
      }
    }

    return true;
  }

  goToPage(page: number): void {
    const total = this.activeTab === 'toutes' ? this.totalPages : this.totalPagesMine;
    if (page < 1 || page > total) return;
    this.currentPage = page;
    this.updatePagination();
  }

  private filterAndSort(list: any[]): any[] {
    const source = Array.isArray(list) ? list : [];
    const term = this.searchTerm.trim().toLowerCase();
    let result = !term
      ? [...source]
      : source.filter(a =>
          a.title?.toLowerCase().includes(term) ||
          a.content?.toLowerCase().includes(term)
        );

    result = result.filter(a => this.matchesAdvancedFilters(a));

    return result.sort((a, b) => {
      switch (this.sortBy) {
        case 'oldest':
          return this.toTimestamp(a.created_at) - this.toTimestamp(b.created_at);
        case 'likes':
          return (b.likes_count || 0) - (a.likes_count || 0);
        default:
          return this.toTimestamp(b.created_at) - this.toTimestamp(a.created_at);
      }
    });
  }

  private updateFilteredLists(): void {
    this.filteredAnnonces = this.filterAndSort(this.annonces);
    this.filteredMyAnnonces = this.filterAndSort(this.myAnnonces);
    this.totalPages = Math.max(1, Math.ceil(this.filteredAnnonces.length / this.pageSize));
    this.totalPagesMine = Math.max(1, Math.ceil(this.filteredMyAnnonces.length / this.pageSize));
    this.pagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.pagesArrayMine = Array.from({ length: this.totalPagesMine }, (_, i) => i + 1);

    const activeTotal = this.activeTab === 'toutes' ? this.totalPages : this.totalPagesMine;
    if (this.currentPage > activeTotal) {
      this.currentPage = activeTotal;
    }

    this.updatePagination();
  }

  private updatePagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedAnnonces = this.filteredAnnonces.slice(start, start + this.pageSize);
    this.paginatedMyAnnonces = this.filteredMyAnnonces.slice(start, start + this.pageSize);
  }

  highlightParts(title: string): { text: string; match: boolean }[] {
    const term = this.searchTerm.trim();
    if (!term || !title) return [{ text: title, match: false }];
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return title.split(regex).map(part => ({
      text: part,
      match: part.toLowerCase() === term.toLowerCase()
    }));
  }
}
