import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

/**
 * Classe de base partagée par tous les services API Tijara.
 * Regroupe tout ce qui était dupliqué / transverse dans l'ancien
 * TijaraApiService monolithique : headers, user courant, helpers
 * de mapping et de construction de query params.
 *
 * Chaque service concret (ProductsService, AnnoncesService, ...)
 * doit "extends BaseApiService" et appeler super(http).
 */
export abstract class BaseApiService {
  protected apiUrl = environment.apiUrl || 'http://localhost:3000/api';

  constructor(protected http: HttpClient) {}

  protected getHeaders(): HttpHeaders {
    const currentUser = localStorage.getItem('currentUser');
    let token = '';
    if (currentUser) {
      try {
        const session = JSON.parse(currentUser);
        token = session?.token || session?.access_token || session?.user?.token || '';
      } catch {}
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    });
  }

  protected getAuthHeadersOnly(): HttpHeaders {
    const currentUser = localStorage.getItem('currentUser');
    let token = '';
    if (currentUser) {
      try {
        const session = JSON.parse(currentUser);
        token = session?.token || session?.access_token || session?.user?.token || '';
      } catch {}
    }
    return token ? new HttpHeaders({ Authorization: 'Bearer ' + token }) : new HttpHeaders();
  }

  public getCurrentUserId(): number | null {
    try {
      const cu = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const raw = cu?.id ?? cu?.IdUser ?? cu?.user?.id ?? cu?.user?.IdUser;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  }

  public getCurrentUserRoleId(): number | null {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const roleId = currentUser?.IdRole ?? currentUser?.user?.IdRole;
      const numericRoleId = Number(roleId);
      if (Number.isFinite(numericRoleId) && numericRoleId > 0) return numericRoleId;

      switch (currentUser?.role) {
        case 'user': return 1;
        case 'vendor': return 2;
        case 'admin': return 3;
        default: return null;
      }
    } catch {
      return null;
    }
  }

  protected mapAdComment(raw: any, user: any | null): any {
    const fullName = user
      ? ([user.FirstName, user.LastName].filter(Boolean).join(' ') || user.Username)
      : null;
    return {
      id:          raw.IdComment ?? raw.id,
      content:     raw.Content ?? raw.content,
      author_name: fullName || 'Utilisateur',
      created_at:  raw.CreatedAt ?? raw.created_at,
      raw
    };
  }

  protected buildListingParams(
    type: 'ads' | 'products' | 'deals',
    p: {
      page?: number;
      limit?: number;
      search?: string;
      categId?: number | string | null;
      priceMin?: number | null;
      priceMax?: number | null;
      idFV?: number | null;
      sort_by?: string;
      sort_dir?: string;
    }
  ): any {
    const out: any = {};

    if (p.page != null)  out.page = p.page;
    if (p.limit != null)  out.per_page = p.limit;
    if (p.search && p.search.trim()) out.search = p.search.trim();

    if (p.sort_by)  out.sort_by  = p.sort_by;
    if (p.sort_dir) out.sort_dir = p.sort_dir;

    switch (type) {
      case 'ads':
        if ((p as any).Active != null)   out.Active      = (p as any).Active;
        if ((p as any).IdUser != null)   out.IdUser      = (p as any).IdUser;
        if (p.categId != null)  out.IdCateg     = p.categId;
        if (p.priceMin != null) out.PriceAd_min = p.priceMin;
        if (p.priceMax != null) out.PriceAd_max = p.priceMax;
        if (p.idFV != null)     out.IdFV        = p.idFV;
        break;

      case 'products':
        if ((p as any).Active != null)   out.Active       = (p as any).Active;
        if ((p as any).IdUser != null)   out.IdUser       = (p as any).IdUser;
        if ((p as any).IdPrize != null)  out.IdPrize      = (p as any).IdPrize;
        if ((p as any).IdBrand != null)  out.IdBrand      = (p as any).IdBrand;
        if (p.categId != null)  out.IdCateorie       = p.categId;
        if (p.priceMin != null) out.PriceProduct_min = p.priceMin;
        if (p.priceMax != null) out.PriceProduct_max = p.priceMax;
        if (p.idFV != null)     out.IdFV             = p.idFV;
        break;

      case 'deals':
        if (p.categId != null)  out.idCateg   = p.categId;
        if (p.priceMin != null) out.price_min = p.priceMin;
        if (p.priceMax != null) out.price_max = p.priceMax;
        break;
    }

    return out;
  }

  public get assetsBaseUrl(): string {
    return this.apiUrl.replace(/\/api\/?$/, '');
  }
}
