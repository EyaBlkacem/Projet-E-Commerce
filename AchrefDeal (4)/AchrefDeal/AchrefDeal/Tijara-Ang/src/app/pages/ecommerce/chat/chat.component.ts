import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild
} from '@angular/core';

import { Subscription } from 'rxjs';

import {
  MessagesService,
  ChatMessage
} from '../../../core/services/messages.service';

interface ConversationItem {
  id: number;
  other_name: string;
  other_email: string;
  vendor_name: string;
  vendor_email: string;
  last_message: string;
  unread_count: number;
  users?: any[];
  latest_message?: any;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  standalone: false
})
export class ChatComponent implements OnInit, OnDestroy {

  breadCrumbItems = [
    { label: 'Boutique', link: '/shop/products' },
    { label: 'Chat Vendeurs', active: true }
  ];

  currentUser: any = {};

  conversations: ConversationItem[] = [];

  messages: ChatMessage[] = [];

  activeConversation: ConversationItem | null = null;

  newMessage = '';

  loadingConversations = false;
  loadingMessages = false;
  sendingMessage = false;

  private subscriptions = new Subscription();

  @ViewChild('messagesContainer')
  messagesContainer!: ElementRef;

  constructor(
    private messagesService: MessagesService
  ) {}

  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {
      console.log('🔥🔥🔥 VERSION TEST 123 🔥🔥🔥');

    // Utilisateur connecté
    const storedUser = localStorage.getItem('currentUser');

    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
      } catch {
        this.currentUser = {};
      }
    }

    // Charger les conversations depuis Laravel
    this.loadConversations();

    // Écouter les messages reçus en temps réel
    this.subscribeToMessages();
  }

  // ============================================================
  // CONVERSATIONS
  // ============================================================

  loadConversations(): void {

    this.loadingConversations = true;

    this.subscriptions.add(
      this.messagesService.getConversations().subscribe({

        next: (conversations: any[]) => {

          console.log('✅ Conversations reçues :', conversations);

          this.conversations = conversations as ConversationItem[];

          this.loadingConversations = false;

          // Ouvrir automatiquement la première conversation
          if (
            this.conversations.length > 0 &&
            !this.activeConversation
          ) {
            this.selectConversation(this.conversations[0]);
          }
        },

        error: (error) => {

          console.error(
            '❌ Erreur chargement conversations :',
            error
          );

          this.loadingConversations = false;
          this.conversations = [];
        }
      })
    );
  }

  // ============================================================
  // SÉLECTION D'UNE CONVERSATION
  // ============================================================

  selectConversation(conversation: ConversationItem): void {

    if (!conversation || !conversation.id) {
      return;
    }

    this.activeConversation = conversation;

    console.log(
      '📂 Conversation sélectionnée :',
      conversation
    );

    // Charger les messages de cette conversation
    this.loadMessages(conversation.id);

    // Ouvrir le canal temps réel
    this.messagesService.openConversationChannel(
      conversation.id
    );
  }

  // ============================================================
  // CHARGER LES MESSAGES
  // ============================================================

  loadMessages(conversationId: number): void {

    this.loadingMessages = true;

    this.messages = [];

    this.subscriptions.add(
      this.messagesService
        .getConversationMessages(conversationId)
        .subscribe({

          next: (messages: ChatMessage[]) => {

            console.log(
              '✅ Messages reçus :',
              messages
            );

            this.messages = Array.isArray(messages)
              ? messages
              : [];

            this.loadingMessages = false;

            // Aller en bas après affichage
            setTimeout(() => {
              this.scrollBottom();
            }, 100);
          },

          error: (error) => {

            console.error(
              '❌ Erreur chargement messages :',
              error
            );

            this.messages = [];
            this.loadingMessages = false;
          }
        })
    );
  }

  // ============================================================
  // TEMPS RÉEL
  // ============================================================

  subscribeToMessages(): void {

    this.subscriptions.add(

      this.messagesService
        .onMessageReceived
        .subscribe((message: ChatMessage) => {

          console.log(
            '📨 Nouveau message temps réel :',
            message
          );

          // Vérifier que le message appartient
          // à la conversation actuellement ouverte
          if (
            this.activeConversation &&
            Number(message.conversation_id) ===
              Number(this.activeConversation.id)
          ) {

            // Éviter un éventuel doublon
            const alreadyExists = this.messages.some(
              m => Number(m.id) === Number(message.id)
            );

            if (!alreadyExists) {

              this.messages.push(message);

              // Mettre à jour l'aperçu
              this.activeConversation.last_message =
                message.body || '';

              setTimeout(() => {
                this.scrollBottom();
              }, 50);
            }
          }

          // Mettre également à jour l'aperçu
          // dans la liste des conversations
          const conversation = this.conversations.find(
            c =>
              Number(c.id) ===
              Number(message.conversation_id)
          );

          if (conversation) {

            conversation.last_message =
              message.body || '';
          }
        })
    );
  }

  // ============================================================
  // ENVOYER UN MESSAGE
  // ============================================================

  sendMessage(): void {

    const content = this.newMessage.trim();

    if (
      !content ||
      !this.activeConversation ||
      this.sendingMessage
    ) {
      return;
    }

    const conversationId =
      this.activeConversation.id;

    this.sendingMessage = true;

    this.messagesService
      .sendMessage(
        conversationId,
        content
      )
      .subscribe({

        next: (message: ChatMessage) => {

          console.log(
            '✅ Message envoyé :',
            message
          );

          // Le broadcast utilise toOthers(),
          // donc le message de l'expéditeur n'arrive
          // pas une deuxième fois via Echo.
          this.messages.push(message);

          // Mettre à jour l'aperçu
          if (this.activeConversation) {
            this.activeConversation.last_message =
              message.body || content;
          }

          const conversation =
            this.conversations.find(
              c =>
                Number(c.id) ===
                Number(conversationId)
            );

          if (conversation) {
            conversation.last_message =
              message.body || content;
          }

          this.newMessage = '';

          this.sendingMessage = false;

          setTimeout(() => {
            this.scrollBottom();
          }, 50);
        },

        error: (error) => {

          console.error(
            '❌ Erreur envoi message :',
            error
          );

          this.sendingMessage = false;
        }
      });
  }

  // ============================================================
  // ENTER
  // ============================================================

  onEnter(event: Event): void {

    event.preventDefault();

    this.sendMessage();
  }

  // ============================================================
  // SCROLL
  // ============================================================

  scrollBottom(): void {

    if (!this.messagesContainer) {
      return;
    }

    const element =
      this.messagesContainer.nativeElement;

    element.scrollTop = element.scrollHeight;
  }

  // ============================================================
  // UTILISATEUR COURANT
  // ============================================================

  get currentUserId(): number {

    const id =
      this.currentUser?.IdUser ??
      this.currentUser?.id ??
      0;

    return Number(id);
  }

  // ============================================================
  // VÉRIFIER SI LE MESSAGE EST À MOI
  // ============================================================

  isMyMessage(message: ChatMessage): boolean {

    return Number(message.user_id) ===
      Number(this.currentUserId);
  }

  // ============================================================
  // NOM DE L'UTILISATEUR COURANT
  // ============================================================

  get currentUserFirstName(): string {

    return (
      this.currentUser?.FirstName ??
      this.currentUser?.firstName ??
      this.currentUser?.Username ??
      this.currentUser?.username ??
      'Vous'
    );
  }

  // ============================================================
  // INITIAL
  // ============================================================

  get currentUserInitial(): string {

    return this.currentUserFirstName
      .charAt(0)
      .toUpperCase();
  }

  // ============================================================
  // NOM DU VENDEUR
  // ============================================================

  get activeVendorName(): string {

    if (!this.activeConversation) {
      return 'Vendeur';
    }

    return (
      this.activeConversation.other_name ||
      this.activeConversation.vendor_name ||
      'Vendeur'
    );
  }

  // ============================================================
  // INITIAL DU VENDEUR
  // ============================================================

  get activeVendorInitial(): string {

    return this.activeVendorName
      .charAt(0)
      .toUpperCase();
  }

  // ============================================================
  // DERNIER MESSAGE
  // ============================================================

  getLastMessage(
    conversation: ConversationItem
  ): string {

    if (!conversation) {
      return '';
    }

    return conversation.last_message || 'Aucun message';
  }

  // ============================================================
  // DESTROY
  // ============================================================

  ngOnDestroy(): void {

    this.messagesService
      .leaveConversationChannel();

    this.subscriptions.unsubscribe();
  }
}