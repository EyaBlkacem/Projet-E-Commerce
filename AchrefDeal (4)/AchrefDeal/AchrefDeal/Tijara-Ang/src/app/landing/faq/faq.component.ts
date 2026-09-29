import { Component } from '@angular/core';

@Component({
    selector: 'app-faq',
    templateUrl: './faq.component.html',
    standalone: false
})
export class FaqComponent {
    activeId: number | null = null;

    sections = [
        {
            category: 'Compte & Inscription', icon: 'ri-user-3-line', color: '#405189',
            faqs: [
                { q: 'Comment créer un compte Tijara ?', a: 'Cliquez sur "S\'inscrire" en haut de la page, remplissez le formulaire avec votre email et mot de passe, puis confirmez votre adresse email via le lien reçu.' },
                { q: 'Puis-je utiliser Tijara sans me connecter ?', a: 'Oui ! Vous pouvez parcourir toutes les annonces, deals et produits sans compte. La connexion est uniquement requise pour acheter, vendre ou contacter un vendeur.' },
                { q: 'Comment réinitialiser mon mot de passe ?', a: 'Sur la page de connexion, cliquez sur "Mot de passe oublié ?". Saisissez votre email et nous vous enverrons un lien de réinitialisation.' },
                { q: 'Quelle est la différence entre compte Standard et PRO ?', a: 'Le compte Standard est gratuit avec des fonctionnalités de base. Le compte PRO débloque des avantages : plus d\'annonces, boost prioritaire, magasin dédié et support premium.' },
            ]
        },
        {
            category: 'Acheter', icon: 'ri-shopping-cart-line', color: '#0ab39c',
            faqs: [
                { q: 'Comment passer commande ?', a: 'Trouvez l\'article souhaité, cliquez sur "Ajouter au panier" (connexion requise), puis suivez les étapes de paiement. Le vendeur sera notifié immédiatement.' },
                { q: 'Quels sont les modes de paiement acceptés ?', a: 'Tijara accepte le paiement à la livraison, le virement bancaire et les cartes bancaires tunisiennes. D\'autres méthodes seront ajoutées prochainement.' },
                { q: 'Comment suivre ma commande ?', a: 'Connectez-vous à votre espace, allez dans "Mes commandes". Vous verrez le statut en temps réel : confirmée, en cours de livraison, livrée.' },
                { q: 'Puis-je retourner un article ?', a: 'Oui. Sous 7 jours suivant la réception, vous pouvez initier un retour depuis votre espace client. Le remboursement est traité sous 5 jours ouvrables.' },
            ]
        },
        {
            category: 'Vendre', icon: 'ri-store-2-line', color: '#f7b84b',
            faqs: [
                { q: 'Comment devenir vendeur sur Tijara ?', a: 'Inscrivez-vous avec le type "Vendeur / Entreprise". Votre compte sera examiné par nos équipes sous 24h. Une fois approuvé, vous pouvez publier vos premières annonces.' },
                { q: 'Combien coûte la publication d\'une annonce ?', a: 'La publication est gratuite pour le compte Standard (dans la limite autorisée). Les publications supplémentaires ou le boost nécessitent des points ou un abonnement PRO.' },
                { q: 'Qu\'est-ce que le système de points ?', a: 'Les points (coins) vous permettent d\'accéder à des fonctionnalités avancées : booster une annonce, publier plus d\'articles, accéder à des vitrines premium.' },
                { q: 'Comment fonctionne la commission Tijara ?', a: 'Tijara prélève une commission de 5% sur chaque vente réalisée via la plateforme. Cette commission couvre les frais de traitement et le support client.' },
            ]
        },
        {
            category: 'Sécurité & Confiance', icon: 'ri-shield-check-line', color: '#f06548',
            faqs: [
                { q: 'Comment Tijara garantit-elle la sécurité des transactions ?', a: 'Toutes les transactions passent par notre système escrow sécurisé. Le paiement est conservé jusqu\'à confirmation de réception par l\'acheteur.' },
                { q: 'Que faire si je reçois un article non conforme ?', a: 'Ouvrez une réclamation dans votre espace client sous 48h. Notre équipe médiation intervient sous 24h et garantit un remboursement si nécessaire.' },
                { q: 'Comment signaler un vendeur frauduleux ?', a: 'Sur chaque profil vendeur, un bouton "Signaler" est disponible. Nos équipes examinent tous les signalements sous 2h ouvrables.' },
            ]
        },
    ];

    toggle(id: number): void { this.activeId = this.activeId === id ? null : id; }
}
