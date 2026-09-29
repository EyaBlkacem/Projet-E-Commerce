import { Injectable } from '@angular/core';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { environment } from 'src/environments/environment';

// ✅ Service central de connexion WebSocket (Laravel Reverb, protocole
// Pusher). Remplace l'ancien chat.service.ts basé sur SignalR (techno
// .NET, incompatible avec Laravel) qui avait été désactivé avec un
// avertissement explicite dans le code (« migration Laravel Echo/Reverb
// pas encore faite — tâche séparée »). C'est cette tâche.
//
// Une seule connexion Echo pour toute l'app : NotificationsService et
// MessagesService s'abonnent chacun à leurs canaux via ce service, au
// lieu d'ouvrir chacun leur propre connexion WebSocket.
@Injectable({ providedIn: 'root' })
export class EchoService {

  private echo: Echo<any> | null = null;

  private getToken(): string {
    const raw = localStorage.getItem('currentUser');
    if (!raw) return '';
    try { return JSON.parse(raw).token || ''; } catch { return ''; }
  }

  private getCurrentUserId(): number | null {
    const raw = localStorage.getItem('currentUser');
    if (!raw) return null;
    try {
      const id = JSON.parse(raw).id;
      return id != null ? Number(id) : null;
    } catch { return null; }
  }

  // Doit être appelé une fois après le login (et à chaque démarrage d'app
  // si un token existe déjà en localStorage) — voir app.component.ts.
  connect(): void {
    if (this.echo) return; // déjà connecté, ne pas dupliquer

    const token = this.getToken();
    if (!token) return; // pas connecté à l'app -> pas de canal privé possible

    (window as any).Pusher = Pusher;

    // ⚠️ apiUrl ressemble à http://127.0.0.1:8080/api — on retire /api pour
    // obtenir le host, puis on pointe vers REVERB_PORT (8081, voir .env).
    const apiHost = environment.apiUrl.replace(/\/api\/?$/, '');
    const reverbHost = new URL(apiHost).hostname;

    this.echo = new Echo({
      broadcaster: 'reverb',
      key: 'tijara-key', // doit correspondre à REVERB_APP_KEY côté .env backend
      wsHost: reverbHost,
      wsPort: 8081,
      wssPort: 8081,
      forceTLS: false,
      enabledTransports: ['ws', 'wss'],
      // Authentifie les canaux privés (conversation.*, user.*) via l'API
      // Laravel existante (Broadcast::channel() dans routes/channels.php),
      // avec le même token Bearer que le reste de l'app.
      authEndpoint: `${apiHost}/broadcasting/auth`,
      auth: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });
  }

  disconnect(): void {
    this.echo?.disconnect();
    this.echo = null;
  }

  // Canal privé de l'utilisateur connecté (notifications) — voir
  // routes/channels.php: Broadcast::channel('user.{userId}', ...).
  privateUserChannel() {
    const myId = this.getCurrentUserId();
    if (!this.echo || !myId) return null;
    return this.echo.private(`user.${myId}`);
  }

  // Canal privé d'une conversation (messages) — voir routes/channels.php:
  // Broadcast::channel('conversation.{conversationId}', ...).
  privateConversationChannel(conversationId: number) {
    if (!this.echo) return null;
    return this.echo.private(`conversation.${conversationId}`);
  }

  leaveChannel(channelName: string): void {
    this.echo?.leave(channelName);
  }

  get isConnected(): boolean {
    return !!this.echo;
  }
}
