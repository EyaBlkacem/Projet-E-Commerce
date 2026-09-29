import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LayoutComponent } from './layouts/layout.component';
import { LayoutUsersComponent } from './layoutsUsers/layoutusers.component';
import { LayoutEntreprisesComponent } from './layoutsEntreprises/layoutEntreprises.component';

// Guards
import { AuthGuard }    from './core/guards/auth.guard';
import { AdminGuard }   from './core/guards/admin.guard';
import { UserOnlyGuard } from './core/guards/user-only.guard';
import { VendorGuard } from './core/guards/vendor.guard';
import { ShopGuard } from './core/guards/shop.guard';

const routes: Routes = [

  // â”€â”€â”€ Redirect racine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: '', redirectTo: '/landing', pathMatch: 'full' },

  // â”€â”€â”€ Auth (login, register, reset) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // GARDER â€” vider AccountModule et rÃ©Ã©crire avec tes formulaires Tijara
  {
    path: 'auth',
    loadChildren: () =>
      import('./account/account.module').then(m => m.AccountModule)
  },

  // â”€â”€â”€ Admin Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // GARDER â€” ajouter AdminGuard + AuthGuard
  {
    path: 'admin',
    component: LayoutComponent,
    canActivate: [AuthGuard, AdminGuard],
    loadChildren: () =>
      import('./components/componentsAdmin/componentsAdmin.module')
        .then(m => m.ComponentsAdminModule)
  },

  // â”€â”€â”€ Dashboard Utilisateur (Tijara : espace abonnÃ©) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ADAPTER â€” c'est ton espace utilisateur connectÃ©
  {
    path: 'users',
    component: LayoutUsersComponent,
    canActivate: [AuthGuard, UserOnlyGuard],
    loadChildren: () =>
      import('./components/componentsDashboard/componentDashUser/componentsDashUser.module')
        .then(m => m.ComponentsDashUserModule)
  },

  // â”€â”€â”€ Dashboard Entreprise (Tijara : espace annonceur/vendeur) â”€â”€â”€â”€â”€
  // ADAPTER â€” espace pour les annonceurs / boutiques
  {
    path: 'ent',
    component: LayoutEntreprisesComponent,
    canActivate: [AuthGuard, VendorGuard],
    loadChildren: () =>
      import('./components/componentsDashboard/componentsDashEntreprise/componentsDashEntreprise.module')
        .then(m => m.ComponentsDashEntrepriseModule)
  },

  // â”€â”€â”€ E-Commerce / Shop (Tijara) â€” rÃ©servÃ© aux clients (role='user') â”€â”€
  {
    path: 'shop',
    component: LayoutUsersComponent,
    canActivate: [ShopGuard],
    loadChildren: () =>
      import('./pages/ecommerce/ecommerce.module')
        .then(m => m.EcommerceModule)
  },

  // â”€â”€â”€ Landing / Site public (optionnel) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // GARDER si tu veux une page vitrine publique
  {
    path: 'landing',
    loadChildren: () =>
      import('./landing/landing.module').then(m => m.LandingModule)
  },

  // â”€â”€â”€ Boutique publique â€” sans auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    path: 'boutique',
    loadChildren: () =>
      import('./boutique/boutique.module').then(m => m.BoutiqueModule)
  },

  // â”€â”€â”€ Pages extras (404, maintenance) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // GARDER juste pour la page 404
  {
    path: 'pages',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./extraspages/extraspages.module').then(m => m.ExtraspagesModule)
  },

  // â”€â”€â”€ Wildcard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: '**', redirectTo: '/auth/login' }

];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }

