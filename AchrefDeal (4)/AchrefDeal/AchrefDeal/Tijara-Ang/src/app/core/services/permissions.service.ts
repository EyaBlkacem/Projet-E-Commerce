import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

/**
 * Utilisé par : permissions-admin.
 *
 * Backend confirmé (PermissionsController::index -> Permissions model, PAS
 * ListPermissions) : searchable=[Resource], filterable=[IdRole,IdListPermission,
 * CanRead,CanCreate,CanUpdate,CanDelete], paginate(). Le filtre "par rôle" du
 * frontend correspond exactement à ?IdRole= sur cette même route.
 *
 * ✅ CONFIRMÉ : getPermissionsByRole(idRole) (route /permissions/role/{idRole})
 * a été supprimée — le fichier reçu de l'équipe admin n'a jamais eu cette
 * méthode et utilise uniquement getPermissions({ IdRole: idRole }). Si du
 * code appelle encore getPermissionsByRole(id), remplacer par
 * getPermissions({ IdRole: id }).
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService extends BaseApiService {

  constructor(http: HttpClient) { super(http); }

  getPermissions(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/permissions`, { headers: this.getHeaders(), params });
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
}