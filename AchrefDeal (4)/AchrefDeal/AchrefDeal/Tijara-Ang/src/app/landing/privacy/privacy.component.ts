import { Component } from '@angular/core';

@Component({
    selector: 'app-privacy',
    template: `
<section style="background:linear-gradient(135deg,#405189,#0ab39c);padding:70px 0 50px;color:#fff;text-align:center">
  <div class="container">
    <i class="ri-shield-keyhole-line fs-48 d-block mb-3" style="opacity:0.85"></i>
    <h1 class="fw-bold fs-32 mb-2">Politique de Confidentialité</h1>
    <p style="color:rgba(255,255,255,0.8)">Dernière mise à jour : Janvier 2025</p>
  </div>
</section>

<section style="padding:60px 0;background:#f8f9fc">
  <div class="container" style="max-width:820px">

    <!-- Intro -->
    <div class="bg-primary-subtle rounded-4 p-4 mb-4 d-flex gap-3">
      <i class="ri-shield-check-line fs-24 text-primary flex-shrink-0 mt-1"></i>
      <div class="fs-13 text-primary lh-lg">
        <strong>Votre vie privée est notre priorité.</strong> Tijara collecte uniquement les données nécessaires au fonctionnement du service et ne les vend jamais à des tiers.
      </div>
    </div>

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
      Pour exercer vos droits, contactez notre DPO à <strong>privacy&#64;tijara.tn</strong>
    </p>
  </div>
</section>
    `,
    standalone: false
})
export class PrivacyComponent {
    sections = [
        { num: '1', title: 'Données collectées', content: `Tijara collecte les données suivantes :<br><ul class="mt-2"><li><strong>Données d'identification :</strong> nom, prénom, adresse email, numéro de téléphone</li><li><strong>Données de connexion :</strong> adresse IP, type de navigateur, pages visitées</li><li><strong>Données de transaction :</strong> historique des achats et ventes</li><li><strong>Données de profil :</strong> photo, localisation, préférences</li></ul>` },
        { num: '2', title: 'Utilisation des données', content: `Vos données sont utilisées pour :<br><ul class="mt-2"><li>Créer et gérer votre compte</li><li>Traiter vos commandes et paiements</li><li>Personnaliser votre expérience (recommandations IA)</li><li>Vous envoyer des notifications importantes</li><li>Améliorer nos services et détecter les fraudes</li><li>Respecter nos obligations légales</li></ul>` },
        { num: '3', title: 'Partage des données', content: `Tijara ne vend jamais vos données personnelles. Nous partageons vos données uniquement avec :<br><ul class="mt-2"><li><strong>Les vendeurs :</strong> informations nécessaires à la livraison</li><li><strong>Les prestataires de paiement :</strong> pour traiter les transactions</li><li><strong>Les autorités :</strong> si requis par la loi tunisienne</li></ul>Tout partenaire traite vos données conformément à cette politique.` },
        { num: '4', title: 'Cookies et traceurs', content: `Tijara utilise des cookies pour :<br><ul class="mt-2"><li>Maintenir votre session de connexion</li><li>Mémoriser vos préférences</li><li>Analyser l'utilisation de la plateforme (données anonymisées)</li></ul>Vous pouvez gérer vos préférences de cookies depuis les paramètres de votre navigateur.` },
        { num: '5', title: 'Vos droits', content: `Conformément à la législation tunisienne sur la protection des données personnelles, vous disposez des droits suivants :<br><ul class="mt-2"><li><strong>Droit d'accès :</strong> obtenir une copie de vos données</li><li><strong>Droit de rectification :</strong> corriger vos données inexactes</li><li><strong>Droit à l'effacement :</strong> supprimer votre compte et vos données</li><li><strong>Droit d'opposition :</strong> refuser certains traitements</li><li><strong>Portabilité :</strong> exporter vos données</li></ul>Pour exercer ces droits, contactez <strong>privacy@tijara.tn</strong>.` },
        { num: '6', title: 'Sécurité des données', content: `Tijara met en œuvre des mesures techniques et organisationnelles pour protéger vos données :<br><ul class="mt-2"><li>Chiffrement SSL/TLS pour toutes les communications</li><li>Hachage des mots de passe (bcrypt)</li><li>Accès restreint aux données (principe du moindre privilège)</li><li>Audits de sécurité réguliers</li></ul>En cas de violation de données, vous serez notifié dans les 72 heures.` },
        { num: '7', title: 'Conservation des données', content: `Vos données sont conservées pendant toute la durée de votre compte actif, puis 3 ans après sa suppression pour des raisons légales. Les données de transactions sont conservées 10 ans conformément au code du commerce tunisien.` },
    ];
}
