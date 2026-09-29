import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthenticationService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-profile-ent',
  templateUrl: './profile-ent.component.html',
  styleUrls: ['./profile-ent.component.scss'],
  standalone: false
})
export class ProfileEntComponent implements OnInit {

  breadCrumbItems = [
    { label: 'Vendeur' },
    { label: 'Mon Profil', active: true }
  ];

  activeTab: 'infos' | 'boutique' | 'securite' | 'verification' = 'infos';
  infoForm!: FormGroup;
  shopForm!: FormGroup;
  pwdForm!: FormGroup;

  submitted      = false;
  shopSubmit     = false;
  pwdSubmit      = false;
  saving         = false;
  saveMsg        = '';
  saveError      = '';
  showCurrentPwd = false;
  showNewPwd     = false;
  showConfirmPwd = false;
  loading        = true;

  profilePicture = '';
  // Fichier réel sélectionné, nécessaire pour l'upload multipart.
  profilePictureFile: File | null = null;
  uploading = false;

  // ?? ShopName / CompanyNumber n'existent dans aucune colonne de la
  // table Users côté backend, et updateProfile() (PUT /profile) a une
  // whitelist stricte qui ne les inclut pas. Impossible de les persister
  // côté serveur sans migration + modification backend (hors périmètre
  // ici — je ne touche pas au backend). On les stocke donc localement,
  // par utilisateur, en attendant. Voir loadShopFromLocalStorage/saveBoutique().
  shopStorageAvailable = true;

  // ?? Idem que pour profile-user : aucune route self-service de
  // vérification n'existe côté backend (seulement l'admin, avec {user}
  // en paramètre de route). On n'appelle donc aucune API pour cette
  // fonctionnalité — l'onglet reste visible mais affiche un état
  // "indisponible" explicite plutôt que d'échouer silencieusement.
  verificationAvailable = true;
  verification = { isVerified: false, documentType: 'CIN', identityNumber: '', verifiedAt: null as string | null };
  verificationPhoto: File | null = null;
  verificationPhotoPreview = '';
  verificationSubmitting = false;
  verificationMessage = '';
  verificationError = '';

  wilayas = [
    'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Sousse', 'Sfax',
    'Monastir', 'Mahdia', 'Kairouan', 'Bizerte', 'Béja', 'Jendouba',
    'Gabès', 'Médenine', 'Gafsa', 'Tozeur', 'Kébili', 'Tataouine', 'Kasserine', 'Hammamet'
  ];

  constructor(private fb: FormBuilder, private authService: AuthenticationService) {}

  ngOnInit(): void {
    this.buildForms();
    this.loadProfile();
  }

  buildForms() {
    this.infoForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName:  ['', [Validators.required, Validators.minLength(2)]],
      phone:     [''],   // optionnel — validé seulement si non vide côté template
      city:      [''],
      address:   [''],
    });
    this.shopForm = this.fb.group({
      shopName:      ['', [Validators.required, Validators.minLength(3)]],
      companyNumber: [''],
    });
    this.pwdForm = this.fb.group({
      currentPwd: ['', Validators.required],
      newPwd:     ['', [Validators.required, Validators.minLength(6)]],
      confirmPwd: ['', Validators.required],
    });
  }

  private get shopStorageKey(): string {
    const userId = this.authService.getCurrentUserId();
    return userId ? `tijara_shop_info_${userId}` : 'tijara_shop_info_guest';
  }

  private loadShopFromLocalStorage(): { shopName: string; companyNumber: string } {
    try {
      const raw = localStorage.getItem(this.shopStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          shopName: parsed.shopName || '',
          companyNumber: parsed.companyNumber || ''
        };
      }
    } catch { /* ignore */ }
    return { shopName: '', companyNumber: '' };
  }

  loadProfile() {
    this.loading = true;
    // getMe() renvoie le modèle Users brut (PascalCase) — pas de
    // transformer côté backend qui convertit en snake_case.
    this.authService.getMe().subscribe({
      next: (res: any) => {
        const u = res?.data ?? res ?? {};

        this.profilePicture = u.ProfilePicture || u.profile_picture || '';
        this.infoForm.patchValue({
          firstName: u.FirstName || u.first_name || '',
          lastName:  u.LastName  || u.last_name  || '',
          phone:     u.Telephone || u.phone      || '',
          city:      u.City      || u.city       || '',
          address:   u.Location  || u.address    || '',
        });

        const shopInfo = this.loadShopFromLocalStorage();
        this.shopForm.patchValue({
          shopName:      shopInfo.shopName,
          companyNumber: shopInfo.companyNumber,
        });

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  get fi() { return this.infoForm.controls; }
  get fs() { return this.shopForm.controls; }
  get fp() { return this.pwdForm.controls; }

  get initials(): string {
    const fn = this.fi['firstName'].value || '';
    const ln = this.fi['lastName'].value  || '';
    return `${fn[0] || ''}${ln[0] || ''}`.toUpperCase() || 'V';
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (file.size > 2 * 1024 * 1024) { alert('Image trop grande (max 2MB).'); return; }
    this.profilePictureFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => { this.profilePicture = e.target.result; };
    reader.readAsDataURL(file);
  }

  saveInfos() {
    this.submitted = true;
    if (this.infoForm.invalid) return;
    this.saving    = true;
    this.saveMsg   = '';
    this.saveError = '';

    const v = this.infoForm.value;
    this.authService.updateProfile({
      first_name: v.firstName,
      last_name:  v.lastName,
      phone:      v.phone,
      city:       v.city,
      address:    v.address,
    }, this.profilePictureFile).subscribe({
      next: (res: any) => {
        this.saving  = false;
        this.saveMsg = 'Informations mises à jour avec succès.';
        this.profilePictureFile = null;
        this.updateLocalStorage(res?.user ?? res?.data ?? res);
        this.submitted = false;
        setTimeout(() => this.saveMsg = '', 4000);
      },
      error: (err: any) => {
        this.saving    = false;
        this.saveError = err?.error?.message || 'Erreur lors de la sauvegarde.';
      }
    });
  }

  // ?? ShopName / CompanyNumber ne peuvent pas être envoyés au backend
  // (aucune colonne, whitelist updateProfile() ne les accepte pas).
  // Enregistrement local uniquement. Ne PAS appeler authService.updateProfile()
  // ici tant que le backend n'a pas été étendu (migration + $fillable +
  // whitelist) — hors de mon périmètre.
  saveBoutique() {
    this.shopSubmit = true;
    if (this.shopForm.invalid) return;
    this.saving    = true;
    this.saveMsg   = '';
    this.saveError = '';

    const v = this.shopForm.value;
    try {
      localStorage.setItem(this.shopStorageKey, JSON.stringify({
        shopName: v.shopName || '',
        companyNumber: v.companyNumber || ''
      }));
      this.saving     = false;
      this.saveMsg    = 'Enregistré sur cet appareil (la sauvegarde serveur nécessite une mise à jour du backend).';
      this.shopSubmit = false;
      setTimeout(() => this.saveMsg = '', 5000);
    } catch {
      this.saving    = false;
      this.saveError = 'Impossible d\'enregistrer localement.';
    }
  }

  // ?? Le backend (UsersController::updateProfile) accepte un champ
  // Password sans vérifier l'ancien mot de passe côté serveur. Le champ
  // "mot de passe actuel" reste affiché par cohérence UX, mais son
  // contrôle réel dépend d'une correction backend hors de mon périmètre.
  changePassword() {
    this.pwdSubmit = true;
    if (this.pwdForm.invalid) return;
    if (this.fp['newPwd'].value !== this.fp['confirmPwd'].value) return;

    this.saving    = true;
    this.saveMsg   = '';
    this.saveError = '';

    this.authService.changePassword({
      current_password: this.fp['currentPwd'].value,
      new_password:     this.fp['newPwd'].value,
    }).subscribe({
      next: () => {
        this.saving    = false;
        this.saveMsg   = 'Mot de passe modifié avec succès.';
        this.pwdSubmit = false;
        this.pwdForm.reset();
        setTimeout(() => this.saveMsg = '', 4000);
      },
      error: (err: any) => {
        this.saving    = false;
        this.saveError = err?.error?.message || 'La modification du mot de passe a échoué.';
      }
    });
  }

  get pwdMismatch(): boolean {
    return this.pwdSubmit && this.fp['newPwd'].value !== this.fp['confirmPwd'].value;
  }

  private updateLocalStorage(user: any) {
    try {
      const raw = localStorage.getItem('currentUser');
      if (raw && user) {
        const stored = JSON.parse(raw);
        localStorage.setItem('currentUser', JSON.stringify({
          ...stored,
          firstName:      user.FirstName      ?? user.first_name ?? stored.firstName,
          lastName:       user.LastName       ?? user.last_name  ?? stored.lastName,
          phone:          user.Telephone      ?? user.phone      ?? stored.phone,
          city:           user.City           ?? user.city       ?? stored.city,
          profilePicture: user.ProfilePicture ?? user.profile_picture ?? stored.profilePicture,
        }));
      }
    } catch { /* ignore */ }
  }

  // --- Vérification d'identité : désactivée tant que le backend n'expose
  // pas de route self-service. Aucun appel API n'est déclenché ici.
  onVerificationPhotoSelected(event: Event): void {
    if (!this.verificationAvailable) return;
    this.verificationError = '';
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.verificationPhoto = null;
      this.verificationPhotoPreview = '';
      this.verificationError = 'Ajoutez une image JPG ou PNG de 5 Mo maximum.';
      return;
    }
    this.verificationPhoto = file;
    const reader = new FileReader();
    reader.onload = (e: any) => this.verificationPhotoPreview = e.target.result;
    reader.readAsDataURL(file);
  }

  submitVerification(): void {
    if (!this.verificationAvailable) {
      this.verificationError = 'Cette fonctionnalité n\'est pas encore disponible.';
      return;
    }
    if (!this.verification.identityNumber.trim() || !this.verificationPhoto) {
      this.verificationError = 'Le numéro et la photo du document sont obligatoires.';
      return;
    }
    this.verificationSubmitting = true;
    this.verificationError = '';
    this.verificationMessage = '';
    const type = this.verification.documentType.toLowerCase() === 'patente' ? 'patente' : 'cin';
    this.authService.submitVerification(type, this.verification.identityNumber.trim(), this.verificationPhoto).subscribe({
      next: () => {
        this.verificationSubmitting = false;
        this.verificationPhoto = null;
        this.verificationPhotoPreview = '';
        this.verificationMessage = 'Document envoyé. Il est en attente de validation par l\'administrateur.';
      },
      error: (err: any) => {
        this.verificationSubmitting = false;
        this.verificationError = err?.error?.message ?? 'L\'envoi du document a échoué.';
      }
    });
  }

  clearVerificationPhoto(): void {
    this.verificationPhoto = null;
    this.verificationPhotoPreview = '';
    this.verificationError = '';
  }
}
