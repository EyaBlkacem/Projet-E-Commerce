import { Component } from '@angular/core';

@Component({
    selector: 'app-about',
    templateUrl: './about.component.html',
    standalone: false
})
export class AboutComponent {
    stats = [
        { value: '12 500+', label: 'Annonces publiées',  icon: 'ri-megaphone-line',     color: '#405189' },
        { value: '3 200+',  label: 'Vendeurs actifs',    icon: 'ri-store-2-line',        color: '#0ab39c' },
        { value: '45 000+', label: 'Acheteurs inscrits', icon: 'ri-group-line',          color: '#f7b84b' },
        { value: '98%',     label: 'Satisfaction client',icon: 'ri-star-smile-line',     color: '#f06548' },
    ];

    values = [
        { icon: 'ri-shield-check-line',  title: 'Confiance',      desc: 'Chaque vendeur est vérifié. Chaque transaction est sécurisée. Votre sécurité est notre priorité absolue.' },
        { icon: 'ri-lightbulb-line',     title: 'Innovation',     desc: 'Nous intégrons l\'intelligence artificielle pour vous offrir des recommandations personnalisées et intelligentes.' },
        { icon: 'ri-community-line',     title: 'Communauté',     desc: 'Tijara rassemble vendeurs et acheteurs tunisiens autour d\'une marketplace solidaire et locale.' },
        { icon: 'ri-customer-service-2-line', title: 'Support',   desc: 'Notre équipe est disponible 7j/7 pour répondre à vos questions et résoudre vos problèmes.' },
    ];

    team = [
        { name: 'Rami B.',    role: 'CEO & Co-fondateur',  avatar: 'R', color: '#405189', linkedin: '#' },
        { name: 'Sirine K.',  role: 'CTO',                 avatar: 'S', color: '#0ab39c', linkedin: '#' },
        { name: 'Amine T.',   role: 'Head of Marketing',   avatar: 'A', color: '#f7b84b', linkedin: '#' },
        { name: 'Mariem H.',  role: 'Product Designer',    avatar: 'M', color: '#f06548', linkedin: '#' },
    ];
}
