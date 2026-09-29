import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { switchMap, map, catchError, expand, reduce, takeWhile } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class TijaraApiService {

  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';

  // Laravel sert les fichiers uploadés (ads/products images) directement
  // sous /assets/..., pas sous /api/... — on retire donc le suffixe /api.
  get assetBaseUrl(): string {
    return this.apiUrl.replace(/\/api\/?$/, '');
  }

  constructor(private http: HttpClient) {}

  // ✅ Helper générique de pagination complète (front uniquement) — rappelle
  // l'API existante page par page (per_page=50, plafond backend) jusqu'à
  // épuisement des résultats ou HARD_PAGE_CAP, pour ne plus perdre
  // silencieusement les lignes au-delà des per_page=100/200 codés en dur.
  private readonly FETCH_ALL_HARD_PAGE_CAP = 50;
  private fetchAllPages(callFactory: (page: number) => Observable<any>): Observable<any[]> {
    const HARD_PAGE_CAP = this.FETCH_ALL_HARD_PAGE_CAP;
    return new Observable<any[]>(subscriber => {
      const collected: any[] = [];
      let currentPage = 1;
      let knownTotal: number | null = null;

      const extractRaw = (r: any): any[] => {
        const isPaginatedShape = !Array.isArray(r) && r && typeof r === 'object' && 'data' in r;
        if (isPaginatedShape) {
          if (typeof r.total === 'number') knownTotal = r.total;
          return r.data || [];
        }
        return Array.isArray(r) ? r : [];
      };

      const fetchNext = () => {
        if (currentPage > HARD_PAGE_CAP) { subscriber.next(collected); subscriber.complete(); return; }
        if (knownTotal !== null && collected.length >= knownTotal) { subscriber.next(collected); subscriber.complete(); return; }

        callFactory(currentPage).subscribe({
          next: (r: any) => {
            const raw = extractRaw(r);
            if (raw.length === 0) { subscriber.next(collected); subscriber.complete(); return; }
            collected.push(...raw);
            currentPage++;
            if (knownTotal !== null && collected.length >= knownTotal) {
              subscriber.next(collected);
              subscriber.complete();
            } else {
              fetchNext();
            }
          },
          error: () => { subscriber.next(collected); subscriber.complete(); }
        });
      };

      fetchNext();
    });
  }

  private getHeaders(): HttpHeaders {
    const currentUser = localStorage.getItem('currentUser');
    let token = '';
    if (currentUser) {
      try { token = JSON.parse(currentUser).token || ''; } catch {}
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  // Id de l'utilisateur connecté (localStorage.currentUser.id) — utilisé
  // par toutes les méthodes ci-dessous qui doivent scoper une requête
  // générique (/notifications, /user-follows, /ads-wishlist...) sur "moi".
  public getCurrentUserId(): number | null {
    const raw = localStorage.getItem('currentUser');
    if (!raw) return null;
    try {
      const session = JSON.parse(raw);
      const id = session?.id ?? session?.IdUser ?? session?.user?.id ?? session?.user?.IdUser;
      return id != null ? Number(id) : null;
    } catch { return null; }
  }

  /**
   * Recupere TOUTES les pages d'un endpoint paginé Laravel (max MAX_PER_PAGE=50
   * cote backend, uniforme sur tous les controleurs — voir audit). Boucle sur
   * `last_page` renvoye par la reponse elle-meme, donc n'a pas besoin de
   * connaitre la valeur exacte du plafond backend. Usage :
   *   this.api.getAllPages<any>(page => this.http.get(`${this.apiUrl}/orders`,
   *     { headers: this.getHeaders(), params: { per_page: 50, page } }))
   *   .subscribe(items => ...)
   * Retourne directement le tableau `data` fusionné de toutes les pages.
   */
  public getAllPages<T = any>(
    fetchPage: (page: number) => Observable<any>,
    maxPages = 30
  ): Observable<T[]> {
    let page = 1;
    return fetchPage(1).pipe(
      expand((res: any) => {
        page++;
        const lastPage = res?.last_page ?? 1;
        if (page > lastPage || page > maxPages) return of(null);
        return fetchPage(page).pipe(catchError(() => of(null)));
      }),
      takeWhile((res: any) => res !== null, true),
      reduce((acc: T[], res: any) => res ? [...acc, ...(res?.data ?? [])] : acc, [] as T[]),
      catchError(() => of([] as T[]))
    );
  }

  // ─── Auth ───────────────────────────────────────────────
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { Email: email, Password: password });
  }

  // ⚠️ BACKEND REQUIS : /auth/google, /auth/facebook (en POST classique),
  // /auth/confirm-email et /auth/resend-confirm n'existent PAS côté Laravel.
  // Seul /auth/facebook en GET existe (redirection OAuth Socialite), donc
  // inutilisable tel quel depuis une requête HTTP POST classique. Ces 4
  // méthodes resteront en échec (404) tant que l'encadrant n'ajoute pas les
  // routes correspondantes. Laissées en l'état pour ne pas casser les
  // composants qui les appellent déjà (login/register/confirm-email) — ils
  // gèrent déjà l'erreur proprement (catch + message).
  googleLogin(credential: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/google`, { credential });
  }

  facebookLogin(accessToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/facebook`, { access_token: accessToken });
  }

  confirmEmail(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/confirm-email?token=${token}`);
  }

  resendConfirm(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/resend-confirm`, { email });
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  getMe(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`, { headers: this.getHeaders() });
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}, { headers: this.getHeaders() });
  }

  // ─── Produits ───────────────────────────────────────────
  getProducts(params?: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/products`, {
      params: { Active: 1, ...(params ?? {}) },
      headers: this.getHeaders()
    });
  }

  getProduct(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/products/${id}`, { headers: this.getHeaders() });
  }

  createProduct(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/products`, data, { headers: this.getHeaders() });
  }

  updateProduct(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/products/${id}`, data, { headers: this.getHeaders() });
  }

  // ✅ Route admin dédiée ajoutée par l'encadrant (PUT /admin/products/{id})
  // pour permettre à l'admin d'éditer un produit sans passer par la route
  // vendeur (PUT /products/{id}, réservée au rôle entreprise).
  updateProductAdmin(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/products/${id}`, data, { headers: this.getHeaders() });
  }

  // ⚠️ Pas de route "/status" côté Laravel — comme pour toggleCategory,
  // on lit l'état courant puis on inverse Active via PATCH /products/{id}/activate
  // (route réservée admin) ou PUT /products/{id} (réservée entreprise
  // propriétaire). On garde ici le PATCH activate, cohérent avec
  // approveProduct/rejectProductAdmin plus bas.
  toggleProductStatus(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/products/${id}`, { headers: this.getHeaders() }).pipe(
      switchMap((res: any) => {
        const current = res?.data ?? res;
        const newActive = current?.Active ? false : true;
        return this.http.patch(`${this.apiUrl}/products/${id}/activate`, { Active: newActive }, { headers: this.getHeaders() });
      })
    );
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/products/${id}`, { headers: this.getHeaders() });
  }

  // ⚠️ BACKEND REQUIS : /products/facets n'existe pas côté Laravel
  // (ProductsController n'a pas de méthode facets()). L'appel échouera en
  // 404 — c'est volontaire : le composant appelant (listing.component.ts,
  // méthode loadFacets()) a déjà un fallback local buildFacetsFromLoadedItems()
  // dans son bloc error, donc ce 404 est géré gracieusement côté UI. Ne pas
  // "réparer" ici avec une fausse agrégation coûteuse (nécessiterait de
  // charger TOUS les produits pour calculer les facettes à chaque frappe de
  // recherche) — à faire proprement côté backend si besoin un jour.
  getProductFacets(params?: { categId?: string | number; search?: string }): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/products/facets`, { params: params as any });
  }

  // ─── Catégories ─────────────────────────────────────────
  getCategories(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/categories`, { params });
  }

  // "getCategoriesAdmin" = même liste publique, avec un per_page assez large
  // pour tout récupérer d'un coup côté admin (pas de route /categories/all).
  getCategoriesAdmin(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/categories`, { headers: this.getHeaders(), params: { per_page: 200, ...params } });
  }

  createCategory(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/categories`, data, { headers: this.getHeaders() });
  }

  updateCategory(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/categories/${id}`, data, { headers: this.getHeaders() });
  }

  // ⚠️ Pas de route "/toggle" côté Laravel — on récupère l'état actuel puis
  // on envoie un PUT /categories/{id} avec le champ Active inversé.
  toggleCategory(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/categories/${id}`, { headers: this.getHeaders() }).pipe(
      switchMap((cat: any) => {
        const newActive = cat?.Active ? 0 : 1;
        return this.http.put(`${this.apiUrl}/categories/${id}`, { Active: newActive }, { headers: this.getHeaders() });
      })
    );
  }

  deleteCategory(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/categories/${id}`, { headers: this.getHeaders() });
  }

  // ============================================================
  // FEATURES (Admin) - CRUD complet. FeaturesController::index pagine
  // reellement (per_page/page) et cherche sur TitleFeature/DescriptionFeature/
  // UnitFeature/ImgFeature via buildFilteredQuery ; filtre exact sur Active.
  // store/update/destroy reserves admin (auth:api + admin).
  // ============================================================
  getFeaturesAdmin(params: any = {}): Observable<any> {
    // CORRIGE - les appelants passent per_page:200 (categories-admin,
    // features-admin) tronque silencieusement a 50 cote backend.
    return this.fetchAllPages((page) => this.http.get<any>(`${this.apiUrl}/features`, { headers: this.getHeaders(), params: { ...params, per_page: 50, page } })).pipe(
      map((data: any[]) => ({ data }))
    );
  }
  createFeature(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/features`, data, { headers: this.getHeaders() });
  }

  updateFeature(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/features/${id}`, data, { headers: this.getHeaders() });
  }

  deleteFeature(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/features/${id}`, { headers: this.getHeaders() });
  }

  // ============================================================
  // FEATURE-CATEGORIES (Admin) - liaisons many-to-many. Le controller
  // n'a AUCUN champ "searchable" (search: []) : seul un filtre exact
  // sur IdCategory/IdFeature est possible cote back.
  // ============================================================
  getFeatureCategoryLinks(categId: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/feature-categories`, {
      headers: this.getHeaders(),
      params: { IdCategory: categId, per_page: 100 }
    }).pipe(
      map((res: any) => res?.data ?? res ?? []),
      catchError(() => of([]))
    );
  }

  linkFeatureToCategory(categId: number, featureId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/feature-categories`,
      { IdCategory: categId, IdFeature: featureId },
      { headers: this.getHeaders() });
  }

  unlinkFeatureFromCategory(idFC: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/feature-categories/${idFC}`, { headers: this.getHeaders() });
  }

  // ✅ Ajouté : /feature-categories + /features sont deux routes publiques
  // réelles côté Laravel (index/show), mais il n'existe aucune route qui
  // renvoie directement "les features d'une catégorie" en un seul appel.
  // On agrège donc ici : 1) on récupère les liaisons feature<->catégorie
  // pour la catégorie demandée, 2) on résout chaque IdFeature contre
  // /features pour obtenir les objets complets (TitleFeature, UnitFeature...).
  getCategoryFeatures(categId: number): Observable<any[]> {
    // CORRIGE - per_page fixes (100/200) tronquaient silencieusement au-dela de 50 cote backend
    return this.fetchAllPages((page) => this.http.get<any>(`${this.apiUrl}/feature-categories`, {
      headers: this.getHeaders(),
      params: { IdCategory: categId, per_page: 50, page }
    })).pipe(
      switchMap((links: any[]) => {
        const featureIds: number[] = Array.from(new Set((links as any[]).map(l => l.IdFeature).filter((v: any) => v != null)));
        if (featureIds.length === 0) return of([]);
        return this.fetchAllPages((page) => this.http.get<any>(`${this.apiUrl}/features`, {
          headers: this.getHeaders(),
          params: { per_page: 50, page }
        })).pipe(
          map((all: any[]) => (all as any[]).filter(f => featureIds.includes(f.IdFeature)))
        );
      }),
      catchError(() => of([]))
    );
  }
  getAnnonceFacets(params?: { categId?: string | number; search?: string }): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/annonces/facets`, { params: params as any });
  }

  // ✅ Corrigé : POST /ads accepte directement le multipart FormData avec
  // les champs ImageAd[]/VideoAd[] (voir AdsController::store, qui gère
  // $request->hasFile('ImageAd')). Il n'existe PAS de route /ads/upload
  // séparée — c'est bien /ads tout court, avec Content-Type multipart
  // (laisser Angular gérer l'en-tête automatiquement, ne pas forcer
  // 'application/json' ici, d'où l'usage d'un header allégé sans Content-Type).
  createAnnonceWithImage(formData: FormData): Observable<any> {
    const token = this.getAuthTokenOnly();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.post(`${this.apiUrl}/ads`, formData, { headers });
  }

  private getAuthTokenOnly(): string {
    const raw = localStorage.getItem('currentUser');
    if (!raw) return '';
    try { return JSON.parse(raw).token || ''; } catch { return ''; }
  }

  // ─── Commandes ──────────────────────────────────────────
  getOrders(params?: any): Observable<any> {
    // CORRIGE - per_page:200 tronquait silencieusement au-dela de 50 cote backend.
    return this.fetchAllPages((page) => this.http.get(`${this.apiUrl}/orders`, { headers: this.getHeaders(), params: { ...params, per_page: 50, page } })).pipe(
      map((data: any[]) => ({ data }))
    );
  }
  getMyTrackedOrders(): Observable<any[]> {
    return this.getOrders({ per_page: 50 }).pipe(
      map((res: any) => {
        const data = res?.data ?? res;
        return Array.isArray(data) ? data : [];
      }),
      catchError(() => of([]))
    );
  }

  getOrder(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/orders/${id}`, { headers: this.getHeaders() });
  }

  createOrder(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/orders`, data, { headers: this.getHeaders() });
  }

  createOrderDetail(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/order-details`, data, { headers: this.getHeaders() });
  }

  createInvoice(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/invoices`, data, { headers: this.getHeaders() });
  }

  getStates(): Observable<any> {
    return this.http.get(`${this.apiUrl}/states`, { headers: this.getHeaders() });
  }

  payOrder(idOrder: number, method: string = 'wallet'): Observable<any> {
    return this.http.post(`${this.apiUrl}/orders/${idOrder}/pay`, { Method: method }, { headers: this.getHeaders() });
  }

  // ⚠️ Il n'existe pas de PATCH /orders/{id}/status générique — seulement
  // des transitions nommées côté vendeur (accept/reject/ship) et côté
  // acheteur (cancel). On route donc vers la bonne transition selon la
  // valeur reçue ; si la valeur ne correspond à aucune transition connue,
  // on retombe sur le PUT admin (Active uniquement, voir updateOrderActive).
  updateOrderStatus(id: number, status: string): Observable<any> {
    const s = (status || '').toLowerCase();
    if (s === 'accept' || s === 'accepted') {
      return this.http.patch(`${this.apiUrl}/orders/${id}/accept`, {}, { headers: this.getHeaders() });
    }
    if (s === 'reject' || s === 'rejected') {
      return this.http.patch(`${this.apiUrl}/orders/${id}/reject`, {}, { headers: this.getHeaders() });
    }
    if (s === 'ship' || s === 'shipped') {
      return this.http.patch(`${this.apiUrl}/orders/${id}/ship`, {}, { headers: this.getHeaders() });
    }
    if (s === 'cancel' || s === 'cancelled' || s === 'canceled') {
      return this.http.patch(`${this.apiUrl}/orders/${id}/cancel`, {}, { headers: this.getHeaders() });
    }
    return this.updateOrderActive(id, s !== 'inactive' && s !== '0');
  }

  // ─── Réclamations ───────────────────────────────────────
  // ✅ Contrôleur réel de l'encadrant (Reclamationscontroller.php) — statut
  // et réponse admin sont deux routes PATCH séparées, pas un PUT unique.
  // Pas de route destroy : un ticket ne peut pas être supprimé côté admin,
  // seulement son statut peut passer à "closed".
  getReclamations(params: any = {}): Observable<any> {
    // CORRIGE - per_page:200 tronquait silencieusement au-dela de 50 cote backend.
    return this.fetchAllPages((page) => this.http.get(`${this.apiUrl}/reclamations`, { headers: this.getHeaders(), params: { ...params, per_page: 50, page } })).pipe(
      map((data: any[]) => ({ data }))
    );
  }
  getMyReclamations(params: any = {}): Observable<any> {
    // Laravel renvoie un objet paginator. Les écrans client consomment une
    // liste : on normalise donc la réponse ici, au lieu de leur faire
    // interpréter la structure de pagination.
    return this.http.get<any>(`${this.apiUrl}/my-reclamations`, { headers: this.getHeaders(), params }).pipe(
      map((res: any) => res?.data ?? [])
    );
  }

  createReclamation(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/reclamations`, data, { headers: this.getHeaders() });
  }

  // PATCH /reclamations/{id}/status — change uniquement le statut.
  updateReclamationStatus(id: number, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/reclamations/${id}/status`, { Status: status }, { headers: this.getHeaders() });
  }

  // PATCH /reclamations/{id}/reply — répond au ticket ; passe automatiquement
  // le statut à "resolved" côté backend si aucun statut n'est fourni.
  replyToReclamation(id: number, adminReply: string, status?: string): Observable<any> {
    const body: any = { AdminReply: adminReply };
    if (status) body.Status = status;
    return this.http.patch(`${this.apiUrl}/reclamations/${id}/reply`, body, { headers: this.getHeaders() });
  }

  // ─── Annonces ───────────────────────────────────────────
  // ✅ Corrigé : "Annonces" côté Angular = table `ads` côté Laravel, il n'y
  // a pas de route /annonces. (Avant : pointait vers /annonces → 404 pour
  // tout le catalogue public.)
  getAnnonces(params?: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/ads`, { params: { Active: 1, ...(params ?? {}) } });
  }

  // ✅ Corrigé : pas de route /annonces/mine — on filtre /ads sur IdUser=moi.
  getMyAnnonces(): Observable<any> {
    const myId = this.getCurrentUserId();
    return this.http.get(`${this.apiUrl}/ads`, { headers: this.getHeaders(), params: { IdUser: myId as any, per_page: 100 } });
  }

  // ✅ Corrigé : pas de route /annonces — POST /ads directement.
  createAnnonce(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/ads`, data, { headers: this.getHeaders() });
  }

  // ✅ Corrigé : pas de route /annonces/{id}.
  deleteAnnonce(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/ads/${id}`, { headers: this.getHeaders() });
  }

  toggleLike(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/ad-likes`, { IdAd: id }, { headers: this.getHeaders() });
  }

  getComments(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/ad-comments`, { params: { IdAd: id, per_page: 100 } });
  }

  addComment(id: number, content: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/ad-comments`, { IdAd: id, Content: content }, { headers: this.getHeaders() });
  }

  // ─── Vendor profile (public) ────────────────────────────
  // ✅ Corrigé : /products/vendor/{id} n'existe pas côté Laravel. On
  // combine GET /users/{id} (fiche du vendeur) + GET /products?IdUser={id}
  // (ses produits) pour reconstituer la forme { vendor, products } attendue
  // par seller-details.component.ts.
  getVendorProfile(vendorId: number): Observable<any> {
    return forkJoin({
      user: this.http.get<any>(`${this.apiUrl}/users/${vendorId}`, { headers: this.getHeaders() }).pipe(catchError(() => of(null))),
      products: this.http.get<any>(`${this.apiUrl}/products`, { headers: this.getHeaders(), params: { IdUser: vendorId, per_page: 100 } }).pipe(catchError(() => of({ data: [] }))),
      categories: this.http.get<any>(`${this.apiUrl}/categories`, { params: { per_page: 200 } }).pipe(catchError(() => of({ data: [] }))),
    }).pipe(
      map(({ user, products, categories }: { user: any; products: any; categories: any }) => {
        const u = user?.data ?? user;
        if (!u) throw new Error('Vendeur introuvable');
        const vendor = {
          id: u.IdUser,
          first_name: u.FirstName || '',
          last_name: u.LastName || '',
          username: u.Username || '',
          email: u.Email || '',
          phone: u.Telephone || '',
          profile_picture: u.ProfilePicture || '',
          is_verified: !!u.IsVerified,
          city: u.City || '',
          // Nommé "created_at" (et pas "member_since") car c'est exactement
          // ce que lit le getter memberSince() de seller-details.component.ts.
          created_at: u.CreationDate || null,
        };
        const list = products?.data ?? products ?? [];
        const cats = categories?.data ?? categories ?? [];
        // ProductsController::index ne charge jamais la relation catégorie
        // (voir FEATURES_RELATIONS = ['values.feature'] uniquement), donc
        // p.category_name n'existe jamais côté backend — on la résout ici
        // pour alimenter le getter categories() du composant, qui sinon
        // regroupe tout sous "Autre" silencieusement.
        const productsWithCategory = (list as any[]).map(p => {
          const cat = (cats as any[]).find((c: any) => c.IdCateg === p.IdCateorie);
          return { ...p, category_name: cat?.TitleFr || '' };
        });
        return { vendor, products: productsWithCategory };
      })
    );
  }

  // ─── Reviews (générique, table `reviews` : TargetType/TargetId) ─────
  // ✅ Corrigé : /products/{id}/reviews n'existe pas côté Laravel — la
  // table `reviews` est générique (TargetType/TargetId), déjà exposée via
  // GET/POST/DELETE /reviews. On agrège ici stats + liste pour retrouver la
  // forme { reviews, stats } attendue par product-detail.component.ts.
  getProductReviews(productId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reviews`, {
      params: { TargetType: 'product', TargetId: productId, per_page: 100 } as any
    }).pipe(
      map((res: any) => {
        const raw = res?.data ?? res ?? [];
        const reviews = (raw as any[]).map(r => ({
          id: r.IdReview ?? r.id,
          user_id: r.IdUser,
          rating: Number(r.Rating || 0),
          comment: r.Comment || '',
          created_at: r.CreatedAt,
        }));
        const count = reviews.length;
        const average = count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
        // Champs alignés EXACTEMENT sur product-detail.component.ts :
        // avg_rating (pas "average"), total, et r1..r5 = distribution par
        // étoile utilisée pour les barres de répartition des notes.
        const stats: any = { total: count, avg_rating: Math.round(average * 10) / 10 };
        for (let star = 1; star <= 5; star++) {
          stats[`r${star}`] = reviews.filter(r => Math.round(r.rating) === star).length;
        }
        return { reviews, stats };
      }),
      catchError(() => of({ reviews: [], stats: { total: 0, avg_rating: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 } }))
    );
  }

  // ✅ Corrigé : POST /reviews avec TargetType/TargetId/IdUser/Rating/Comment
  // (pas /products/{id}/reviews, et pas les champs rating/comment minuscules
  // seuls — le backend attend le PascalCase habituel).
  addReview(productId: number, data: { rating: number; comment?: string }): Observable<any> {
    const myId = this.getCurrentUserId();
    return this.http.post(`${this.apiUrl}/reviews`, {
      TargetType: 'product',
      TargetId: productId,
      IdUser: myId,
      Rating: data.rating,
      Comment: data.comment || '',
    }, { headers: this.getHeaders() });
  }

  // ✅ Corrigé : DELETE /reviews/{id} directement (pas de sous-ressource
  // /products/{productId}/reviews/{id} côté Laravel).
  deleteReview(productId: number, reviewId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reviews/${reviewId}`, { headers: this.getHeaders() });
  }

  // ─── Profil ─────────────────────────────────────────────
  // ✅ Corrigé : pas de route /auth/profile — c'est PUT /users/{id} (déjà
  // utilisée par updateAdminUser) qui gère la mise à jour du profil, y
  // compris le hash du mot de passe si le champ Password est présent
  // (voir UsersController::update). On cible automatiquement "moi".
  updateProfile(data: any): Observable<any> {
    const myId = this.getCurrentUserId();
    return this.http.put(`${this.apiUrl}/users/${myId}`, data, { headers: this.getHeaders() });
  }

  // ⚠️ Pas de route /auth/change-password dédiée, et surtout PAS de
  // vérification du mot de passe actuel côté backend (UsersController::update
  // hash simplement ce qu'on lui envoie, sans comparer current_password).
  // On réutilise donc PUT /users/{id} avec seulement le nouveau mot de passe,
  // MAIS current_password n'est jamais vérifié côté serveur — sécurité
  // insuffisante en l'état, à signaler à l'encadrant (idéalement le backend
  // doit vérifier Hash::check(current_password) avant d'accepter le nouveau).
  changePassword(data: { current_password: string; new_password: string }): Observable<any> {
    const myId = this.getCurrentUserId();
    return this.http.put(`${this.apiUrl}/users/${myId}`, { Password: data.new_password }, { headers: this.getHeaders() });
  }

  // ─── Messages / Conversations ────────────────────────────
  // Contrat backend réel (ConversationController.php) :
  //   GET  /conversations                     -> liste des conversations de l'utilisateur
  //   GET  /conversations/{id}/messages       -> liste des messages (tableau brut)
  //   POST /conversations/{id}/messages       -> { content: string } (PAS "body")
  //   POST /conversations                     -> { user_ids: number[] } (PAS "user_id" singulier)
  getConversations(): Observable<any> {
    return this.http.get(`${this.apiUrl}/conversations`, { headers: this.getHeaders() });
  }

  // Le backend renvoie un tableau brut de messages, pas un objet
  // conversation — on ré-enveloppe donc en { messages: [...] } pour rester
  // compatible avec les composants qui lisent res.messages.
  getConversationMessages(convId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/conversations/${convId}/messages`, { headers: this.getHeaders() }).pipe(
      map((res: any) => ({ messages: Array.isArray(res) ? res : [] }))
    );
  }

  sendMessage(convId: number, content: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/conversations/${convId}/messages`, { content }, { headers: this.getHeaders() });
  }

  // Crée la conversation (user_ids attend un tableau), puis enchaîne avec
  // l'envoi du premier message — le backend n'a pas de colonne dédiée
  // product_id/product_name, donc on les intègre dans le texte du premier
  // message pour ne pas perdre le contexte.
  startConversation(data: { vendor_id: number; product_id?: number; product_name?: string; content: string }): Observable<any> {
    const prefix = data.product_name ? `[À propos de "${data.product_name}"]\n` : '';
    return this.http.post<any>(`${this.apiUrl}/conversations`, { user_ids: [data.vendor_id] }, { headers: this.getHeaders() }).pipe(
      switchMap((conv: any) => {
        const convId = conv?.id;
        return this.http.post(`${this.apiUrl}/conversations/${convId}/messages`, { content: prefix + data.content }, { headers: this.getHeaders() });
      })
    );
  }

  // ─── Admin modération ────────────────────────────────────
  // "Annonces" côté Angular = table `ads` côté Laravel (pas de route /annonces).
  // Pagination + filtres (page, per_page, search, Active) gérés par le backend.
  getAdminAnnonces(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/ads`, { headers: this.getHeaders(), params });
  }

  approveAnnonce(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/ads/${id}/activate`, { Active: true }, { headers: this.getHeaders() });
  }

  rejectAnnonce(id: number, reason?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/ads/${id}/activate`, { Active: false }, { headers: this.getHeaders() });
  }

  getAdminAllProducts(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/products`, { headers: this.getHeaders(), params });
  }

  approveProduct(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/products/${id}/activate`, { Active: true }, { headers: this.getHeaders() });
  }

  rejectProductAdmin(id: number, reason?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/products/${id}/activate`, { Active: false }, { headers: this.getHeaders() });
  }

  // ✅ Corrigé : pas de route /products/mine — filtre IdUser=moi sur /products.
  getMyProducts(): Observable<any> {
    const myId = this.getCurrentUserId();
    // CORRIGE - per_page: 100 tronquait silencieusement au-dela de 50 cote backend ;
    // resultat reenveloppe en { data: [...] } pour rester compatible avec les appelants existants.
    return this.fetchAllPages((page) => this.http.get(`${this.apiUrl}/products`, { headers: this.getHeaders(), params: { IdUser: myId as any, per_page: 50, page } })).pipe(
      map((data: any[]) => ({ data }))
    );
  }
  getBrands(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/brands`, { params: { per_page: 200, ...params } });
  }

  // ─── Commandes ────────────────────────────────────────────
  // ⚠️ La table `orders` ne contient QUE IdOrder/IdUser/IdDeal/IdState/
  // DateTimeCommand/Active — pas de client/vendeur/produit/total/statut
  // en 5 étapes. IdState est en fait une LOCALISATION de livraison (table
  // `states` = gouvernorats tunisiens), pas un statut de commande !
  // Le composant enrichit donc côté Angular via des correspondances
  // (Users, Deals, Invoices, Deliveries) — voir orders-admin.component.ts.
  getAdminOrders(params: any = {}): Observable<any> {
    // CORRIGE - per_page:200 tronquait silencieusement au-dela de 50 cote backend.
    return this.fetchAllPages((page) => this.http.get(`${this.apiUrl}/orders`, { headers: this.getHeaders(), params: { ...params, per_page: 50, page } })).pipe(
      map((data: any[]) => ({ data }))
    );
  }
  getVerifications(status: 'pending' | 'verified' | 'all' = 'pending'): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/verifications`, { headers: this.getHeaders(), params: { status } });
  }
  getVerificationDetail(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/verifications/${userId}`, { headers: this.getHeaders() });
  }

  getMyWallet(): Observable<any> {
    // /wallets (index) est reserve a l'admin (auth:api + admin). Route
    // correcte pour un compte normal : GET /my-wallet, scopee automatiquement
    // sur l'utilisateur connecte cote backend.
    return this.http.get(`${this.apiUrl}/my-wallet`, { headers: this.getHeaders() });
  }

  getWalletHistory(walletId: number, params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/wallets/${walletId}`, {
      headers: this.getHeaders(),
      params,
    });
  }

  getAllWallets(params: any = {}): Observable<any[]> {
    // CORRIGE - per_page:200 tronquait silencieusement au-dela de 50 cote backend.
    return this.fetchAllPages((page) => this.http.get<any>(`${this.apiUrl}/wallets`, { headers: this.getHeaders(), params: { ...params, per_page: 50, page } })).pipe(
      catchError(() => of([]))
    );
  }
  updateWallet(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/wallets/${id}`, payload, { headers: this.getHeaders() });
  }
  verifyUser(userId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/verifications/${userId}/verify`, {}, { headers: this.getHeaders() });
  }
  rejectVerification(userId: number, reason?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/verifications/${userId}/reject`, { reason }, { headers: this.getHeaders() });
  }

  // ─── Premium (abonnements + plans) ───────────────────────
  getPremiumSubscriptions(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/premium/subscriptions`, { headers: this.getHeaders(), params });
  }
  activatePremiumSubscription(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/premium/subscriptions/${id}/activate`, {}, { headers: this.getHeaders() });
  }
  cancelPremiumSubscription(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/premium/subscriptions/${id}/cancel`, {}, { headers: this.getHeaders() });
  }
  expirePremiumSubscription(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/premium/subscriptions/${id}/expire`, {}, { headers: this.getHeaders() });
  }
  getPremiumPlans(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/premium/plans`, { headers: this.getHeaders() });
  }
  createPremiumPlan(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/premium/plans`, data, { headers: this.getHeaders() });
  }
  updatePremiumPlan(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/premium/plans/${id}`, data, { headers: this.getHeaders() });
  }
  togglePremiumPlan(id: number, active: boolean): Observable<any> {
    const action = active ? 'activate' : 'deactivate';
    return this.http.patch(`${this.apiUrl}/admin/premium/plans/${id}/${action}`, {}, { headers: this.getHeaders() });
  }

  // ─── Supervision des boosts (produits + annonces) ────────
  getActiveBoosts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/boosts/active`, { headers: this.getHeaders() });
  }
  deactivateProductBoost(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/product-boosts/${id}/deactivate`, {}, { headers: this.getHeaders() });
  }
  deactivateAdBoost(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/ad-boosts/${id}/deactivate`, {}, { headers: this.getHeaders() });
  }

  // Pas de vrai statut de commande à 5 états — seul le champ Active existe
  // réellement sur `orders`. Le statut de paiement vient de Invoices.Status,
  // le statut de livraison de Deliveries.Status (informatifs, non éditables
  // depuis cette page).
  updateOrderActive(id: number, active: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/orders/${id}`, { Active: active ? 1 : 0 }, { headers: this.getHeaders() });
  }

  getInvoicesLookup(): Observable<any> {
    return this.http.get(`${this.apiUrl}/invoices`, { headers: this.getHeaders(), params: { per_page: 200 } });
  }

  getDeliveriesLookup(): Observable<any> {
    return this.http.get(`${this.apiUrl}/deliveries`, { headers: this.getHeaders(), params: { per_page: 200 } });
  }

  getDealsLookup(): Observable<any> {
    return this.http.get(`${this.apiUrl}/deals`, { params: { per_page: 200 } });
  }

  // ─── Admin profiles ──────────────────────────────────────
  // ⚠️ Redirige vers /users/{id} — voir la note sur getAllVendors() ci-dessous :
  // un "vendeur" est un User avec IdRole=2, pas une ligne de la table Vendors.
  getAdminVendorDetails(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() });
  }

  getAdminUserDetails(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() });
  }

  updateAdminUser(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}`, data, { headers: this.getHeaders() });
  }

  deleteAdminUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() });
  }
  updateAnnonce(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/ads/${id}`, data, { headers: this.getHeaders() });
  }

  // ✅ Route admin dédiée ajoutée par l'encadrant (PUT /admin/ads/{id})
  // pour permettre à l'admin d'éditer une annonce sans passer par la route
  // vendeur (PUT /ads/{id}, réservée au rôle entreprise).
  updateAnnonceAdmin(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/ads/${id}`, data, { headers: this.getHeaders() });
  }

  // ⚠️ Pas de route "/toggle" côté Laravel — on récupère l'état actuel puis
  // on envoie un PUT /users/{id} avec le champ inversé.
  // NB : n'agit que sur la table `users` (IdUser) — pas sur `vendors`.
  toggleAdminUser(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() }).pipe(
      switchMap((res: any) => {
        const current = res?.data ?? res;
        const newActive = current?.Active ? 0 : 1;
        return this.http.put(`${this.apiUrl}/users/${id}`, { Active: newActive }, { headers: this.getHeaders() });
      })
    );
  }

  // ─── Admin ──────────────────────────────────────────────
  // ✅ Corrigé : /admin/stats n'existe pas côté Laravel (et aucun composant
  // ne l'appelle plus actuellement — le dashboard admin fait déjà sa propre
  // agrégation via per_page=1 sur les vraies routes, voir dashboard-admin.component.ts).
  // Gardée fonctionnelle par sécurité (si un futur écran l'appelle) en
  // agrégeant ici des compteurs réels : utilisateurs, produits actifs,
  // annonces actives, commandes, chiffre d'affaires facturé.
  getAdminStats(period: string = 'year'): Observable<any> {
    return forkJoin({
      users: this.http.get<any>(`${this.apiUrl}/users`, { headers: this.getHeaders(), params: { per_page: 1 } }).pipe(catchError(() => of(null))),
      vendors: this.http.get<any>(`${this.apiUrl}/users`, { headers: this.getHeaders(), params: { per_page: 1, IdRole: 2 } }).pipe(catchError(() => of(null))),
      products: this.http.get<any>(`${this.apiUrl}/products`, { headers: this.getHeaders(), params: { per_page: 1, Active: 1 } }).pipe(catchError(() => of(null))),
      ads: this.http.get<any>(`${this.apiUrl}/ads`, { headers: this.getHeaders(), params: { per_page: 1, Active: 1 } }).pipe(catchError(() => of(null))),
      orders: this.http.get<any>(`${this.apiUrl}/orders`, { headers: this.getHeaders(), params: { per_page: 1 } }).pipe(catchError(() => of(null))),
      invoices: this.http.get<any>(`${this.apiUrl}/invoices`, { headers: this.getHeaders(), params: { Status: 'paid' } }).pipe(catchError(() => of({ count: 0, data: [] }))),
    }).pipe(
      map(({ users, vendors, products, ads, orders, invoices }: { users: any; vendors: any; products: any; ads: any; orders: any; invoices: any }) => {
        const revenue = (invoices?.data ?? []).reduce((s: number, inv: any) => s + (+inv.Total || 0), 0);
        return {
          totalUsers: users?.total ?? users?.meta?.total ?? 0,
          totalVendors: vendors?.total ?? vendors?.meta?.total ?? 0,
          activeProducts: products?.total ?? products?.meta?.total ?? 0,
          activeAds: ads?.total ?? ads?.meta?.total ?? 0,
          totalOrders: orders?.total ?? orders?.meta?.total ?? 0,
          totalRevenue: revenue,
          period,
        };
      })
    );
  }

  // ✅ Corrigé : pas de préfixe /admin/... côté Laravel, GET /users suffit
  // (la restriction admin vient du middleware, pas de l'URL).
  getAdminUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/users`, { headers: this.getHeaders() });
  }

  getPendingVendors(): Observable<any> {
    // "En attente" = comptes vendeur (IdRole=2) dont IsBusinessAccount n'est pas encore validé.
    return this.http.get(`${this.apiUrl}/users`, {
      headers: this.getHeaders(),
      params: { IdRole: 2, IsBusinessAccount: 0, per_page: 50 },
    });
  }

  // ⚠️ "Vendeur" = un User avec IdRole=2 (vérifié dans EnsureUserIsEntreprise.php),
  // PAS la table Vendors séparée (qui n'a aucun lien IdUser — c'est une fiche
  // entreprise indépendante, sans rapport avec les comptes). On reste donc sur
  // l'espace d'ID Users.IdUser partout ci-dessous.
  getAllVendors(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/users`, {
      headers: this.getHeaders(),
      params: { IdRole: 2, ...params },
    });
  }

  // "Approuver" n'est pas un vrai contrôle d'accès côté Laravel (le middleware
  // entreprise ne vérifie que IdRole=2) — on s'en sert comme badge "vérifié"
  // via le champ IsBusinessAccount déjà présent sur Users. À confirmer avec
  // l'encadrant si un vrai workflow d'approbation est prévu.
  approveVendor(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}`, { IsBusinessAccount: 1 }, { headers: this.getHeaders() });
  }

  rejectVendor(id: number, reason?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}`, { IsBusinessAccount: 0 }, { headers: this.getHeaders() });
  }

  // ─── Follows ─────────────────────────────────────────────
  // ✅ Corrigé : pas de routes dédiées /follows/* côté Laravel — juste
  // /user-follows en CRUD générique (IdUser = celui qui suit, IdVendor =
  // celui qui est suivi). On reconstitue toggle/check/mine/followers par-dessus.

  // Cherche s'il existe déjà une ligne user-follows pour (moi -> vendorId).
  private findFollowRow(vendorId: number): Observable<any | null> {
    const myId = this.getCurrentUserId();
    return this.http.get<any>(`${this.apiUrl}/user-follows`, {
      headers: this.getHeaders(),
      params: { IdUser: myId as any, IdVendor: vendorId, per_page: 1 }
    }).pipe(
      map((res: any) => {
        const rows = res?.data ?? res ?? [];
        return rows.length > 0 ? rows[0] : null;
      }),
      catchError(() => of(null))
    );
  }

  toggleFollow(vendorId: number): Observable<{ following: boolean }> {
    const myId = this.getCurrentUserId();
    return this.findFollowRow(vendorId).pipe(
      switchMap((existing: any) => {
        if (existing) {
          const rowId = existing.IdFollow ?? existing.id;
          return this.http.delete(`${this.apiUrl}/user-follows/${rowId}`, { headers: this.getHeaders() }).pipe(
            map(() => ({ following: false }))
          );
        }
        return this.http.post(`${this.apiUrl}/user-follows`, { IdUser: myId, IdVendor: vendorId }, { headers: this.getHeaders() }).pipe(
          map(() => ({ following: true }))
        );
      })
    );
  }

  checkFollow(vendorId: number): Observable<{ following: boolean }> {
    return this.findFollowRow(vendorId).pipe(map((row: any) => ({ following: !!row })));
  }

  // Vendeurs que JE suis, avec leurs infos résolues via /users + un
  // comptage de leurs produits actifs via /products (pas de relation
  // chargée côté backend, il faut donc combiner 3 appels). Champs alignés
  // EXACTEMENT sur ce que lit profile-user.component.html : id,
  // profile_picture, first_name, last_name, shop_name, active_deals,
  // is_approved (pas de ShopName en base -> shop_name reste undefined pour
  // laisser le template retomber sur "first_name + last_name" comme prévu).
  getMyFollows(): Observable<any[]> {
    const myId = this.getCurrentUserId();
    return this.http.get<any>(`${this.apiUrl}/user-follows`, {
      headers: this.getHeaders(),
      params: { IdUser: myId as any, per_page: 100 }
    }).pipe(
      switchMap((res: any) => {
        const rows = res?.data ?? res ?? [];
        const vendorIds: number[] = Array.from(new Set((rows as any[]).map((r: any) => r.IdVendor)));
        if (vendorIds.length === 0) return of([]);
        return forkJoin({
          users: this.http.get<any>(`${this.apiUrl}/users`, { headers: this.getHeaders(), params: { IdRole: 2, per_page: 200 } }).pipe(catchError(() => of({ data: [] }))),
          products: this.http.get<any>(`${this.apiUrl}/products`, { headers: this.getHeaders(), params: { Active: 1, per_page: 200 } }).pipe(catchError(() => of({ data: [] }))),
        }).pipe(
          map(({ users, products }: { users: any; products: any }) => {
            const usersList = users?.data ?? users ?? [];
            const productsList = products?.data ?? products ?? [];
            return (rows as any[])
              .map((row: any) => {
                const u = (usersList as any[]).find((usr: any) => usr.IdUser === row.IdVendor);
                if (!u) return null;
                const activeDeals = (productsList as any[]).filter((p: any) => p.IdUser === u.IdUser).length;
                return {
                  id: u.IdUser,
                  followId: row.IdFollow ?? row.id,
                  first_name: u.FirstName || '',
                  last_name: u.LastName || '',
                  shop_name: null,
                  email: u.Email || '',
                  profile_picture: u.ProfilePicture || '',
                  active_deals: activeDeals,
                  is_approved: !!u.IsBusinessAccount,
                };
              })
              .filter(Boolean);
          })
        );
      }),
      catchError(() => of([]))
    );
  }

  // Utilisateurs qui ME suivent — forme { total, followers } attendue par
  // followers-ent.component.ts. Champs alignés EXACTEMENT sur le template :
  // id, profile_picture, full_name, username, phone, email, followed_at
  // (CreatedAt existe bien sur UserFollows, voir modèle UserFollows.php).
  getMyFollowers(): Observable<{ total: number; followers: any[] }> {
    const myId = this.getCurrentUserId();
    return this.http.get<any>(`${this.apiUrl}/user-follows`, {
      headers: this.getHeaders(),
      params: { IdVendor: myId as any, per_page: 200 }
    }).pipe(
      switchMap((res: any) => {
        const rows = res?.data ?? res ?? [];
        const userIds: number[] = Array.from(new Set((rows as any[]).map((r: any) => r.IdUser)));
        if (userIds.length === 0) return of({ total: 0, followers: [] });
        return this.http.get<any>(`${this.apiUrl}/users`, { headers: this.getHeaders(), params: { per_page: 200 } }).pipe(
          map((usersRes: any) => {
            const users = usersRes?.data ?? usersRes ?? [];
            const followers = (rows as any[])
              .map((row: any) => {
                const u = (users as any[]).find((usr: any) => usr.IdUser === row.IdUser);
                if (!u) return null;
                return {
                  id: u.IdUser,
                  full_name: `${u.FirstName || ''} ${u.LastName || ''}`.trim(),
                  username: u.Username || '',
                  phone: u.Telephone || '',
                  email: u.Email || '',
                  profile_picture: u.ProfilePicture || '',
                  followed_at: row.CreatedAt || null,
                };
              })
              .filter(Boolean);
            return { total: followers.length, followers };
          })
        );
      }),
      catchError(() => of({ total: 0, followers: [] }))
    );
  }

  // ─── Notifications ───────────────────────────────────────
  getNotifications(): Observable<any> {
    return this.http.get(`${this.apiUrl}/notifications`, { headers: this.getHeaders() });
  }

  // ✅ Corrigé : pas de route "/read" — PUT (update) /notifications/{id}
  // avec le champ réel IsRead.
  markNotificationRead(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/notifications/${id}`, { IsRead: 1 }, { headers: this.getHeaders() });
  }

  // ✅ Corrigé : pas de route "/read-all" côté Laravel — on récupère les
  // notifications non lues (déjà scopées sur l'utilisateur connecté par le
  // controller, voir NotificationsController::index) et on les marque une
  // par une en parallèle.
  markAllNotificationsRead(): Observable<any> {
    // CORRIGE - per_page: 200 tronquait silencieusement au-dela de 50 cote backend
    return this.fetchAllPages((page) => this.http.get<any>(`${this.apiUrl}/notifications`, {
      headers: this.getHeaders(),
      params: { IsRead: 0, per_page: 50, page }
    })).pipe(
      switchMap((rows: any[]) => {
        if (rows.length === 0) return of({ updated: 0 });
        const calls = (rows as any[]).map((n: any) =>
          this.http.put(`${this.apiUrl}/notifications/${n.IdNotification ?? n.id}`, { IsRead: 1 }, { headers: this.getHeaders() }).pipe(catchError(() => of(null)))
        );
        return forkJoin(calls).pipe(map((results: any[]) => ({ updated: results.filter(Boolean).length })));
      })
    );
  }
  getAdminSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin-settings`, { headers: this.getHeaders(), params: { per_page: 100 } });
  }

  updateAdminSetting(key: string, value: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin-settings/${key}`, { Value: value }, { headers: this.getHeaders() });
  }

  createAdminSetting(key: string, value: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin-settings`, { Key: key, Value: value }, { headers: this.getHeaders() });
  }

  deleteAdminSetting(key: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin-settings/${key}`, { headers: this.getHeaders() });
  }

  // ─── Point Packets (CRUD admin) ──────────────────────────
  getPointPackets(): Observable<any> {
    return this.http.get(`${this.apiUrl}/point-packets`, { headers: this.getHeaders(), params: { per_page: 100 } });
  }

  createPointPacket(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/point-packets`, payload, { headers: this.getHeaders() });
  }

  updatePointPacket(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/point-packets/${id}`, payload, { headers: this.getHeaders() });
  }

  deletePointPacket(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/point-packets/${id}`, { headers: this.getHeaders() });
  }

  // ─── Annonces (public detail) ────────────────────────────
  // "Annonces" = table `ads` côté Laravel (pas de route /annonces, voir
  // getAdminAnnonces() plus haut pour la même remarque sur la liste).
  getAnnonce(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/ads/${id}`);
  }

  // Alias historique (ajouté par le binôme sous un nom légèrement différent
  // — "assetsBaseUrl" avec un "s") : on délègue au getter canonique ci-dessus
  // pour ne pas maintenir la même logique à deux endroits.
  get assetsBaseUrl(): string {
    return this.assetBaseUrl;
  }

  // ─── Deals ───────────────────────────────────────────────
  getDeals(params?: any): Observable<any> {
    // CORRIGE - per_page:200 tronquait silencieusement au-dela de 50 cote backend.
    return this.fetchAllPages((page) => this.http.get(`${this.apiUrl}/deals`, { params: { ...params, per_page: 50, page } })).pipe(
      map((data: any[]) => ({ data }))
    );
  }
  getDeal(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/deals/${id}`);
  }

  // ─── Vendors public ──────────────────────────────────────
  getVendors(params?: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/vendors`, { params });
  }

  getVendor(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/vendors/${id}`);
  }

  // ─── Admin catalog CRUD (helper générique) ───────────────
  // ⚠️ Il n'existe AUCUN préfixe "/admin/..." côté Laravel — chaque ressource
  // (cities, prizes, coupons, causes, countries, winners, brands,
  // boost-ads-packs…) est accessible sur son URL plate habituelle
  // (GET/POST/PUT/DELETE /{resource}), la distinction admin se fait par le
  // rôle du token, pas par l'URL. Utilisé par 9 pages admin (référentiels).
  adminList(path: string, params: any = {}): Observable<any> {
    // CORRIGE - per_page:200 tronquait silencieusement au-dela de 50 cote backend
    // (impacte tous les composants génériques : brands, causes, cities,
    // countries, coupons, prizes, winners, boost-ads-packs...).
    return this.fetchAllPages((page) => this.http.get(`${this.apiUrl}/${path}`, { headers: this.getHeaders(), params: { ...params, per_page: 50, page } })).pipe(
      map((data: any[]) => ({ data }))
    );
  }
  adminCreate(path: string, payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${path}`, payload, { headers: this.getHeaders() });
  }
  adminUpdate(path: string, id: number, payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${path}/${id}`, payload, { headers: this.getHeaders() });
  }
  // Alias de adminUpdate — utilisé par les composants (ex: DealsAdminComponent.saveEdit)
  // qui appellent `adminPut('deals', id, payload)`. Même comportement : PUT /{path}/{id}.
  adminPut(path: string, id: number, payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${path}/${id}`, payload, { headers: this.getHeaders() });
  }
  // ⚠️ Pas de route "/toggle" générique côté Laravel non plus — ce helper
  // reste utilisable seulement si l'appelant construit lui-même l'URL complète
  // d'une vraie route toggle existante (ex: 'ads/12/activate').
  adminPatch(subPath: string, payload: any = {}): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${subPath}`, payload, { headers: this.getHeaders() });
  }
  adminDelete(path: string, id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${path}/${id}`, { headers: this.getHeaders() });
  }

  getAdminAllUsers(params: any = {}): Observable<any> {
    // CORRIGE - per_page:200 tronquait silencieusement au-dela de 50 cote backend.
    return this.fetchAllPages((page) => this.http.get(`${this.apiUrl}/users`, { headers: this.getHeaders(), params: { ...params, per_page: 50, page } })).pipe(
      map((data: any[]) => ({ data }))
    );
  }
  getAdminDeals(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/deals`, { headers: this.getHeaders(), params });
  }

  getDealDetails(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/deals/${id}`, { headers: this.getHeaders() });
  }

  // ⚠️ PUT/DELETE /deals/{id} sont actuellement réservés au rôle "entreprise"
  // (middleware EnsureUserIsEntreprise vérifie IdRole===2 strictement) — un
  // admin recevra un 403 tant que l'encadrant n'élargit pas cette règle ou
  // n'ajoute pas une route dédiée admin pour les deals.
  updateDeal(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/deals/${id}`, data, { headers: this.getHeaders() });
  }

  // ✅ Route admin dédiée ajoutée par l'encadrant (PUT /admin/deals/{id})
  // pour permettre à l'admin d'éditer un deal sans passer par la route
  // vendeur (PUT /deals/{id}, réservée au rôle entreprise).
  updateDealAdmin(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/deals/${id}`, data, { headers: this.getHeaders() });
  }

  deleteDeal(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/deals/${id}`, { headers: this.getHeaders() });
  }

  // ✅ Route admin dédiée (DELETE /admin/deals/{id}) pour permettre à l'admin
  // de supprimer un deal sans passer par la route vendeur (réservée entreprise).
  deleteDealAdmin(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/deals/${id}`, { headers: this.getHeaders() });
  }

  // ✅ MAJ backend (tijara5) : route dédiée admin PATCH /deals/{id}/activate.
  // Remplace l'ancien toggleActive() qui passait par PUT /deals/{id} et
  // recevait un 403 pour un admin (EnsureUserIsEntreprise exige IdRole===2).
  // Cette nouvelle route est dans le groupe middleware ['auth:api','admin'],
  // donc réservée aux admins — exactement ce qu'il fallait ici.
  // Sans `active` explicite, le backend inverse simplement l'état courant.
  activateDeal(id: number, active?: boolean): Observable<any> {
    const payload = active === undefined ? {} : { active: active ? 1 : 0 };
    return this.http.patch(`${this.apiUrl}/deals/${id}/activate`, payload, { headers: this.getHeaders() });
  }

  // ⚠️ Pas de route "/toggle-premium" côté Laravel — même principe : GET puis PUT.
  toggleUserPremium(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() }).pipe(
      switchMap((res: any) => {
        const current = res?.data ?? res;
        const newPremium = current?.IsPremuim ? 0 : 1;
        return this.http.put(`${this.apiUrl}/users/${id}`, { IsPremuim: newPremium }, { headers: this.getHeaders() });
      })
    );
  }

  // ─── LOT 2 — Wishlist (user) ─────────────────────────────
  // ✅ Corrigé en profondeur : il n'existe PAS de route générique
  // /wishlist/{type}/{id} côté Laravel. Chaque type a sa propre table/route :
  //   ads      -> /ads-wishlist      (champ IdAd)
  //   deals    -> /deals-wishlist    (champ IdDeal)
  //   products -> /product-wishlist  (champ IdProduct)
  // Toutes suivent le même contrat : POST .../add {IdUser,IdX,Liked},
  // DELETE .../remove {IdUser,IdX}, GET (index paginé, filtrable IdUser/IdX).
  // On mappe donc 'ads'|'deals'|'products' vers le bon path + nom de champ.

  private wishlistConfig(type: 'ads' | 'deals' | 'products'): { path: string; field: string } {
    if (type === 'ads') return { path: 'ads-wishlist', field: 'IdAd' };
    if (type === 'deals') return { path: 'deals-wishlist', field: 'IdDeal' };
    return { path: 'product-wishlist', field: 'IdProduct' };
  }

  // Wishlist "ads" enrichie avec les infos de l'annonce + le nom de la
  // catégorie (pas de relation chargée côté backend sur AdsWishlist, donc
  // on combine avec /ads et /categories). Champs alignés EXACTEMENT sur le
  // template de wishlist-user.component.ts : image, title, category, price,
  // createdAt, targetId (features non résolues : nécessiterait une jointure
  // feature-categories -> features par annonce, trop coûteux pour le gain
  // visuel — dégradation propre, la section "features" reste simplement
  // masquée côté template si le tableau est vide).
  getWishlistAds(): Observable<any[]> {
    const myId = this.getCurrentUserId();
    // CORRIGE - per_page fixes (100/200) tronquaient silencieusement au-dela de 50 cote backend
    return this.fetchAllPages((page) => this.http.get<any>(`${this.apiUrl}/ads-wishlist`, { headers: this.getHeaders(), params: { IdUser: myId as any, per_page: 50, page } })).pipe(
      switchMap((rows: any[]) => {
        if (rows.length === 0) return of([]);
        return forkJoin({
          ads: this.fetchAllPages((page) => this.http.get<any>(`${this.apiUrl}/ads`, { headers: this.getHeaders(), params: { per_page: 50, page } })).pipe(catchError(() => of([]))),
          categories: this.fetchAllPages((page) => this.http.get<any>(`${this.apiUrl}/categories`, { params: { per_page: 50, page } })).pipe(catchError(() => of([]))),
        }).pipe(
          map(({ ads, categories }: { ads: any[]; categories: any[] }) => {
            return (rows as any[]).map((row: any) => {
              const ad = ads.find((a: any) => a.IdAd === row.IdAd);
              const cat = ad ? categories.find((c: any) => c.IdCateg === ad.IdCateg) : null;
              return {
                idWish: row.IdAdsWishlist ?? row.id,
                targetId: row.IdAd,
                title: ad?.TitleAd || 'Annonce indisponible',
                category: cat?.TitleFr || '',
                price: ad ? parseFloat(ad.PriceAd) || 0 : 0,
                image: ad?.ImageAd?.[0] || null,
                createdAt: ad?.DatePublication || null,
                raw: ad || null,
              };
            });
          })
        );
      }),
      catchError(() => of([]))
    );
  }
  addToWishlist(type: 'ads' | 'deals' | 'products', id: number): Observable<any> {
    const myId = this.getCurrentUserId();
    const { path, field } = this.wishlistConfig(type);
    return this.http.post(`${this.apiUrl}/${path}/add`, { IdUser: myId, [field]: id, Liked: 1 }, { headers: this.getHeaders() });
  }

  // ✅ Type élargi par le binôme : 'products' ajouté — idem, dispatch réel.
  removeFromWishlist(type: 'ads' | 'deals' | 'products', id: number): Observable<any> {
    const myId = this.getCurrentUserId();
    const { path, field } = this.wishlistConfig(type);
    return this.http.request('delete', `${this.apiUrl}/${path}/remove`, {
      headers: this.getHeaders(),
      body: { IdUser: myId, [field]: id }
    });
  }

  // Wishlist "deals" enrichie, même principe que getWishlistAds() ci-dessus
  // (dont le champ "category" via /categories, join sur idCateg -> TitleFr).
  getWishlistDeals(): Observable<any[]> {
    const myId = this.getCurrentUserId();
    // CORRIGE - per_page fixes (100/200) tronquaient silencieusement au-dela de 50 cote backend
    return this.fetchAllPages((page) => this.http.get<any>(`${this.apiUrl}/deals-wishlist`, { headers: this.getHeaders(), params: { IdUser: myId as any, per_page: 50, page } })).pipe(
      switchMap((rows: any[]) => {
        if (rows.length === 0) return of([]);
        return forkJoin({
          deals: this.fetchAllPages((page) => this.http.get<any>(`${this.apiUrl}/deals`, { params: { per_page: 50, page } })).pipe(catchError(() => of([]))),
          categories: this.fetchAllPages((page) => this.http.get<any>(`${this.apiUrl}/categories`, { params: { per_page: 50, page } })).pipe(catchError(() => of([]))),
        }).pipe(
          map(({ deals, categories }: { deals: any[]; categories: any[] }) => {
            return (rows as any[]).map((row: any) => {
              const deal = deals.find((d: any) => d.idDeal === row.IdDeal);
              const cat = deal ? categories.find((c: any) => c.IdCateg === deal.idCateg) : null;
              return {
                idWish: row.IdDealsWishlist ?? row.id,
                targetId: row.IdDeal,
                title: deal?.titleDeal || 'Deal indisponible',
                category: cat?.TitleFr || '',
                price: deal ? parseFloat(deal.priceDeal) || 0 : 0,
                image: deal?.imageDeal?.[0] || null,
                createdAt: deal?.datePublication || null,
                raw: deal || null,
              };
            });
          })
        );
      }),
      catchError(() => of([]))
    );
  }
  getWishlistProducts(): Observable<any[]> {
    const myId = this.getCurrentUserId();
    return this.http.get<any>(`${this.apiUrl}/product-wishlist`, { headers: this.getHeaders(), params: { IdUser: myId as any, per_page: 100 } }).pipe(
      switchMap((res: any) => {
        const rows = res?.data ?? res ?? [];
        if (rows.length === 0) return of([]);
        return this.http.get<any>(`${this.apiUrl}/products`, { headers: this.getHeaders(), params: { per_page: 200 } }).pipe(
          map((prodRes: any) => {
            const products = prodRes?.data ?? prodRes ?? [];
            return (rows as any[]).map((row: any) => {
              const p = (products as any[]).find((pr: any) => pr.IdProduct === row.IdProduct);
              return {
                idWish: row.IdProductWishlist ?? row.id,
                targetId: row.IdProduct,
                title: p?.TitleProduct || 'Produit indisponible',
                price: p ? parseFloat(p.PriceProduct) || 0 : 0,
                image: p?.ImageProduct?.[0] || null,
                createdAt: null,
                raw: p || null,
              };
            });
          })
        );
      }),
      catchError(() => of([]))
    );
  }

  // ✅ Type élargi par le binôme : 'products' ajouté — reconstruit
  // {ad_liked, deal_liked, product_liked} en interrogeant la bonne table
  // wishlist (pas de route /wishlist/check générique côté Laravel).
  checkWishlist(adId?: number, dealId?: number, productId?: number): Observable<any> {
    const myId = this.getCurrentUserId();
    if (adId != null) {
      return this.http.get<any>(`${this.apiUrl}/ads-wishlist`, { headers: this.getHeaders(), params: { IdUser: myId as any, IdAd: adId, per_page: 1 } }).pipe(
        map((res: any) => ({ ad_liked: (res?.data ?? res ?? []).length > 0 })),
        catchError(() => of({ ad_liked: false }))
      );
    }
    if (dealId != null) {
      return this.http.get<any>(`${this.apiUrl}/deals-wishlist`, { headers: this.getHeaders(), params: { IdUser: myId as any, IdDeal: dealId, per_page: 1 } }).pipe(
        map((res: any) => ({ deal_liked: (res?.data ?? res ?? []).length > 0 })),
        catchError(() => of({ deal_liked: false }))
      );
    }
    if (productId != null) {
      return this.http.get<any>(`${this.apiUrl}/product-wishlist`, { headers: this.getHeaders(), params: { IdUser: myId as any, IdProduct: productId, per_page: 1 } }).pipe(
        map((res: any) => ({ product_liked: (res?.data ?? res ?? []).length > 0 })),
        catchError(() => of({ product_liked: false }))
      );
    }
    return of({});
  }

  // ─── LOT 2 — Reviews ─────────────────────────────────────
  // ✅ Corrigé : champs réels TargetType/TargetId (PascalCase) au lieu de
  // type/targetId — voir ReviewsController::index (buildFilteredQuery sur
  // ['IdUser','TargetType','TargetId','Active']).
  // Renvoie directement le tableau `data` (pas l'objet de pagination Laravel
  // complet) car detail.component.ts assigne le résultat tel quel à
  // `reviews: any[]` et l'itère en `@for` — lui passer l'objet paginé
  // casserait le rendu (ce n'était pas le cas avant : le backend .NET
  // renvoyait probablement déjà un tableau brut).
  getReviews(type: string, targetId: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/reviews`, { params: { TargetType: type, TargetId: targetId, per_page: 100 } }).pipe(
      map((res: any) => res?.data ?? res ?? []),
      catchError(() => of([]))
    );
  }

  // ✅ Corrigé : /reviews/summary n'existe pas — on calcule la moyenne et le
  // total côté Angular à partir de la liste filtrée (déjà scopée par
  // TargetType/TargetId ci-dessus, donc peu coûteux : quelques dizaines
  // d'avis par annonce/produit tout au plus).
  getReviewSummary(type: string, targetId: number): Observable<any> {
    return this.getReviews(type, targetId).pipe(
      map((res: any) => {
        const rows = res?.data ?? res ?? [];
        const count = rows.length;
        const average = count > 0 ? rows.reduce((s: number, r: any) => s + (+r.Rating || 0), 0) / count : 0;
        return { total: count, average: Math.round(average * 10) / 10 };
      }),
      catchError(() => of({ total: 0, average: 0 }))
    );
  }

  // ✅ Corrigé : /reviews/my n'existe pas — filtre IdUser=moi sur /reviews.
  getMyReviews(): Observable<any> {
    const myId = this.getCurrentUserId();
    return this.http.get(`${this.apiUrl}/reviews`, { headers: this.getHeaders(), params: { IdUser: myId as any, per_page: 100 } });
  }

  // ✅ Corrigé : POST /reviews avec TargetType/TargetId/IdUser/Rating/Comment
  // dans le corps (pas en query string, et pas rating/comment minuscules seuls).
  addReviewGeneric(type: string, targetId: number, payload: { rating: number; comment?: string }): Observable<any> {
    const myId = this.getCurrentUserId();
    return this.http.post(`${this.apiUrl}/reviews`, {
      TargetType: type,
      TargetId: targetId,
      IdUser: myId,
      Rating: payload.rating,
      Comment: payload.comment || '',
    }, { headers: this.getHeaders() });
  }

  deleteReviewGeneric(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reviews/${id}`, { headers: this.getHeaders() });
  }

  // ═══ LOT 3 + 6 ═══════════════════════════════════════════════════════════

  // ─── Permissions (admin) ─────────────────────────────────
  getPermissions(params: any = {}): Observable<any[]> {
    // CORRIGE - per_page:200 tronquait silencieusement au-dela de 50 cote backend.
    return this.fetchAllPages((page) => this.http.get<any>(`${this.apiUrl}/permissions`, { headers: this.getHeaders(), params: { ...params, per_page: 50, page } })).pipe(
      catchError(() => of([]))
    );
  }
  getPermissionsByRole(idRole: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/permissions`, { headers: this.getHeaders(), params: { IdRole: idRole, per_page: 100 } });
  }
  savePermission(p: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/permissions`, p, { headers: this.getHeaders() });
  }
  updatePermission(id: number, p: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/permissions/${id}`, p, { headers: this.getHeaders() });
  }
  deletePermission(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/permissions/${id}`, { headers: this.getHeaders() });
  }

  // ─── Payments ────────────────────────────────────────────
  createPayment(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/payments`, payload, { headers: this.getHeaders() });
  }
  // ✅ Corrigé : /payments/mine n'existe pas — l'index générique
  // (PaymentsController::index, accessible en auth:api pour index/show/store)
  // n'est PAS filtré automatiquement par utilisateur côté backend (contrairement
  // à /notifications) : on doit donc passer IdUser=moi explicitement. Si le
  // token est un simple user (pas admin), la route reste accessible car
  // /payments (index/show/store) est dans le groupe "USER CONNECTÉ" (Section 2).
  getMyPayments(): Observable<any> {
    const myId = this.getCurrentUserId();
    return this.http.get(`${this.apiUrl}/payments`, { headers: this.getHeaders(), params: { IdUser: myId as any, per_page: 100 } });
  }
  getAllPayments(params: any = {}): Observable<any[]> {
    // CORRIGE - per_page:200 tronquait silencieusement au-dela de 50 cote backend.
    return this.fetchAllPages((page) => this.http.get<any>(`${this.apiUrl}/payments`, { headers: this.getHeaders(), params: { ...params, per_page: 50, page } })).pipe(
      catchError(() => of([]))
    );
  }
  refundPayment(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/payments/${id}/refund`, {}, { headers: this.getHeaders() });
  }
  completePayment(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/payments/${id}/complete`, {}, { headers: this.getHeaders() });
  }
  deletePayment(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/payments/${id}`, { headers: this.getHeaders() });
  }

  // ─── Public catalog (admin → users/vendors) ──────────────
  // ⚠️ BACKEND REQUIS : GET /coupons n'est enregistrée QUE sous le
  // middleware ['auth:api','admin'] (routes/api.php Section 4 :
  // ->except(['show']), et 'show' n'est enregistrée nulle part ailleurs
  // non plus). Il n'existe donc AUCUNE route pour qu'un visiteur ou un
  // simple utilisateur consulte les coupons publics — seul un admin
  // connecté peut lister /coupons, et personne ne peut faire GET /coupons/{id}.
  // Cet appel échouera en 401/403 pour un utilisateur non-admin tant que
  // l'encadrant n'ajoute pas une route publique (ex: Section 1, ->only(['index','show'])
  // comme pour brands/prizes/winners). Fallback géré en catchError pour ne
  // pas casser l'écran coupons-user.
  getPublicCoupons(): Observable<any> {
    return this.http.get(`${this.apiUrl}/coupons`, { headers: this.getHeaders() }).pipe(
      catchError(() => of({ data: [] }))
    );
  }
  getPublicPrizes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/prizes`);
  }
  // ✅ Corrigé : la vraie route Laravel est /boost-ads-packs, pas /boost-packs.
  getPublicBoostPacks(): Observable<any> {
    return this.http.get(`${this.apiUrl}/boost-ads-packs`, { headers: this.getHeaders() });
  }
  getPublicWinners(): Observable<any> {
    return this.http.get(`${this.apiUrl}/winners`);
  }

  // ─── Transports ──────────────────────────────────────────
  getTransports(params: any = {}): Observable<any> {
    // CORRIGE - per_page:200 tronquait silencieusement au-dela de 50 cote backend.
    return this.fetchAllPages((page) => this.http.get(`${this.apiUrl}/transports`, { params: { ...params, per_page: 50, page } })).pipe(
      map((data: any[]) => ({ data }))
    );
  }
  createTransport(t: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/transports`, t, { headers: this.getHeaders() });
  }
  updateTransport(id: number, t: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/transports/${id}`, t, { headers: this.getHeaders() });
  }
  // ⚠️ La vraie route est POST /transports/{id}/toggle-active (pas PATCH .../toggle)
  toggleTransport(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/transports/${id}/toggle-active`, {}, { headers: this.getHeaders() });
  }
  deleteTransport(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/transports/${id}`, { headers: this.getHeaders() });
  }

  // ─── Deliveries ──────────────────────────────────────────
  // ⚠️ Le vrai statut Laravel utilise 5 valeurs précises : 'Pending',
  // 'In Transit', 'Delivered', 'Failed', 'Returned' (PascalCase, espaces
  // compris) — pas 'pending'/'shipped'/'delivered'/'cancelled'.
  getDeliveries(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/deliveries`, { headers: this.getHeaders(), params });
  }
  createDelivery(d: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/deliveries`, d, { headers: this.getHeaders() });
  }
  // ⚠️ POST /deliveries/{id}/status et PUT /deliveries/{id} sont réservés au
  // rôle "entreprise" côté Laravel (comme pour les deals) — 403 pour un admin
  // tant que le backend n'ouvre pas ces routes à l'admin.
  updateDeliveryStatus(id: number, status: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/deliveries/${id}/status`, { Status: status }, { headers: this.getHeaders() });
  }
  updateDelivery(id: number, d: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/deliveries/${id}`, d, { headers: this.getHeaders() });
  }
  deleteDelivery(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/deliveries/${id}`, { headers: this.getHeaders() });
  }

  // ─── Invoices ────────────────────────────────────────────
  // ⚠️ GET /invoices ne pagine PAS côté Laravel (pas de page/per_page) — il
  // renvoie tout le résultat déjà filtré ({success, count, data}). Les vrais
  // filtres supportés : search, IdUser, IdVendor, IdOrder, Status, from, to,
  // min, max, sort, direction. La pagination visuelle se fait donc côté
  // Angular sur ce résultat déjà filtré par le backend (pas de tri/recherche
  // en JS, juste le découpage en pages d'affichage).
  getInvoices(params: any = {}): Observable<any> {
    // CORRIGE - per_page:200 tronquait silencieusement au-dela de 50 cote backend.
    return this.fetchAllPages((page) => this.http.get(`${this.apiUrl}/invoices`, { headers: this.getHeaders(), params: { ...params, per_page: 50, page } })).pipe(
      map((data: any[]) => ({ data }))
    );
  }
  generateInvoiceFromOrder(orderId: number, paymentMethod: string = 'cash'): Observable<any> {
    return this.http.post(`${this.apiUrl}/invoices`, { IdOrder: orderId, PaymentMethod: paymentMethod }, { headers: this.getHeaders() });
  }
  getInvoice(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/invoices/${id}`, { headers: this.getHeaders() });
  }
  // ⚠️ Pas de route /paid dédiée — on utilise PUT /invoices/{id} (accessible
  // à l'admin) pour changer directement Status et PaidAt.
  markInvoicePaid(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/invoices/${id}`, { Status: 'paid', PaidAt: new Date().toISOString() }, { headers: this.getHeaders() });
  }
  updateInvoice(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/invoices/${id}`, data, { headers: this.getHeaders() });
  }
  deleteInvoice(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/invoices/${id}`, { headers: this.getHeaders() });
  }

  // ─── Reports (analytique ventes — À NE PAS CONFONDRE avec /reports =
  // signalements/réclamations plus haut) ────────────────────────────────
  // ⚠️ BUG BACKEND DÉCOUVERT : les routes GET /invoices/statistics et
  // GET /invoices/revenue/monthly EXISTENT dans routes/api.php (lignes 436-437)
  // mais pointent vers InvoicesController::statistics() et ::monthlyRevenue()
  // qui n'existent PAS dans le contrôleur (grep confirmé) → 500 garanti si
  // appelées. À signaler à l'encadrant (route stub sans méthode). En
  // attendant, on agrège tout ici côté Angular à partir de GET /invoices
  // (qui, lui, fonctionne et renvoie déjà user/vendor/order.details.product
  // en eager-load — voir InvoicesController::index).

  getReportOverview(): Observable<any> {
    const myId = this.getCurrentUserId();
    return this.http.get<any>(`${this.apiUrl}/invoices`, { headers: this.getHeaders(), params: { IdVendor: myId as any } }).pipe(
      map((res: any) => {
        const invoices = res?.data ?? [];
        const totalOrders = new Set(invoices.map((i: any) => i.IdOrder)).size;
        const deliveredOrders = invoices.filter((i: any) => i.Status === 'paid').length;
        const totalRevenue = invoices.reduce((s: number, i: any) => s + (+i.Total || 0), 0);
        const paidRevenue = invoices
          .filter((i: any) => i.Status === 'paid')
          .reduce((s: number, i: any) => s + (+i.Total || 0), 0);
        return { totalOrders, deliveredOrders, totalRevenue, paidRevenue };
      }),
      catchError(() => of({ totalOrders: 0, deliveredOrders: 0, totalRevenue: 0, paidRevenue: 0 }))
    );
  }

  getSalesByMonth(): Observable<any[]> {
    const myId = this.getCurrentUserId();
    return this.http.get<any>(`${this.apiUrl}/invoices`, { headers: this.getHeaders(), params: { IdVendor: myId as any } }).pipe(
      map((res: any) => {
        const invoices = res?.data ?? [];
        const byMonth: Record<string, { revenue: number; orders: Set<any> }> = {};
        invoices.forEach((inv: any) => {
          const d = inv.IssuedAt ? new Date(inv.IssuedAt) : null;
          if (!d || isNaN(d.getTime())) return;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!byMonth[key]) byMonth[key] = { revenue: 0, orders: new Set() };
          byMonth[key].revenue += (+inv.Total || 0);
          byMonth[key].orders.add(inv.IdOrder);
        });
        return Object.keys(byMonth).sort().map(month => ({
          month,
          revenue: Math.round(byMonth[month].revenue * 100) / 100,
          orders: byMonth[month].orders.size,
        }));
      }),
      catchError(() => of([]))
    );
  }

  getTopProducts(limit = 10): Observable<any[]> {
    const myId = this.getCurrentUserId();
    return this.http.get<any>(`${this.apiUrl}/invoices`, { headers: this.getHeaders(), params: { IdVendor: myId as any } }).pipe(
      map((res: any) => {
        const invoices = res?.data ?? [];
        const byProduct: Record<number, { title: string; price: number; image: any; sold: number }> = {};
        invoices.forEach((inv: any) => {
          const details = inv?.order?.details ?? [];
          (details as any[]).forEach((d: any) => {
            const p = d.product;
            if (!p) return;
            const id = p.IdProduct;
            if (!byProduct[id]) {
              byProduct[id] = {
                title: p.TitleProduct || 'Produit',
                price: +p.PriceProduct || 0,
                image: Array.isArray(p.ImageProduct) ? p.ImageProduct[0] : null,
                sold: 0,
              };
            }
            byProduct[id].sold += (+d.Quantity || 0);
          });
        });
        return Object.keys(byProduct)
          .map(id => ({ id: +id, ...byProduct[+id] }))
          .sort((a, b) => b.sold - a.sold)
          .slice(0, limit);
      }),
      catchError(() => of([]))
    );
  }

  // ⚠️ Non appelée par aucun composant actuellement (vérifié), mais corrigée
  // par cohérence avec les 3 méthodes ci-dessus — même agrégation, groupée
  // par client (IdUser) au lieu du produit.
  getTopCustomers(limit = 10): Observable<any[]> {
    const myId = this.getCurrentUserId();
    return this.http.get<any>(`${this.apiUrl}/invoices`, { headers: this.getHeaders(), params: { IdVendor: myId as any } }).pipe(
      map((res: any) => {
        const invoices = res?.data ?? [];
        const byCustomer: Record<number, { name: string; email: string; spent: number; orders: Set<any> }> = {};
        invoices.forEach((inv: any) => {
          const u = inv.user;
          if (!u) return;
          const id = u.IdUser;
          if (!byCustomer[id]) {
            byCustomer[id] = {
              name: `${u.FirstName || ''} ${u.LastName || ''}`.trim() || u.Username,
              email: u.Email || '',
              spent: 0,
              orders: new Set(),
            };
          }
          byCustomer[id].spent += (+inv.Total || 0);
          byCustomer[id].orders.add(inv.IdOrder);
        });
        return Object.keys(byCustomer)
          .map(id => ({ id: +id, name: byCustomer[+id].name, email: byCustomer[+id].email, spent: byCustomer[+id].spent, orders: byCustomer[+id].orders.size }))
          .sort((a, b) => b.spent - a.spent)
          .slice(0, limit);
      }),
      catchError(() => of([]))
    );
  }

  // ─── SMS ─────────────────────────────────────────────────
  // ⚠️ La route Laravel est /sms-logs (lecture seule, resource admin) — il
  // n'existe PAS de route d'envoi (/sms en POST). sendSms() reste donc
  // inutilisable tant que le backend n'ajoute pas un vrai endpoint d'envoi ;
  // seule la consultation des logs (getSmsLogs) est réellement branchable.
  sendSms(recipient: string, message: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/sms-logs`, { recipient, message }, { headers: this.getHeaders() });
  }
  getSmsLogs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/sms-logs`, { headers: this.getHeaders() });
  }
}