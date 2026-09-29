import { Component, OnInit } from '@angular/core';
import { AssetsService } from 'src/app/core/services/assets.service';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProductsService } from 'src/app/core/services/products.service';
import { CategoriesService } from 'src/app/core/services/categories.service';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

@Component({
  selector: 'app-products-ent',
  templateUrl: './products-ent.component.html',
  styleUrls: ['./products-ent.component.scss'],
  standalone: false
})
export class ProductsEntComponent implements OnInit {

  breadCrumbItems = [
    { label: 'Vendeur' },
    { label: 'Mes Produits', active: true }
  ];

  products: any[]         = [];
  filteredProducts: any[] = [];
  categories: any[]       = [];
  searchTerm              = '';
  filterStatus            = 'tous';
  showForm                = false;
  editMode                = false;
  selectedProduct: any    = null;
  productForm!: FormGroup;
  loading                 = true;
  saving                  = false;
  saveError               = '';

  // ─── Image principale ──────────────────────────────────────────
  imagePreview  = '';
  selectedFile: File | null = null;

  // ─── Galerie (comme pour les annonces) ────────────────────────
  galleryFiles: File[]      = [];
  galleryPreviews: string[] = [];
  galleryError = '';
  readonly maxGalleryImages = 8;
  isDragOver = false;

  // ─── Catégorie + caractéristiques dynamiques ──────────────────
  selectedCategId: number | null = null;
  categoryFeatures: any[] = [];

  readonly titleMaxLength = 100;

  public Editor = ClassicEditor;
  public editorConfig = {
    toolbar: ['bold', 'italic', 'underline', 'numberedList', 'bulletedList', 'link', 'removeFormat']
  };

  deleteConfirmId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private productsService: ProductsService, private categoriesService: CategoriesService, private assetsService: AssetsService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadProducts();
    this.loadCategories();
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'add') {
        setTimeout(() => this.openAdd(), 300);
      }
    });

    this.watchCategoryChanges();
  }

  // ══════════════════════════════════════════════════════════════
  // FORM
  // ══════════════════════════════════════════════════════════════

  // ⚠️ CORRIGÉ — category_id est désormais requis (Validators.required).
  // La colonne `IdCateg` en base est déclarée NOT NULL avec une contrainte
  // de clé étrangère vers Categories (FK_Products_Categories) ; envoyer
  // IdCateg: null provoquait un 500 (SQLSTATE[23000]: Column 'IdCateg'
  // cannot be null) côté ProductsController::update(). On corrige côté
  // front uniquement (pas d'accès/modification du backend autorisée) en
  // rendant la catégorie réellement obligatoire dans le formulaire, ce qui
  // empêche structurellement l'envoi de IdCateg: null.
  initForm(p?: any) {
    this.productForm = this.fb.group({
      name:        [p?.name        || '', [Validators.required, Validators.minLength(3), Validators.maxLength(this.titleMaxLength)]],
      description: [p?.description || '', [Validators.required, Validators.minLength(10)]],
      price:       [p?.price       || '', [Validators.required, Validators.pattern(/^\d+(\.\d{1,3})?$/)]],
      stock:       [p?.stock       ?? 0,  [Validators.required, Validators.min(0)]],
      category_id: [p?.categoryId  || null, Validators.required],
      features:    this.fb.array([])
    });

    // initForm() recrée entièrement productForm (nouvelle instance de
    // FormGroup) — donc tout abonnement pris sur l'ancienne instance
    // (ex. dans ngOnInit au premier appel) reste accroché à un objet mort
    // et ne se déclenche plus après un openEdit()/openAdd() ultérieur.
    // On réabonne systématiquement ici, à chaque (re)création du form.
    this.watchCategoryChanges();
  }

  private watchCategoryChanges(): void {
    this.productForm.get('category_id')!.valueChanges.subscribe(id => {
      this.onCategoryChange(id);
    });
  }

  get f() { return this.productForm.controls; }

  get features(): FormArray {
    return this.productForm.get('features') as FormArray;
  }

  get featureControls(): FormGroup[] {
    return this.features.controls as FormGroup[];
  }

  getFeatureControl(index: number): FormGroup {
    return this.features.at(index) as FormGroup;
  }

  // ══════════════════════════════════════════════════════════════
  // CATEGORIES + FEATURES DYNAMIQUES
  // (même logique que AnnoncesEntComponent.onCategoryChange)
  // ══════════════════════════════════════════════════════════════

  private loadCategories(): void {
    this.categoriesService.getCategories().subscribe({
      next: (data: any[]) => {
        const raw = Array.isArray(data) ? data : [];
        this.categories = raw.map((c: any) => ({
          id: c.IdCateg ?? c.id,
          name_fr: c.TitleFr || c.TitleEn || c.TitleAr || c.name || 'Sans nom',
        }));
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
        const feats = Array.isArray(res) ? res : (res?.data ?? []);
        this.categoryFeatures = Array.isArray(feats) ? feats : [];

        this.features.clear();
        this.categoryFeatures.forEach((feat: any) => {
          const label = feat.nameFr ?? feat.name_fr ?? feat.name ?? 'Champ';
          const type  = feat.inputType ?? feat.type ?? 'text';
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

  get selectedCategoryName(): string {
    const cat = this.categories.find(c => c.id === this.selectedCategId);
    return cat ? cat.name_fr : '';
  }

  // ══════════════════════════════════════════════════════════════
  // MAPPING BACKEND (PascalCase Laravel -> camelCase composant)
  // ══════════════════════════════════════════════════════════════

  private resolveImageUrl(raw: string | null | undefined): string | null {
    if (!raw || typeof raw !== 'string') return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

    const cleanPath = raw.replace(/\\/g, '/');
    const filename = cleanPath.split('/').pop();
    if (!filename) return null;

    // IMAGES_FOLDER dans ProductsController.php = 'assets/products/images'
    return `${this.assetsService.assetsBaseUrl}/assets/products/images/${filename}`;
  }

  private resolveAllImages(raw: any): string[] {
    let source = raw.ImageProduct ?? raw.image_url ?? raw.image;

    if (typeof source === 'string') {
      try { source = JSON.parse(source); } catch { source = source ? [source] : []; }
    }
    if (!Array.isArray(source)) source = source ? [source] : [];

    return source
      .map((f: string) => this.resolveImageUrl(f))
      .filter((u: string | null): u is string => !!u);
  }

  private mapProduct(raw: any): any {
    const images = this.resolveAllImages(raw);
    return {
      id:             raw.IdProduct ?? raw.id,
      name:           raw.TitleProduct ?? raw.name ?? 'Sans titre',
      description:    raw.DescriptionProduct ?? raw.description ?? '',
      categoryId:     raw.IdCateg ?? raw.category_id ?? null,
      category:       raw.category?.TitleFr ?? raw.category_name ?? raw.category ?? '',
      price:          parseFloat(raw.PriceProduct ?? raw.price ?? '0') || 0,
      stock:          raw.QuantityProduct ?? raw.Stock ?? raw.stock ?? raw.quantity ?? 0,
      status:         (raw.Active === 1 || raw.Active === true) ? 'actif' : 'inactif',
      approvalStatus: (raw.Active === 1 || raw.Active === true) ? 'approved' : 'pending',
      images,
      image:          images[0] ?? null,
      views:           raw.ViewCount ?? 0,
      likes:          raw.LikeCount ?? 0,
      // ⚠️ CORRIGÉ — la colonne réelle en base/$fillable est
      // `QuantityProduct`, pas `Stock` ni `stock`/`quantity`. On garde les
      // anciens noms en fallback au cas où une autre route renverrait un
      // format différent, mais QuantityProduct est prioritaire.
      // features renvoyées par le backend via ->load('values.feature')
      features: (raw.values ?? []).map((v: any) => ({
        key:   v.feature?.TitleFeature ?? v.TitleFeature,
        value: v.ValueFeature
      })),
      raw
    };
  }

  loadProducts(): void {
    this.loading = true;
    this.productsService.getMyProducts().subscribe({
      next: (res: any) => {
        const raw: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.products = raw.map((p: any) => this.mapProduct(p));
        this.loading = false;
        this.applyFilter();
      },
      error: () => { this.loading = false; }
    });
  }

  getCategoryName(p: any): string {
    if (p.category) return p.category;
    const cat = this.categories.find(c => String(c.id) === String(p.categoryId));
    return cat ? cat.name_fr : '—';
  }

  private getCurrentUserId(): number | null {
    try {
      const cu = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const raw = cu?.id ?? cu?.IdUser ?? cu?.user?.id;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // FILTRAGE / RECHERCHE
  // ══════════════════════════════════════════════════════════════

  applyFilter() {
    let list = [...this.products];
    if (this.filterStatus !== 'tous') list = list.filter(p => p.status === this.filterStatus);
    if (this.searchTerm.trim()) {
      const t = this.searchTerm.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(t) ||
        this.getCategoryName(p).toLowerCase().includes(t) ||
        (p.description || '').toLowerCase().includes(t)
      );
    }
    this.filteredProducts = list;
  }

  // ══════════════════════════════════════════════════════════════
  // OUVERTURE / FERMETURE DU FORMULAIRE
  // ══════════════════════════════════════════════════════════════

  openAdd() {
    this.editMode        = false;
    this.selectedProduct = null;
    this.imagePreview    = '';
    this.selectedFile    = null;
    this.galleryFiles    = [];
    this.galleryPreviews = [];
    this.galleryError    = '';
    this.saveError       = '';
    this.categoryFeatures = [];
    this.selectedCategId  = null;
    this.initForm();
    this.showForm = true;
    setTimeout(() => document.getElementById('productNameInput')?.focus(), 100);
  }

  openEdit(p: any) {
    this.editMode        = true;
    this.selectedProduct = p;
    this.imagePreview    = p.image || '';
    this.selectedFile    = null;
    this.galleryFiles    = [];
    this.galleryPreviews = [];
    this.galleryError    = '';
    this.saveError       = '';
    this.initForm(p);
    this.showForm = true;

    // Recharge les caractéristiques de la catégorie déjà choisie, puis
    // réinjecte les valeurs existantes du produit dans le FormArray.
    if (p.categoryId) {
      this.selectedCategId = p.categoryId;
      this.categoriesService.getCategoryFeatures(p.categoryId).subscribe({
        next: (res: any) => {
          const feats = Array.isArray(res) ? res : (res?.data ?? []);
          this.categoryFeatures = Array.isArray(feats) ? feats : [];
          this.features.clear();
          this.categoryFeatures.forEach((feat: any) => {
            const label = feat.nameFr ?? feat.name_fr ?? feat.name ?? 'Champ';
            const type  = feat.inputType ?? feat.type ?? 'text';
            const existing = (p.features || []).find((f: any) => f.key === label);
            this.features.push(this.fb.group({
              key:       [label],
              value:     [existing?.value ?? ''],
              inputType: [type]
            }));
          });
        },
        error: () => { this.categoryFeatures = []; }
      });
    }
  }

  cancelForm() {
    this.showForm        = false;
    this.selectedProduct = null;
    this.imagePreview    = '';
    this.selectedFile    = null;
    this.galleryFiles    = [];
    this.galleryPreviews = [];
    this.galleryError    = '';
    this.saveError       = '';
    this.categoryFeatures = [];
    this.selectedCategId  = null;
  }

  // ══════════════════════════════════════════════════════════════
  // IMAGE PRINCIPALE (drag & drop comme les annonces)
  // ══════════════════════════════════════════════════════════════

  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.handleImageFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault(); event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault(); event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault(); event.stopPropagation();
    this.isDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleImageFile(file);
  }

  private handleImageFile(file: File): void {
    this.saveError = '';
    if (!file.type.startsWith('image/')) {
      this.saveError = 'Fichier non valide, veuillez choisir une image.';
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      this.saveError = 'Image trop volumineuse (max 3 MB).';
      return;
    }
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => { this.imagePreview = e.target.result; };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.imagePreview = '';
    this.selectedFile = null;
  }

  // ══════════════════════════════════════════════════════════════
  // GALERIE (identique au principe utilisé pour les annonces)
  // ══════════════════════════════════════════════════════════════

  onGallerySelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addGalleryFiles(Array.from(input.files));
    input.value = '';
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
      if (file.size > 3 * 1024 * 1024) {
        this.galleryError = 'Chaque photo de galerie doit faire au maximum 3 MB.';
        continue;
      }
      this.galleryFiles.push(file);
      const reader = new FileReader();
      reader.onload = () => this.galleryPreviews.push(String(reader.result));
      reader.readAsDataURL(file);
    }
  }

  removeGalleryImage(index: number): void {
    this.galleryFiles.splice(index, 1);
    this.galleryPreviews.splice(index, 1);
  }

  // ══════════════════════════════════════════════════════════════
  // SAUVEGARDE — clés du payload alignées sur ProductsController::store()/update()
  //   name        -> TitleProduct        (required|string|max:250)
  //   description -> DescriptionProduct  (nullable|string)
  //   price       -> PriceProduct        (required)
  //   stock       -> QuantityProduct     (⚠️ PAS "Stock" — absent de
  //                                        $fillable, ignoré en silence
  //                                        par le mass assignment sinon)
  //   category_id -> IdCateg             (NOT NULL + FK Categories en base,
  //                                        d'où la vérification explicite
  //                                        ci-dessous en plus du Validators.required
  //                                        du form, en filet de sécurité)
  //   features[]  -> Features[].TitleFeature/ValueFeature
  //   IdUser ajouté explicitement, sinon getMyProducts() ne retrouve pas
  //   le produit (mass-assign brut côté backend).
  // ══════════════════════════════════════════════════════════════

  saveProduct() {
    this.productForm.markAllAsTouched();
    if (this.productForm.invalid) return;

    const val = this.productForm.value;

    // ⚠️ Filet de sécurité : la colonne IdCateg est NOT NULL en base
    // (contrainte FK_Products_Categories). Le Validators.required sur
    // category_id empêche déjà normalement d'arriver ici sans catégorie,
    // mais on bloque explicitement l'envoi pour ne jamais dépendre
    // uniquement de l'état du form.
    if (!val.category_id) {
      this.saving    = false;
      this.saveError = 'Veuillez choisir une catégorie.';
      return;
    }

    const features = this.features.value
      .filter((item: any) => String(item.value || '').trim() !== '')
      .map((item: any) => ({
        TitleFeature: item.key,
        ValueFeature: String(item.value).trim()
      }));

    const payload: any = {
      TitleProduct:       val.name?.trim(),
      DescriptionProduct: val.description?.trim(),
      PriceProduct:       val.price,
      // ⚠️ CORRIGÉ — la clé `Stock` n'existe pas dans $fillable de
      // Products (confirmé via app/Models/Products.php), donc Laravel
      // l'ignorait silencieusement lors du mass assignment : aucune
      // erreur, mais le stock n'était jamais mis à jour en base. La
      // vraie colonne s'appelle `QuantityProduct`.
      QuantityProduct:    val.stock ?? 0,
      IdCateg:            +val.category_id,
      IdUser:             this.getCurrentUserId(),
      // Même workflow que les annonces : un nouveau produit reste en attente
      // jusqu'à l'action de l'administrateur sur /products/{id}/activate.
      Active:             0,
    };
    if (features.length > 0) {
      payload.Features = features;
    }

    this.saving    = true;
    this.saveError = '';

    if (this.editMode && this.selectedProduct) {
      this.productsService.updateProduct(this.selectedProduct.id, payload).subscribe({
        next: () => this.uploadProductMedia(this.selectedProduct.id),
        error: (err: any) => {
          this.saving    = false;
          this.saveError = err?.error?.message || 'Erreur lors de la modification.';
        }
      });
    } else {
      this.productsService.createProduct(payload).subscribe({
        next: (created: any) => {
          const newId = created?.id ?? created?.IdProduct ?? created?.data?.id ?? created?.data?.IdProduct;
          if (newId) this.uploadProductMedia(newId);
          else { this.saving = false; this.showForm = false; this.loadProducts(); }
        },
        error: (err: any) => {
          this.saving    = false;
          this.saveError = err?.error?.message || 'Erreur lors de l\'ajout.';
        }
      });
    }
  }

  // ✅ ProductsController::addMedia() valide 'ImageProduct' comme
  // *tableau* ('ImageProduct' => 'nullable|array'). Le champ FormData
  // doit donc s'appeler "ImageProduct[]", et chaque fichier est envoyé
  // dans un appel séparé (comme pour les annonces), sinon un seul échec
  // dans le lot ferait échouer tous les fichiers en même temps.
  private uploadProductMedia(productId: number | undefined): void {
    if (!productId) {
      this.finishSaveSuccess();
      return;
    }

    const filesToUpload: File[] = [];
    if (this.selectedFile) filesToUpload.push(this.selectedFile);
    filesToUpload.push(...this.galleryFiles);

    if (filesToUpload.length === 0) {
      this.finishSaveSuccess();
      return;
    }

    let remaining = filesToUpload.length;
    let hadError  = false;

    filesToUpload.forEach(file => {
      const formData = new FormData();
      formData.append('ImageProduct[]', file);
      this.productsService.addProductMedia(productId, formData).subscribe({
        next: () => {
          remaining--;
          if (remaining === 0) this.finishSaveSuccess(hadError);
        },
        error: () => {
          hadError = true;
          remaining--;
          if (remaining === 0) this.finishSaveSuccess(hadError);
        }
      });
    });
  }

  private finishSaveSuccess(hadMediaError = false): void {
    this.saving    = false;
    this.showForm  = false;
    this.saveError = hadMediaError
      ? 'Produit enregistré, mais certaines photos n\'ont pas pu être envoyées.'
      : '';
    this.loadProducts();
  }

  // ══════════════════════════════════════════════════════════════
  // ACTIONS DIVERSES
  // ══════════════════════════════════════════════════════════════

  confirmDelete(id: number) { this.deleteConfirmId = id; }
  cancelDelete()            { this.deleteConfirmId = null; }

  deleteProduct(id: number) {
    this.productsService.deleteProduct(id).subscribe({ // TODO verify
      next: () => {
        this.products = this.products.filter(p => p.id !== id);
        this.applyFilter();
        this.deleteConfirmId = null;
      }
    });
  }

  get pendingCount()  { return this.products.filter(p => p.approvalStatus === 'pending').length; }
  get activeCount()   { return this.products.filter(p => p.status === 'actif').length; }
  get inactiveCount() { return this.products.filter(p => p.status === 'inactif').length; }

  getApprovalBadge(status: string): string {
    const m: Record<string, string> = {
      approved: 'badge bg-success-subtle text-success',
      pending:  'badge bg-warning-subtle text-warning',
      rejected: 'badge bg-danger-subtle text-danger',
    };
    return m[status] || 'badge bg-secondary-subtle text-secondary';
  }

  getApprovalLabel(status: string): string {
    const m: Record<string, string> = { approved: 'Approuvé', pending: 'En attente', rejected: 'Refusé' };
    return m[status] || status;
  }
}
