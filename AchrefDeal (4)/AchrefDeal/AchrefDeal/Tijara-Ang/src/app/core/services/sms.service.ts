import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

/** Non référencé directement par un composant listé, gardé pour compat. */
@Injectable({ providedIn: 'root' })
export class SmsService extends BaseApiService {

  constructor(http: HttpClient) { super(http); }

  sendSms(recipient: string, message: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/sms-logs`, { recipient, message }, { headers: this.getHeaders() });
  }

  getSmsLogs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/sms-logs`, { headers: this.getHeaders() });
  }
}
