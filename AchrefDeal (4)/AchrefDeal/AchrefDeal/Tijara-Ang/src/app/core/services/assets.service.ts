import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AssetsService {
  private readonly apiUrl = environment.apiUrl || 'http://localhost:3000/api';

  get assetsBaseUrl(): string {
    return this.apiUrl.replace(/\/api\/?$/, '');
  }
}