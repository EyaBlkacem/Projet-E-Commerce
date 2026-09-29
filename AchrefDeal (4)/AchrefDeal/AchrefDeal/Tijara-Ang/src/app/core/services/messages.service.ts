import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, map, switchMap, retryWhen, mergeMap, take, timer, throwError } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { EchoService } from './echo.service';

export interface ChatMessage {
  id: number;
  conversation_id: number;
  user_id: number;
  body: string;
  created_at: string;
  user?: {
    IdUser: number;
    FirstName: string;
    LastName?: string;
  };
  attachments?: any[];
}

/**
 * Service dédié à la messagerie — remplace l'ancien chat.service.ts
 * (SignalR .NET, désactivé). Vraies routes (ConversationController) :
 *   GET    /conversations
 *   POST   /conversations                              { user_ids: number[], name? }
 *   GET    /conversations/{id}/messages
 *   POST   /conversations/{id}/messages                 { body?, attachment? } (multipart si pièce jointe)
 *   DELETE /conversations/{id}/messages/{messageId}
 *
 * ⚠️ IMPORTANT : le backend attend le champ "body", pas "content"
 * (MessageController::store — déjà confirmé lors de la correction du
 * même bug dans TijaraApiService.sendMessage). Ne pas régresser.
 *
 * Utilisé par : messages-user, messages-ent, public-layout, topbaruser,
 * detail (landing), seller-details.
 */
@Injectable({ providedIn: 'root' })
export class MessagesService extends BaseApiService {

  constructor(http: HttpClient, private echoService: EchoService) { super(http); }

  get assetBaseUrl(): string {
    return this.apiUrl.replace(/\/api\/?$/, '');
  }

  // ─── Temps réel ───────────────────────────────────────────────────────
  private messageReceived$ = new Subject<ChatMessage>();
  get onMessageReceived(): Observable<ChatMessage> { return this.messageReceived$.asObservable(); }

  private currentChannelId: number | null = null;

  openConversationChannel(conversationId: number): void {
    this.leaveConversationChannel();
    const channel = this.echoService.privateConversationChannel(conversationId);
    if (!channel) return;
    this.currentChannelId = conversationId;
    channel.listen('.message.sent', (payload: ChatMessage) => {
      this.messageReceived$.next(payload);
    });
  }

  leaveConversationChannel(): void {
    if (this.currentChannelId != null) {
      this.echoService.leaveChannel(`private-conversation.${this.currentChannelId}`);
      this.currentChannelId = null;
    }
  }

  // ─── Conversations ──────────────────────────────────────────────────
  getConversations(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/conversations`, { headers: this.getHeaders() }).pipe(
      map((res: any) => (Array.isArray(res) ? res : res?.data ?? []).map((c: any) => this.normaliseConversation(c)))
    );
  }

  getConversationMessages(conversationId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/conversations/${conversationId}/messages`, { headers: this.getHeaders() });
  }

  startConversation(userIds: number[], name?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/conversations`, { user_ids: userIds, name }, { headers: this.getHeaders() });
  }

  startConversationWithMessage(data: { user_id: number; product_id?: number; product_name?: string; content: string }): Observable<any> {
    const prefix = data.product_name ? `[À propos de "${data.product_name}"]\n` : '';
    return this.startConversation([data.user_id]).pipe(
      switchMap((conv: any) => {
        const createdId = conv?.id ?? conv?.data?.id;
        return this.getConversations().pipe(
          map((list: any[]) => {
            const match = Array.isArray(list) ? list.find((c: any) => Number(c?.id) === Number(createdId)) : null;
            return match?.id ?? createdId;
          }),
          switchMap((confirmedId: number) =>
            this.sendMessage(confirmedId, prefix + data.content).pipe(
              retryWhen(errors =>
                errors.pipe(
                  mergeMap((error, i) => {
                    if (error?.status === 404 && i < 3) {
                      return timer(700 * (i + 1));
                    }
                    return throwError(() => error);
                  }),
                  take(3)
                )
              )
            )
          )
        );
      })
    );
  }

  // ─── Messages ─────────────────────────────────────────────────────────
  // FIX : le backend attend "body", pas "content" (voir avertissement en
  // haut du fichier).
  sendMessage(conversationId: number, content: string, file?: File): Observable<ChatMessage> {
    if (file) {
      const formData = new FormData();
      if (content) formData.append('body', content);
      formData.append('attachment', file, file.name);
      return this.http.post<ChatMessage>(`${this.apiUrl}/conversations/${conversationId}/messages`, formData, {
        headers: this.getAuthHeadersOnly()
      });
    }
    return this.http.post<ChatMessage>(`${this.apiUrl}/conversations/${conversationId}/messages`, { body: content }, { headers: this.getHeaders() });
  }

  deleteMessage(conversationId: number, messageId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/conversations/${conversationId}/messages/${messageId}`, { headers: this.getHeaders() });
  }

  attachmentUrl(filePath: string): string {
    return `${this.assetBaseUrl}/${filePath}`;
  }

  // ─── Utilitaire interne ────────────────────────────────────────────────
  private normaliseConversation(conversation: any): any {
    const currentUserId = this.getCurrentUserId();
    const users = Array.isArray(conversation?.users) ? conversation.users : [];
    const other = users.find((user: any) => Number(user?.IdUser ?? user?.id) !== Number(currentUserId)) ?? users[0];
    const otherName = [other?.FirstName, other?.LastName].filter(Boolean).join(' ') || other?.Username || other?.name || 'Utilisateur';
    const latest = conversation?.latest_message ?? conversation?.latestMessage;

    return {
      ...conversation,
      id: conversation?.id ?? conversation?.IdConversation,
      other_name: otherName,
      other_email: other?.Email ?? other?.email ?? '',
      vendor_name: otherName,
      vendor_email: other?.Email ?? other?.email ?? '',
      last_message: latest?.body ?? conversation?.last_message ?? '',
      unread_count: Number(conversation?.unread_count ?? 0),
    };
  }
}