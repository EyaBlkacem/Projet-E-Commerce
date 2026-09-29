import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import { OrdersService } from 'src/app/core/services/orders.service';
import { FollowsService } from 'src/app/core/services/follows.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-profile-user',
  templateUrl: './profile-user.component.html',
  standalone: false
})
export class ProfileUserComponent implements OnInit {

  breadcrumbItems = [
    { label: 'Mon Espace' },
    { label: 'Mon Profil', active: true }
  ];

  activeTab:
    'info' |
    'security' |
    'follows' |
    'verification' = 'info';

  infoForm!: FormGroup;
  pwdForm!: FormGroup;

  isVendor = false;

  submitted = false;
  pwdSubmit = false;

  saving = false;

  saveMsg = '';
  saveError = '';

  loading = true;

  showCurPwd = false;
  showNewPwd = false;
  showConPwd = false;

  profilePicture = '';
  profilePictureFile: File | null = null;

  /**
   * URL du backend Laravel
   */
  private readonly API_URL = 'http://localhost:8000';

  /**
   * ============================================================
   * STATISTIQUES COMMANDES
   * ============================================================
   */

  ordersStats = {
    total: 0,
    delivered: 0,
    pending: 0,
    totalSpent: 0
  };

  statsLoading = false;

  /**
   * ============================================================
   * VENDEURS SUIVIS
   * ============================================================
   */

  followedVendors: any[] = [];
  followsLoading = false;

  /**
   * ============================================================
   * VERIFICATION
   * ============================================================
   */

  verificationAvailable = true;

  verification = {
    isVerified: false,
    documentType: 'CIN',
    identityNumber: '',
    verifiedAt: null as string | null
  };

  verificationPhoto: File | null = null;
  verificationPhotoPreview = '';

  verificationSubmitting = false;
  verificationMessage = '';
  verificationError = '';

  /**
   * ============================================================
   * VILAYAS
   * ============================================================
   */

  wilayas = [
    'Tunis',
    'Ariana',
    'Ben Arous',
    'Manouba',
    'Nabeul',
    'Sousse',
    'Sfax',
    'Monastir',
    'Mahdia',
    'Kairouan',
    'Bizerte',
    'B�ja',
    'Jendouba',
    'Gab�s',
    'M�denine',
    'Gafsa',
    'Tozeur',
    'K�bili',
    'Tataouine',
    'Kasserine',
    'Hammamet'
  ];

  constructor(
    private fb: FormBuilder,
    private ordersService: OrdersService,
    private followsService: FollowsService,
    private authService: AuthenticationService
  ) {}

  /**
   * ============================================================
   * INIT
   * ============================================================
   */

  ngOnInit(): void {
    this.buildForms();

    this.loadProfile();

    this.loadStats();

    this.loadFollows();
  }

  /**
   * ============================================================
   * FORMULAIRES
   * ============================================================
   */

  buildForms(): void {

    /**
     * D�terminer si l'utilisateur est vendeur
     */
    try {
      const raw = localStorage.getItem('currentUser');

      if (raw) {
        const u = JSON.parse(raw);

        this.isVendor = u?.role === 'vendor';
      }

    } catch {
      this.isVendor = false;
    }

    /**
     * Formulaire informations
     */
    this.infoForm = this.fb.group({

      firstName: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      lastName: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      shopName: [''],

      /**
       * Accepte :
       *
       * 50421563
       * +21650421563
       */
      phone: [
        '',
        [
          Validators.pattern(
            /^(?:\+216)?[2-9]\d{7}$/
          )
        ]
      ],

      city: [''],

      address: [''],

      birthDate: [''],

      gender: ['']
    });

    /**
     * Formulaire mot de passe
     */
    this.pwdForm = this.fb.group({

      currentPwd: [
        '',
        Validators.required
      ],

      newPwd: [
        '',
        [
          Validators.required,
          Validators.minLength(6)
        ]
      ],

      confirmPwd: [
        '',
        Validators.required
      ]
    });
  }

  /**
   * ============================================================
   * IMAGE PROFIL
   * ============================================================
   */

  private getProfilePictureUrl(
    picture: string
  ): string {

    if (!picture) {
      return '';
    }

    picture = picture.trim();

    /**
     * URL compl�te
     */
    if (
      picture.startsWith('http://') ||
      picture.startsWith('https://') ||
      picture.startsWith('data:image/')
    ) {
      return picture;
    }

    /**
     * Supprimer les / au d�but
     */
    picture = picture.replace(/^\/+/, '');

    /**
     * Exemple backend :
     *
     * assets/users/profiles/photo.jpg
     */
    if (picture.startsWith('assets/')) {

      return `${this.API_URL}/${picture}`;
    }

    /**
     * Sinon uniquement le nom du fichier :
     *
     * photo.jpg
     */
    return `${this.API_URL}/assets/users/profiles/${picture}`;
  }

  /**
   * ============================================================
   * CHARGEMENT PROFIL
   * ============================================================
   */

  loadProfile(): void {

    /**
     * ----------------------------------------------------------
     * 1. Chargement rapide depuis localStorage
     * ----------------------------------------------------------
     */

    try {

      const raw =
        localStorage.getItem('currentUser');

      if (raw) {

        const u = JSON.parse(raw);

        this.isVendor =
          u?.role === 'vendor';

        this.profilePicture =
          this.getProfilePictureUrl(
            u.profilePicture || ''
          );

        this.infoForm.patchValue({

          firstName:
            u.firstName || '',

          lastName:
            u.lastName || '',

          shopName:
            u.shopName || '',

          phone:
            u.phone || '',

          city:
            u.city || '',

          address:
            u.address || '',

          birthDate:
            u.birthDate
              ? String(
                  u.birthDate
                ).substring(0, 10)
              : '',

          gender:
            u.gender || ''
        });

        this.loading = false;
      }

    } catch (error) {

      console.error(
        'Erreur localStorage profil :',
        error
      );
    }

    /**
     * ----------------------------------------------------------
     * 2. Chargement officiel depuis Laravel
     * ----------------------------------------------------------
     */

    this.authService.getMe().subscribe({

      next: (res: any) => {

        const u =
          res?.data ??
          res ??
          {};

        this.isVendor =
          u?.role === 'vendor';

        /**
         * Image
         */
        const picture =
          u.profile_picture ??
          u.ProfilePicture ??
          u.profilePicture ??
          '';

        this.profilePicture =
          this.getProfilePictureUrl(
            picture
          );

        /**
         * Profil
         */
        this.infoForm.patchValue({

          firstName:
            u.first_name ??
            u.FirstName ??
            u.firstName ??
            '',

          lastName:
            u.last_name ??
            u.LastName ??
            u.lastName ??
            '',

          shopName:
            u.shop_name ??
            u.Username ??
            u.shopName ??
            '',

          phone:
            u.phone ??
            u.Telephone ??
            '',

          city:
            u.city ??
            u.City ??
            '',

          address:
            u.address ??
            u.Location ??
            '',

          birthDate:
            (
              u.birth_date ??
              u.BirthDate ??
              u.birthDate ??
              ''
            )
              ? String(
                  u.birth_date ??
                  u.BirthDate ??
                  u.birthDate
                ).substring(0, 10)
              : '',

          gender:
            u.gender ??
            u.Gender ??
            ''
        });

        /**
         * Synchroniser le localStorage
         */
        this.updateLocalStorage(u);

        this.loading = false;
      },

      error: (err) => {

        console.error(
          'Erreur chargement profil :',
          err
        );

        this.loading = false;
      }
    });
  }

  /**
   * ============================================================
   * PHOTO SELECTION
   * ============================================================
   */

  onPhotoSelected(event: Event): void {

    const input =
      event.target as HTMLInputElement;

    if (!input.files?.length) {
      return;
    }

    const file =
      input.files[0];

    /**
     * Maximum 2 Mo
     */
    if (
      file.size >
      2 * 1024 * 1024
    ) {

      alert(
        'Image trop grande (maximum 2 Mo).'
      );

      input.value = '';

      return;
    }

    /**
     * V�rification type
     */
    if (
      !file.type.startsWith('image/')
    ) {

      alert(
        'Veuillez s�lectionner une image.'
      );

      input.value = '';

      return;
    }

    this.profilePictureFile = file;

    /**
     * Aper�u imm�diat
     */
    const reader =
      new FileReader();

    reader.onload = (e: any) => {

      this.profilePicture =
        e.target.result;
    };

    reader.readAsDataURL(file);
  }

  /**
   * ============================================================
   * STATISTIQUES COMMANDES
   * ============================================================
   */

  loadStats(): void {

    this.statsLoading = true;

    /**
     * IMPORTANT :
     *
     * On ne modifie PAS OrdersService.
     *
     * On utilise getAllMyOrders() tel qu'il existe
     * actuellement dans OrdersService.
     */
    this.ordersService
      .getAllMyOrders()
      .subscribe({

        next: (orders: any[]) => {

          const list =
            Array.isArray(orders)
              ? orders
              : [];

          console.log(
            'Commandes utilisateur :',
            list
          );

          /**
           * Nombre total
           */
          this.ordersStats.total =
            list.length;

          /**
           * Commandes livr�es
           */
          this.ordersStats.delivered =
            list.filter(
              order =>
                this.orderStatus(order) ===
                'delivered'
            ).length;

          /**
           * Commandes en attente
           */
          this.ordersStats.pending =
            list.filter(
              order =>
                this.isPendingStatus(
                  this.orderStatus(order)
                )
            ).length;

          /**
           * Total d�pens�
           */
          this.ordersStats.totalSpent =
            list.reduce(
              (
                sum: number,
                order: any
              ) => {

                return (
                  sum +
                  this.orderTotal(order)
                );
              },
              0
            );

          this.statsLoading = false;

          console.log(
            'Statistiques :',
            this.ordersStats
          );
        },

        error: (err) => {

          console.error(
            'Erreur chargement statistiques commandes :',
            err
          );

          this.ordersStats = {
            total: 0,
            delivered: 0,
            pending: 0,
            totalSpent: 0
          };

          this.statsLoading = false;
        }
      });
  }

  /**
   * ============================================================
   * STATUT COMMANDE
   * ============================================================
   */

  private orderStatus(
    order: any
  ): string {

    return (

      order?.status ??

      order?.Status ??

      order?.order_status ??

      order?.OrderStatus ??

      ''
    )
      .toString()
      .trim()
      .toLowerCase();
  }

  /**
   * ============================================================
   * STATUT EN ATTENTE
   * ============================================================
   */

  private isPendingStatus(
    status: string
  ): boolean {

    return [

      'pending',

      'en attente',

      'waiting',

      'pending_payment',

      'accepted'

    ].includes(status);
  }

  /**
   * ============================================================
   * TOTAL COMMANDE
   * ============================================================
   */

  private orderTotal(
    order: any
  ): number {

    const value =

      order?.__total ??

      order?.total_amount ??

      order?.TotalAmount ??

      order?.total ??

      order?.Total ??

      order?.amount ??

      order?.Amount ??

      0;

    const numberValue =
      Number(value);

    return Number.isFinite(
      numberValue
    )
      ? numberValue
      : 0;
  }

  /**
   * ============================================================
   * VENDEURS SUIVIS
   * ============================================================
   */

  loadFollows(): void {

    this.followsLoading = true;

    this.followsService
      .getMyFollows()
      .subscribe({

        next: (res: any) => {

          const list =
            res?.data ??
            res ??
            [];

          this.followedVendors =
            Array.isArray(list)
              ? list
              : [];

          this.followsLoading = false;
        },

        error: (err) => {

          console.error(
            'Erreur chargement vendeurs suivis :',
            err
          );

          this.followedVendors = [];

          this.followsLoading = false;
        }
      });
  }

  /**
   * ============================================================
   * DESABONNEMENT VENDEUR
   * ============================================================
   */

  unfollowVendor(
    vendorId: number
  ): void {

    this.followsService
      .toggleFollow(vendorId)
      .subscribe({

        next: () => {

          this.followedVendors =
            this.followedVendors.filter(
              vendor =>
                vendor.id !== vendorId
            );
        },

        error: (err) => {

          console.error(
            'Erreur d�sabonnement :',
            err
          );
        }
      });
  }

  /**
   * ============================================================
   * VERIFICATION
   * ============================================================
   */

  onVerificationPhotoSelected(
    event: Event
  ): void {

    if (!this.verificationAvailable) {
      return;
    }

    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0] ?? null;

    this.verificationError = '';

    if (!file) {
      return;
    }

    if (

      ![
        'image/jpeg',
        'image/png'
      ].includes(file.type)

      ||

      file.size >
      5 * 1024 * 1024

    ) {

      this.verificationPhoto = null;

      this.verificationPhotoPreview = '';

      this.verificationError =
        'Ajoutez une image JPG ou PNG de 5 Mo maximum.';

      input.value = '';

      return;
    }

    this.verificationPhoto =
      file;

    const reader =
      new FileReader();

    reader.onload = (e: any) => {

      this.verificationPhotoPreview =
        e.target.result;
    };

    reader.readAsDataURL(file);
  }

  /**
   * ============================================================
   * ENVOI VERIFICATION
   * ============================================================
   */

  submitVerification(): void {

    if (!this.verificationAvailable) {

      this.verificationError =
        'Cette fonctionnalit� n\'est pas encore disponible.';

      return;
    }

    if (

      !this.verification.identityNumber.trim()

      ||

      !this.verificationPhoto

    ) {

      this.verificationError =
        'Le num�ro et la photo du document sont obligatoires.';

      return;
    }

    this.verificationSubmitting = true;

    this.verificationError = '';
    this.verificationMessage = '';

    const type =
      this.verification.documentType
        .toLowerCase() === 'patente'
        ? 'patente'
        : 'cin';

    this.authService
      .submitVerification(
        type,
        this.verification.identityNumber.trim(),
        this.verificationPhoto
      )
      .subscribe({

        next: () => {

          this.verificationSubmitting = false;

          this.verificationPhoto = null;

          this.verificationPhotoPreview = '';

          this.verificationMessage =
            'Document envoy�. Il est en attente de validation par l\'administrateur.';
        },

        error: (err: any) => {

          this.verificationSubmitting = false;

          this.verificationError =
            err?.error?.message ??
            'L\'envoi du document a �chou�.';
        }
      });
  }

  /**
   * ============================================================
   * SUPPRIMER PHOTO VERIFICATION
   * ============================================================
   */

  clearVerificationPhoto(): void {

    this.verificationPhoto = null;

    this.verificationPhotoPreview = '';

    this.verificationError = '';
  }

  /**
   * ============================================================
   * GETTERS FORMULAIRES
   * ============================================================
   */

  get fi() {
    return this.infoForm.controls;
  }

  get fp() {
    return this.pwdForm.controls;
  }

  /**
   * ============================================================
   * INITIALES
   * ============================================================
   */

  get initials(): string {

    const fn =
      this.fi['firstName']?.value || '';

    const ln =
      this.fi['lastName']?.value || '';

    return (
      `${fn[0] || ''}${ln[0] || ''}`
    )
      .toUpperCase() || 'U';
  }

  /**
   * ============================================================
   * NOM COMPLET
   * ============================================================
   */

  get fullName(): string {

    return (
      `${this.fi['firstName']?.value || ''} ${
        this.fi['lastName']?.value || ''
      }`
    )
      .trim() || 'Client';
  }

  /**
   * ============================================================
   * SAUVEGARDE PROFIL
   * ============================================================
   */

  saveProfile(): void {

    this.submitted = true;

    /**
     * V�rifier le formulaire
     */
    if (this.infoForm.invalid) {

      console.log(
        'Formulaire invalide',
        this.infoForm.errors
      );

      console.log(
        this.infoForm.value
      );

      /**
       * Afficher les erreurs de chaque champ
       */
      Object.keys(
        this.infoForm.controls
      ).forEach(key => {

        const control =
          this.infoForm.get(key);

        if (control?.invalid) {

          console.log(
            `Champ invalide : ${key}`,
            control.errors
          );
        }
      });

      return;
    }

    this.saving = true;

    this.saveMsg = '';
    this.saveError = '';

    const v =
      this.infoForm.value;

    /**
     * ----------------------------------------------------------
     * Nettoyage t�l�phone
     * ----------------------------------------------------------
     *
     * +21650421563
     * devient :
     *
     * 50421563
     */
    const phone =
      (v.phone || '')
        .toString()
        .replace(/\s/g, '')
        .replace(/^\+216/, '');

    /**
     * ----------------------------------------------------------
     * Envoi backend
     * ----------------------------------------------------------
     */

    this.authService
      .updateProfile(

        {
          first_name:
            v.firstName,

          last_name:
            v.lastName,

          username:
            v.shopName || null,

          phone:
            phone,

          city:
            v.city,

          address:
            v.address,

          birth_date:
            v.birthDate || null,

          gender:
            v.gender || null
        },

        this.profilePictureFile
      )

      .subscribe({

        next: (res: any) => {

          this.saving = false;

          this.saveMsg =
            'Profil mis � jour avec succ�s.';

          this.submitted = false;

          this.profilePictureFile = null;

          /**
           * ----------------------------------------------------
           * Mise � jour localStorage
           * ----------------------------------------------------
           */

          const user =
            res?.user ??
            res?.data ??
            res ??
            {};

          this.updateLocalStorage(
            user
          );

          /**
           * ----------------------------------------------------
           * Image retourn�e par Laravel
           * ----------------------------------------------------
           */

          const picture =
            user.profile_picture ??
            user.ProfilePicture ??
            user.profilePicture ??
            '';

          if (picture) {

            this.profilePicture =
              this.getProfilePictureUrl(
                picture
              );
          }

          /**
           * ----------------------------------------------------
           * Recharger statistiques
           * ----------------------------------------------------
           */

          this.loadStats();

          setTimeout(() => {

            this.saveMsg = '';

          }, 4000);
        },

        error: (err: any) => {

          this.saving = false;

          console.error(
            'Erreur sauvegarde profil :',
            err
          );

          this.saveError =
            err?.error?.message ??
            'Erreur lors de la sauvegarde.';
        }
      });
  }

  /**
   * ============================================================
   * MOT DE PASSE
   * ============================================================
   */

  changePassword(): void {

    this.pwdSubmit = true;

    if (this.pwdForm.invalid) {
      return;
    }

    if (
      this.fp['newPwd'].value !==
      this.fp['confirmPwd'].value
    ) {
      return;
    }

    this.saving = true;

    this.saveMsg = '';
    this.saveError = '';

    this.authService
      .changePassword({

        current_password:
          this.fp['currentPwd'].value,

        new_password:
          this.fp['newPwd'].value

      })

      .subscribe({

        next: () => {

          this.saving = false;

          this.saveMsg =
            'Mot de passe modifi� avec succ�s.';

          this.pwdSubmit = false;

          this.pwdForm.reset();

          setTimeout(() => {

            this.saveMsg = '';

          }, 4000);
        },

        error: (err: any) => {

          this.saving = false;

          console.error(
            'Erreur modification mot de passe :',
            err
          );

          this.saveError =
            err?.error?.message ??
            'La modification du mot de passe a �chou�.';
        }
      });
  }

  /**
   * ============================================================
   * MOTS DE PASSE DIFFERENTS
   * ============================================================
   */

  get pwdMismatch(): boolean {

    return (

      this.pwdSubmit

      &&

      this.fp['newPwd'].value !==
      this.fp['confirmPwd'].value

    );
  }

  /**
   * ============================================================
   * LOCAL STORAGE
   * ============================================================
   */

  private updateLocalStorage(
    user: any
  ): void {

    try {

      const raw =
        localStorage.getItem(
          'currentUser'
        );

      if (!raw || !user) {
        return;
      }

      const stored =
        JSON.parse(raw);

      /**
       * Image
       */
      const picture =
        user.profile_picture ??
        user.ProfilePicture ??
        user.profilePicture ??
        stored.profilePicture ??
        '';

      const updatedUser = {

        ...stored,

        firstName:
          user.first_name ??
          user.FirstName ??
          user.firstName ??
          stored.firstName,

        lastName:
          user.last_name ??
          user.LastName ??
          user.lastName ??
          stored.lastName,

        shopName:
          user.shop_name ??
          user.Username ??
          user.shopName ??
          stored.shopName,

        phone:
          user.phone ??
          user.Telephone ??
          stored.phone,

        city:
          user.city ??
          user.City ??
          stored.city,

        address:
          user.address ??
          user.Location ??
          stored.address,

        birthDate:
          user.birth_date ??
          user.BirthDate ??
          user.birthDate ??
          stored.birthDate,

        gender:
          user.gender ??
          user.Gender ??
          user.gender ??
          stored.gender,

        profilePicture:
          picture
      };

      localStorage.setItem(
        'currentUser',
        JSON.stringify(
          updatedUser
        )
      );

    } catch (error) {

      console.error(
        'Erreur mise jour localStorage :',
        error
      );
    }
  }
}
