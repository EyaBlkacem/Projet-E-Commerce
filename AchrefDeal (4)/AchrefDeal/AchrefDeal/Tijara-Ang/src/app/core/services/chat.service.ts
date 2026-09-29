import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as signalR from '@microsoft/signalr';
import { environment } from 'src/environments/environment';

export interface ChatMessage {
  id:          number;
  chat_id:     number;
  message:     string;
  sender_id:   number;
  sender_name: string;
  created_at:  string;
  is_mine:     boolean;
}

export interface Conversation {
  id:           number;
  other_id:     number;
  other_name:   string;
  sender_id:    number;
  receiver_id:  number;
  last_message: string;
  unread_count: number;
  created_at:   string;
}

export interface TypingEvent {
  user_id:   string;
  chat_id:   number;
  is_typing: boolean;
}

@Injectable({ providedIn: 'root' })
export class ChatService implements OnDestroy {

  // ⚠️ Pointaient vers l'ancien backend .NET (port 5000, mort). apiUrl corrigé
  // pour au moins utiliser le bon backend Laravel pour les appels REST
  // classiques (ex: /messages/conversations, à vérifier qu'ils existent
  // bien côté Laravel). hubUrl reste inutilisé : voir startConnection().
  private readonly apiUrl = environment.apiUrl;
  private readonly hubUrl = `${environment.apiUrl.replace(/\/api\/?$/, '')}/hubs/chat`;
  private hubConnection!: signalR.HubConnection;

  // ── Streams RxJS ──────────────────────────────────────────
  private messageReceived$   = new Subject<ChatMessage>();
  private typingEvent$       = new Subject<TypingEvent>();
  private newNotification$   = new Subject<any>();
  private newNotificationPush$ = new Subject<any>(); // ← NOUVEAU : pour les push SignalR
  private onlineUsers$       = new BehaviorSubject<string[]>([]);
  isConnected$               = new BehaviorSubject<boolean>(false);

  get onMessageReceived(): Observable<ChatMessage> { return this.messageReceived$.asObservable(); }
  get onTyping():          Observable<TypingEvent> { return this.typingEvent$.asObservable(); }
  get onNotification():   Observable<any>          { return this.newNotification$.asObservable(); }
  get onNewNotification(): Observable<any>         { return this.newNotificationPush$.asObservable(); } // ← NOUVEAU
  get onlineUsers():      Observable<string[]>     { return this.onlineUsers$.asObservable(); }

  constructor(private http: HttpClient) {}

  // ── Connexion SignalR ─────────────────────────────────────
  // ⚠️ DÉSACTIVÉ : SignalR est une techno .NET, Laravel ne parle pas ce
  // protocole (même avec Reverb installé — Reverb utilise le protocole
  // Pusher/WebSocket, pas SignalR). Tenter de se connecter échouait à
  // chaque chargement de page admin et ralentissait tout (voir la requête
  // "negotiate" qui échoue dans l'onglet Network). Une vraie remise en
  // route du chat temps réel nécessite de migrer ce service vers Laravel
  // Echo + Reverb côté client (tâche séparée, à voir avec l'encadrant) —
  // ce n'est pas un correctif rapide.
  async startConnection(): Promise<void> {
    console.warn('⚠️ Chat temps réel désactivé (migration Laravel Echo/Reverb pas encore faite).');
    return;
  }

  private async _startConnectionSignalR_DISABLED(): Promise<void> {
    const token = this.getToken();
    if (!token) {
      console.warn('⚠️ SignalR : aucun token, connexion ignorée');
      return;
    }

    if (this.isConnected()) return;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.getToken(),
        transport: signalR.HttpTransportType.WebSockets |
                   signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.registerHandlers();

    try {
      await this.hubConnection.start();
      this.isConnected$.next(true);
      console.log('✅ SignalR connecté');
    } catch (err) {
      console.error('❌ SignalR erreur:', err);
      this.isConnected$.next(false);
    }

    this.hubConnection.onreconnecting(() => { this.isConnected$.next(false); });
    this.hubConnection.onreconnected(() => { this.isConnected$.next(true); });
    this.hubConnection.onclose(() => { this.isConnected$.next(false); });
  }

  private registerHandlers(): void {
    // Nouveau message chat
    this.hubConnection.on('ReceiveMessage', (msg: ChatMessage) => {
      const myId = this.getMyId();
      msg.is_mine = msg.sender_id === myId;
      this.messageReceived$.next(msg);
    });

    // Indicateur "en train d'écrire"
    this.hubConnection.on('UserTyping', (event: TypingEvent) => {
      this.typingEvent$.next(event);
    });

    // Notification de message chat (badge)
    this.hubConnection.on('NewMessageNotification', (notif: any) => {
      this.newNotification$.next(notif);
    });

    // ← NOUVEAU : Notification push générale (commandes, vendeurs, etc.)
    // Correspond à : hub.Clients.Group("user_{id}").SendAsync("NewNotification", payload)
    this.hubConnection.on('NewNotification', (payload: any) => {
      this.newNotificationPush$.next(payload);
    });

    // Présence utilisateurs
    this.hubConnection.on('UserOnline', (userId: string) => {
      const current = this.onlineUsers$.value;
      if (!current.includes(userId))
        this.onlineUsers$.next([...current, userId]);
    });

    this.hubConnection.on('UserOffline', (userId: string) => {
      this.onlineUsers$.next(this.onlineUsers$.value.filter(id => id !== userId));
    });
  }

  // ── Actions SignalR ───────────────────────────────────────
  async sendMessage(chatId: number, message: string): Promise<void> {
    if (!this.isConnected()) return;
    try { await this.hubConnection.invoke('SendMessage', chatId, message); } catch {}
  }

  async joinChat(chatId: number): Promise<void> {
    if (!this.isConnected()) return;
    try { await this.hubConnection.invoke('JoinChat', chatId); } catch {}
  }

  async leaveChat(chatId: number): Promise<void> {
    if (!this.isConnected()) return;
    try { await this.hubConnection.invoke('LeaveChat', chatId); } catch {}
  }

  async setTyping(chatId: number, isTyping: boolean): Promise<void> {
    if (!this.isConnected()) return;
    try { await this.hubConnection.invoke('Typing', chatId, isTyping); } catch {}
  }

  // ── HTTP REST ─────────────────────────────────────────────
  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(
      `${this.apiUrl}/messages/conversations`,
      { headers: this.getHeaders() }
    ).pipe(catchError(() => of([])));
  }

  getMessages(chatId: number): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/messages/conversations/${chatId}`,
      { headers: this.getHeaders() }
    ).pipe(catchError(() => of({ messages: [] })));
  }

  startChat(receiverId: number, message: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/messages/start`,
      { vendor_id: receiverId, content: message },
      { headers: this.getHeaders() }
    ).pipe(catchError(() => of(null)));
  }

  // ── Utilitaires ───────────────────────────────────────────
  private getToken(): string {
    try {
      const u = localStorage.getItem('currentUser');
      return u ? JSON.parse(u).token || '' : '';
    } catch { return ''; }
  }

  getMyId(): number {
    try {
      const u = localStorage.getItem('currentUser');
      return u ? +JSON.parse(u).id || 0 : 0;
    } catch { return 0; }
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    });
  }

  isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers$.value.includes(userId);
  }

  async stopConnection(): Promise<void> {
    if (this.hubConnection &&
        this.hubConnection.state !== signalR.HubConnectionState.Disconnected) {
      try {
        await this.hubConnection.stop();
        this.isConnected$.next(false);
      } catch {}
    }
  }

  ngOnDestroy(): void { this.stopConnection(); }
}