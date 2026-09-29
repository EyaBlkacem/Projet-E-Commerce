import { Component, OnInit } from '@angular/core';
import { FollowsService } from 'src/app/core/services/follows.service';

@Component({
  selector: 'app-followers-ent',
  templateUrl: './followers-ent.component.html',
  standalone: false
})
export class FollowersEntComponent implements OnInit {

  breadCrumbItems = [
    { label: 'Vendeur' },
    { label: 'Mes Abonnés', active: true }
  ];

  total     = 0;
  followers: any[] = [];
  loading   = true;
  search    = '';

  constructor(private followsService: FollowsService) {}

  ngOnInit(): void {
    this.load();
  }

  // ✅ CORRIGÉ — getMyFollowers() renvoie le paginator Laravel brut
  // ({ data, total, per_page, ... }), pas { total, followers: [...] } comme
  // supposé ici. De plus, UserFollows n'a aucune colonne de profil (nom,
  // email, téléphone, photo) : ces infos doivent être résolues via Users.
  // getMyFollowersResolved() fait déjà tout ce travail côté service et
  // renvoie directement { total, followers } dans la forme attendue par
  // ce composant et son template.
  load(): void {
    this.loading = true;
    this.followsService.getMyFollowersResolved().subscribe({
      next: (res: any) => {
        this.total     = res.total;
        this.followers = res.followers;
        this.loading   = false;
      },
      error: () => { this.loading = false; }
    });
  }

  get filtered(): any[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.followers;
    return this.followers.filter(f =>
      (f.full_name  || '').toLowerCase().includes(q) ||
      (f.username   || '').toLowerCase().includes(q) ||
      (f.email      || '').toLowerCase().includes(q)
    );
  }

  initials(f: any): string {
    const name = f.full_name || f.username || '?';
    return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  }
}