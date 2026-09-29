import { Component } from '@angular/core';

@Component({
    selector: 'app-terms',
    template: `
<section style="background:linear-gradient(135deg,#405189,#0ab39c);padding:70px 0 50px;color:#fff;text-align:center">
  <div class="container">
    <i class="ri-file-text-line fs-48 d-block mb-3" style="opacity:0.85"></i>
    <h1 class="fw-bold fs-32 mb-2">Conditions Générales d'Utilisation</h1>
    <p style="color:rgba(255,255,255,0.8)">Dernière mise à jour : Janvier 2025</p>
  </div>
</section>

<section style="padding:60px 0;background:#f8f9fc">
  <div class="container" style="max-width:820px">
    @for (s of sections; track s.title) {
      <div class="bg-white rounded-4 shadow-sm p-4 p-lg-5 mb-4">
        <h4 class="fw-bold mb-3 d-flex align-items-center gap-2">
          <span class="badge rounded-circle d-flex align-items-center justify-content-center fw-bold"
                style="width:34px;height:34px;background:linear-gradient(135deg,#405189,#0ab39c);font-size:0.85rem">{{ s.num }}</span>
          {{ s.title }}
        </h4>
        <div class="text-muted lh-lg fs-14" [innerHTML]="s.content"></div>
      </div>
    }
    <p class="text-muted text-center fs-12 mt-4">
      Pour toute question relative aux présentes CGU, contactez-nous à <strong>legal&#64;tijara.tn</strong>
    </p>
  </div>
</section>
    `,
    standalone: false
})
export class TermsComponent {
    sections = [
        { num: '1', title: 'Acceptation des conditions', content: `En accédant à la plateforme Tijara et en l'utilisant, vous acceptez d'être lié par les présentes Conditions Générales d'Utilisation (CGU). Si vous n'acceptez pas ces conditions dans leur intégralité, veuillez ne pas utiliser nos services.<br><br>Tijara se réserve le droit de modifier ces CGU à tout moment. Les modifications entrent en vigueur dès leur publication sur la plateforme.` },
        { num: '2', title: 'Description du service', content: `Tijara est une marketplace en ligne permettant la mise en relation entre acheteurs et vendeurs en Tunisie. La plateforme offre :<br><ul class="mt-2"><li>La publication d'annonces, deals et produits</li><li>Un système de messagerie intégré</li><li>Des outils de gestion pour les vendeurs</li><li>Un système de paiement sécurisé</li></ul>Tijara agit en qualité d'intermédiaire technique et ne peut être tenu responsable des transactions entre utilisateurs.` },
        { num: '3', title: 'Inscription et compte utilisateur', content: `L'accès à certaines fonctionnalités nécessite la création d'un compte. Vous vous engagez à :<br><ul class="mt-2"><li>Fournir des informations exactes et complètes</li><li>Maintenir la confidentialité de vos identifiants</li><li>Notifier immédiatement Tijara de toute utilisation non autorisée</li><li>Ne pas créer plus d'un compte par personne</li></ul>Tijara se réserve le droit de suspendre ou supprimer tout compte ne respectant pas ces règles.` },
        { num: '4', title: 'Règles de publication', content: `Tout contenu publié sur Tijara doit respecter les règles suivantes :<br><ul class="mt-2"><li>Être légal et conforme à la législation tunisienne</li><li>Ne pas induire l'acheteur en erreur (fausses descriptions, photos trompeuses)</li><li>Ne pas contenir de contenu offensant, diffamatoire ou illégal</li><li>Respecter les droits de propriété intellectuelle</li></ul>Tijara se réserve le droit de supprimer tout contenu non conforme sans préavis.` },
        { num: '5', title: 'Commissions et paiements', content: `Tijara prélève une commission de 5% sur chaque transaction réalisée via la plateforme. Le paiement est sécurisé par un système d'escrow :<br><ul class="mt-2"><li>Le montant est retenu jusqu'à confirmation de livraison</li><li>Les remboursements sont traités sous 5 jours ouvrables</li><li>Les virements vendeurs sont effectués chaque semaine</li></ul>` },
        { num: '6', title: 'Responsabilité et garanties', content: `Tijara s'engage à maintenir la plateforme disponible 24h/24, 7j/7, sous réserve de maintenances planifiées. Cependant, Tijara ne peut garantir l'absence totale d'interruptions.<br><br>Tijara n'est pas responsable des dommages directs ou indirects résultant de l'utilisation de la plateforme ou des transactions entre utilisateurs.` },
        { num: '7', title: 'Résiliation', content: `Vous pouvez supprimer votre compte à tout moment depuis les paramètres de votre profil. Tijara se réserve le droit de résilier votre compte en cas de violation des présentes CGU, sans préavis ni remboursement des crédits non utilisés.` },
        { num: '8', title: 'Droit applicable', content: `Les présentes CGU sont régies par le droit tunisien. Tout litige relatif à leur interprétation ou exécution sera soumis à la compétence exclusive des tribunaux de Tunis, Tunisie.` },
    ];
}
