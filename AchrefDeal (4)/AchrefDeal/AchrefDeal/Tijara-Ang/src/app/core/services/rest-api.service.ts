import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { GlobalComponent } from "../../global-component";

/**
 * ⚠️ CORRECTION vs version d'origine :
 * L'ancien `const httpOptions = {...}` au niveau module capturait le token
 * UNE SEULE FOIS au chargement du fichier. Si l'utilisateur se reconnecte
 * ou que le token est rafraîchi, tous les POST/PATCH utilisant cet objet
 * statique envoyaient l'ANCIEN token. On remplace par une fonction/getter
 * appelée à chaque requête pour toujours lire le token courant.
 */
function buildHttpOptions() {
  return {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionStorage.getItem('token')}`
    })
  };
}

function authHeaderToken() {
  return { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` };
}

@Injectable({
  providedIn: 'root'
})
export class restApiService {
  constructor(private http: HttpClient) { }

  /**
  * Product Rest Api
  */
  // Get
  getData(): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + GlobalComponent.product, { headers: authHeaderToken(), responseType: 'text' });
  }

  // Delete
  deleteData(id: any): Observable<any> {
    return this.http.delete(GlobalComponent.API_URL + GlobalComponent.productDelete + id, { responseType: 'text' });
  }

  /**
  * Order Rest Api
  */

  // Get
  getOrderData(): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + GlobalComponent.order, { headers: authHeaderToken(), responseType: 'text' });
  }

  // POST
  postOrderData(employee: any): Observable<any> {
    return this.http.post(GlobalComponent.API_URL + GlobalComponent.order, JSON.stringify(employee), buildHttpOptions());
  }

  // Single
  getSingleOrderData(id: any): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + GlobalComponent.orderId + id, { headers: authHeaderToken(), responseType: 'text' });
  }

  //Order Patch
  patchOrderData(employee: any): Observable<any> {
    return this.http.patch(GlobalComponent.API_URL + GlobalComponent.orderId + employee.ids, JSON.stringify(employee), buildHttpOptions());
  }

  // Order Delete
  deleteOrder(id: any): Observable<any> {
    return this.http.delete(GlobalComponent.API_URL + GlobalComponent.orderId + id, { headers: authHeaderToken(), responseType: 'text' });
  }


  getSellerData(): Observable<any[]> {
    return this.http.get<any[]>('/app/seller');
  }

  getProjectData(): Observable<any[]> {
    return this.http.get<any[]>('/app/project');
  }

  /**
  * Customers Rest Api
  */
  // Get
  getCustomerData(): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + GlobalComponent.customer, { headers: authHeaderToken(), responseType: 'text' });
  }

  // POST
  postCustomerData(customers: any): Observable<any> {
    return this.http.post(GlobalComponent.API_URL + GlobalComponent.customer, JSON.stringify(customers), buildHttpOptions());
  }

  // Single
  getSingleCustomerData(id: any): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + 'apps/customer/' + id, { headers: authHeaderToken(), responseType: 'text' });
  }

  // Patch
  patchCustomerData(customers: any): Observable<any> {
    return this.http.patch(GlobalComponent.API_URL + 'apps/customer/' + customers.ids, JSON.stringify(customers), buildHttpOptions());
  }

  // Delete
  deleteCustomer(id: any): Observable<any> {
    return this.http.delete(GlobalComponent.API_URL + 'apps/customer/' + id, { headers: authHeaderToken(), responseType: 'text' });
  }

  /**
   * Task List Rest Api
   */
  // Get
  getTaskData(): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + 'apps/task', { headers: authHeaderToken(), responseType: 'text' });
  }

  // POST
  postTaskData(task: any): Observable<any> {
    return this.http.post(GlobalComponent.API_URL + 'apps/task', JSON.stringify(task), buildHttpOptions());
  }

  // Single
  getSingleTaskData(id: any): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + 'apps/task/' + id, { headers: authHeaderToken(), responseType: 'text' });
  }

  // Patch
  patchTaskData(tasks: any): Observable<any> {
    return this.http.patch(GlobalComponent.API_URL + 'apps/task/' + tasks.ids, JSON.stringify(tasks), buildHttpOptions());
  }

  // Delete
  deleteTask(id: any): Observable<any> {
    return this.http.delete(GlobalComponent.API_URL + 'apps/task/' + id, { headers: authHeaderToken(), responseType: 'text' });
  }

  // Kanban
  getKanbanData(): Observable<any[]> {
    return this.http.get<any[]>('/app/kanban');
  }

  // Filemanger Folder
  getFolderData(): Observable<any[]> {
    return this.http.get<any[]>('/app/folder');
  }

  addFolderData(newData: any): Observable<any[]> {
    return this.http.post<any[]>('/app/folder', newData);
  }

  updateFolderData(updatedData: any): Observable<any[]> {
    return this.http.put<any[]>('/app/folder', updatedData);
  }

  deleteFolderData(): Observable<void> {
    return this.http.delete<void>('/app/folder');
  }

  // Filemanger Files
  getFileData(): Observable<any[]> {
    return this.http.get<any[]>('/app/file');
  }

  addFileData(newData: any): Observable<any[]> {
    return this.http.post<any[]>('/app/file', newData);
  }

  updateFileData(updatedData: any): Observable<any[]> {
    return this.http.put<any[]>('/app/file', updatedData);
  }

  deleteFileData(): Observable<void> {
    return this.http.delete<void>('/app/file');
  }

  /**
   * CRM Contect Rest Api
   */
  // Get
  getContactData(): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + 'apps/contact', { headers: authHeaderToken(), responseType: 'text' });
  }

  // POST
  postContactData(contact: any): Observable<any> {
    return this.http.post(GlobalComponent.API_URL + 'apps/contact', JSON.stringify(contact), buildHttpOptions());
  }

  // Single
  getSingleContactData(id: any): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + 'apps/contact/' + id, { headers: authHeaderToken(), responseType: 'text' });
  }

  // Patch
  patchContactData(contacts: any): Observable<any> {
    return this.http.patch(GlobalComponent.API_URL + 'apps/contact/' + contacts.ids, JSON.stringify(contacts), buildHttpOptions());
  }

  // Delete
  deleteContact(id: any): Observable<any> {
    return this.http.delete(GlobalComponent.API_URL + 'apps/contact/' + id, { headers: authHeaderToken(), responseType: 'text' });
  }

  /**
   * CRM Company Rest Api
   */
  // Get
  getCompanyData(): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + 'apps/company', { headers: authHeaderToken(), responseType: 'text' });
  }

  // POST
  postCompanyData(company: any): Observable<any> {
    return this.http.post(GlobalComponent.API_URL + 'apps/company', JSON.stringify(company), buildHttpOptions());
  }

  // Single
  getSingleCompanyData(id: any): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + 'apps/company/' + id, { headers: authHeaderToken(), responseType: 'text' });
  }

  // Patch
  patchCompanyData(company: any): Observable<any> {
    return this.http.patch(GlobalComponent.API_URL + 'apps/company/' + company.ids, JSON.stringify(company), buildHttpOptions());
  }

  // Delete
  deleteCompany(id: any): Observable<any> {
    return this.http.delete(GlobalComponent.API_URL + 'apps/company/' + id, { headers: authHeaderToken(), responseType: 'text' });
  }

  getDealData(): Observable<any[]> {
    return this.http.get<any[]>('/app/deal');
  }

  /* CRM Company Rest Api
  */
  // Get
  getLeadData(): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + 'apps/lead', { headers: authHeaderToken(), responseType: 'text' });
  }

  // POST
  postLeadData(company: any): Observable<any> {
    return this.http.post(GlobalComponent.API_URL + 'apps/lead', JSON.stringify(company), buildHttpOptions());
  }

  // Single
  getSingLeadData(id: any): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + 'apps/lead/' + id, { headers: authHeaderToken(), responseType: 'text' });
  }

  // Patch
  patchLeadData(company: any): Observable<any> {
    return this.http.patch(GlobalComponent.API_URL + 'apps/lead/' + company.ids, JSON.stringify(company), buildHttpOptions());
  }

  // Delete
  deletelead(id: any): Observable<any> {
    return this.http.delete(GlobalComponent.API_URL + 'apps/lead/' + id, { headers: authHeaderToken(), responseType: 'text' });
  }

  // Crypto Order
  getCryptoOrderData(): Observable<any[]> {
    return this.http.get<any[]>('/app/cryptoOrder');
  }

  // Crypto Transaction
  getTransactionData(): Observable<any[]> {
    return this.http.get<any[]>('/app/transaction');
  }

  // Job Application
  getApplicationData(): Observable<any[]> {
    return this.http.get<any[]>('/app/application');
  }

  addApplicationData(newData: any): Observable<any[]> {
    return this.http.post<any[]>('/app/application', newData);
  }

  updateApplicationData(updatedData: any): Observable<any[]> {
    return this.http.put<any[]>('/app/application', updatedData);
  }

  deleteApplicationData(): Observable<void> {
    return this.http.delete<void>('/app/application');
  }

  // Job Apikey
  getApikeyData(): Observable<any[]> {
    return this.http.get<any[]>('/app/apikey');
  }

  addApikeyData(newData: any): Observable<any[]> {
    return this.http.post<any[]>('/app/apikey', newData);
  }

  updateApikeyData(updatedData: any): Observable<any[]> {
    return this.http.put<any[]>('/app/apikey', updatedData);
  }

  deleteApikeyData(): Observable<void> {
    return this.http.delete<void>('/app/apikey');
  }

  /* Support Ticket Rest Api
  */
  // Get
  getTicketData(): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + 'apps/ticket', { headers: authHeaderToken(), responseType: 'text' });
  }

  // POST
  postTicketData(ticket: any): Observable<any> {
    return this.http.post(GlobalComponent.API_URL + 'apps/ticket', JSON.stringify(ticket), buildHttpOptions());
  }

  // Single
  getSingTicketData(id: any): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + 'apps/ticket/' + id, { headers: authHeaderToken(), responseType: 'text' });
  }

  // Patch
  patchTicketData(ticket: any): Observable<any> {
    return this.http.patch(GlobalComponent.API_URL + 'apps/ticket/' + ticket.ids, JSON.stringify(ticket), buildHttpOptions());
  }

  // Delete
  deleteTicket(id: any): Observable<any> {
    return this.http.delete(GlobalComponent.API_URL + 'apps/ticket/' + id, { headers: authHeaderToken(), responseType: 'text' });
  }

  /**
  * Invoice Rest Api
  */
  // Get
  getInvoiceData(): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + 'apps/invoice', { headers: authHeaderToken(), responseType: 'text' });
  }

  // Delete
  deleteInvoice(id: any): Observable<any> {
    return this.http.delete(GlobalComponent.API_URL + 'apps/invoice/' + id, { headers: authHeaderToken(), responseType: 'text' });
  }

  /**
  * Todo Rest Api
  */
  // Get
  getTodoData(): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + 'apps/todo/', { headers: authHeaderToken(), responseType: 'text' });
  }

  // POST
  postTodoData(employee: any): Observable<any> {
    return this.http.post(GlobalComponent.API_URL + 'apps/todo/', JSON.stringify(employee), buildHttpOptions());
  }

  // Single
  getSingleTodoData(id: any): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + 'apps/todo/' + id, { headers: authHeaderToken(), responseType: 'text' });
  }

  //Patch
  patchTodoData(employee: any): Observable<any> {
    return this.http.patch(GlobalComponent.API_URL + 'apps/todo/' + employee.ids, JSON.stringify(employee), buildHttpOptions());
  }

  /**
  * Calender Rest Api
  */
  // Get
  getCalendarData(): Observable<any> {
    return this.http.get(GlobalComponent.API_URL + 'apps/calendar/', { headers: authHeaderToken(), responseType: 'text' });
  }

  /**
   * ============================================================
   * Reclamations Rest Api
   * ------------------------------------------------------------
   * Module ajouté : absent de la version d'origine de ce fichier.
   * Repris et adapté de ReclamationsService (référence côté admin).
   *
   * ⚠️ Hypothèse à vérifier : ce fichier suppose l'existence de
   * `GlobalComponent.reclamation` (ex: 'apps/reclamations' ou
   * 'reclamations') dans global-component.ts. Adaptez la valeur
   * si le chemin réel diffère.
   *
   * NOTE IMPORTANTE — dépendance manquante :
   * `getMyTrackedReclamationsResolved()` a besoin de résoudre les
   * noms d'utilisateurs (IdUser -> FirstName/LastName/Email) via un
   * service utilisateurs (UsersService.getUserById dans la version
   * de référence). Ce fichier `restApiService` n'a pas cette
   * dépendance injectée. Deux options :
   *   1) Injecter un UsersService ici (nécessite son import) — non
   *      fait automatiquement pour ne pas deviner un chemin faux.
   *   2) Garder cette résolution dans ReclamationsService séparé et
   *      ne pas la dupliquer ici.
   * En l'état, `getMyTrackedReclamationsResolved()` ci-dessous
   * retourne les rapports bruts sans résolution de nom, avec un
   * commentaire clair marquant la limitation.
   * ============================================================
   */

  private get reclamationsUrl(): string {
    return GlobalComponent.API_URL + ((GlobalComponent as any).reclamation ?? 'apps/reclamations');
  }

  private get myReclamationsUrl(): string {
    return GlobalComponent.API_URL + 'my-reclamations';
  }

  private get myReclamationIdsKey(): string {
    // Pas d'accès direct à l'IdUser courant dans ce service (pas de
    // décodage du token ici). Clé générique conservée volontairement
    // simple ; à affiner si un currentUserId devient disponible.
    return 'tijara_reclamation_ids';
  }

  // Get (liste, avec pagination optionnelle)
  getReclamationsData(params: any = {}): Observable<any> {
    return this.http.get<any>(this.reclamationsUrl, {
      headers: authHeaderToken(),
      params: { per_page: 50, ...params }
    }).pipe(map((res: any) => res?.data ?? res ?? []));
  }

  // Single
  getSingleReclamationData(id: any): Observable<any> {
    return this.http.get(`${this.reclamationsUrl}/${id}`, { headers: authHeaderToken() });
  }

  // POST — payload filtré volontairement (IdUser/date/statut gérés par le
  // backend à partir du token, jamais envoyés par le front).
  postReclamationData(data: any): Observable<any> {
    const payload = {
      IdCause: data?.IdCause,
      Subject: data?.Subject,
      Description: data?.Description,
    };
    return this.http.post(this.reclamationsUrl, JSON.stringify(payload), buildHttpOptions()).pipe(
      tap((res: any) => {
        const id = res?.data?.IdReclamation ?? res?.IdReclamation ?? res?.id;
        if (id) this.trackReclamationId(id);
      })
    );
  }

  // Patch — statut uniquement (aligné sur updateReclamationStatus de référence)
  patchReclamationStatus(id: any, status: string): Observable<any> {
    return this.http.patch(`${this.reclamationsUrl}/${id}/status`, JSON.stringify({ Status: status }), buildHttpOptions());
  }

  // Patch générique — délègue au statut, comme dans la version de référence
  patchReclamationData(data: any): Observable<any> {
    return this.patchReclamationStatus(data?.ids ?? data?.IdReclamation ?? data?.id, data?.Status ?? data?.status);
  }

  // Réponse admin à une réclamation
  replyToReclamation(id: any, adminReply: string, status?: string): Observable<any> {
    const body: any = { AdminReply: adminReply };
    if (status) body.Status = status;
    return this.http.patch(`${this.reclamationsUrl}/${id}/reply`, JSON.stringify(body), buildHttpOptions());
  }

  private trackReclamationId(id: number): void {
    try {
      const raw = localStorage.getItem(this.myReclamationIdsKey);
      const ids: number[] = raw ? JSON.parse(raw) : [];
      if (!ids.includes(id)) {
        ids.push(id);
        localStorage.setItem(this.myReclamationIdsKey, JSON.stringify(ids));
      }
    } catch { /* ignore */ }
  }

  // Réclamations de l'utilisateur connecté
  getMyReclamationsData(params: any = {}): Observable<any[]> {
    return this.http.get<any>(this.myReclamationsUrl, {
      headers: authHeaderToken(),
      params: { per_page: 50, ...params }
    }).pipe(map((res: any) => res?.data ?? []));
  }

  /**
   * ⚠️ Version limitée : ne résout PAS les noms d'utilisateurs
   * (contrairement à la référence) faute de UsersService injecté
   * ici. Retourne les rapports mappés avec un placeholder
   * "Utilisateur #<id>" à la place du nom complet.
   * Si vous voulez la résolution complète des noms, injectez
   * UsersService dans ce constructeur et reprenez la logique
   * forkJoin de ReclamationsService.getMyTrackedReclamationsResolved().
   */
  getMyTrackedReclamationsResolved(): Observable<any[]> {
    return this.getMyReclamationsData().pipe(
      map((reports: any[]) => reports.map(r => this.mapReportToReclamation(r, null)))
    );
  }

  private mapReportToReclamation(r: any, user: any | null): any {
    const fullName = user
      ? ([user.FirstName, user.LastName].filter(Boolean).join(' ') || user.Username)
      : null;
    return {
      id: `REC-${r.IdReclamation ?? r.id}`,
      apiId: r.IdReclamation ?? r.id,
      user: fullName || `Utilisateur #${r.IdUser ?? '?'}`,
      email: user?.Email ?? '',
      role: user?.IdRole === 2 ? 'Vendeur' : 'Client',
      sujet: r.Subject ?? '',
      message: r.Description ?? '',
      date: r.CreatedAt ? new Date(r.CreatedAt).toLocaleDateString('fr-FR') : '',
      statut: r.Status || 'open',
      raw: r
    };
  }

}