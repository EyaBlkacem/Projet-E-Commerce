import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';

import { SharedModule }      from 'src/app/shared/shared.module';
import { TranslateModule }   from '@ngx-translate/core';

import { DashboardUserComponent }  from './dashboard/dashboard-user.component';
// 🔧 SUPPRIMÉ — import OrdersUserComponent (fusionné dans EcommerceModule
// sous /shop/orders, voir orders.component.ts). Route 'orders' ci-dessous
// redirige désormais vers ce même composant unique.
import { ProfileUserComponent }    from './profile/profile-user.component';
import { AnnoncesUserComponent }   from './annonces/annonces-user.component';
import { MessagesUserComponent }   from './messages/messages-user.component';
import { WishlistUserComponent }   from './wishlist/wishlist-user.component';
import { MyProductsUserComponent } from './my-products/my-products-user.component';
import { MyReviewsUserComponent }  from './my-reviews/my-reviews-user.component';
import { MyInvoicesUserComponent } from './my-invoices/my-invoices-user.component';
import { MyDeliveriesUserComponent } from './my-deliveries/my-deliveries-user.component';
import { PaymentUserComponent }    from './payment/payment-user.component';
import { WalletUserComponent }     from './wallet/wallet-user.component';
import { CouponsUserComponent }    from './coupons/coupons-user.component';
import { PrizesUserComponent }     from './prizes/prizes-user.component';
import { PremiumUserComponent }    from './premium/premium-user.component';

const routes: Routes = [
  { path: '',             redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard',   component: DashboardUserComponent },
  // 🔧 CORRIGÉ — l'ancien composant OrdersUserComponent (design cartes+
  // timeline) est fusionné avec l'ancien orders.component.ts (module
  // ecommerce) dans un seul composant, sous /shop/orders. On garde ce
  // lien 'orders' pour ne pas casser un menu/bookmark existant, mais il
  // redirige désormais vers la page unique. Le '/' en tête du chemin
  // fait qu'Angular traite ceci comme une redirection ABSOLUE, hors du
  // module courant.
  { path: 'orders',      redirectTo: '/shop/orders', pathMatch: 'full' },
  { path: 'profile',     component: ProfileUserComponent },
  { path: 'annonces',    component: AnnoncesUserComponent },
  { path: 'messages',    component: MessagesUserComponent },
  { path: 'wishlist',    component: WishlistUserComponent },
  { path: 'my-products',   component: MyProductsUserComponent },
  { path: 'my-reviews',    component: MyReviewsUserComponent },
  { path: 'my-invoices',   component: MyInvoicesUserComponent },
  { path: 'my-deliveries', component: MyDeliveriesUserComponent },
  { path: 'my-wallet',     component: WalletUserComponent },
  { path: 'payment',       component: PaymentUserComponent },
  { path: 'coupons',       component: CouponsUserComponent },
  { path: 'prizes',        component: PrizesUserComponent  },
  { path: 'premium',       component: PremiumUserComponent },
  {
    path: 'reclamations',
    loadChildren: () =>
      import('../commonComponentsDash/reclamations/reclamations.module')
        .then(m => m.ReclamationsModule),
  },
];

@NgModule({
  declarations: [
    DashboardUserComponent,
    // 🔧 SUPPRIMÉ — OrdersUserComponent (voir commentaire routes ci-dessus)
    ProfileUserComponent,
    AnnoncesUserComponent,
    MessagesUserComponent,
    WishlistUserComponent,
    MyProductsUserComponent,
    MyReviewsUserComponent,
    MyInvoicesUserComponent,
    MyDeliveriesUserComponent,
    WalletUserComponent,
    PaymentUserComponent,
    CouponsUserComponent,
    PrizesUserComponent,
    PremiumUserComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    NgbDropdownModule,
    SharedModule,
    TranslateModule,
    CKEditorModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ComponentsDashUserModule {}