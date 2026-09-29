import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import {
  NgbToastModule, NgbProgressbarModule, NgbDropdownModule, NgbTooltipModule
} from '@ng-bootstrap/ng-bootstrap';
import { NgApexchartsModule } from 'ng-apexcharts';
import { SharedModule } from 'src/app/shared/shared.module';

import { DashboardAdminComponent }    from './dashboard/dashboard-admin.component';
import { UsersAdminComponent }        from './users-admin/users-admin.component';
import { CategoriesAdminComponent }   from './categories-admin/categories-admin.component';
import { FeaturesAdminComponent }     from './features-admin/features-admin.component';
import { OrdersAdminComponent }       from './orders-admin/orders-admin.component';
import { VendorsAdminComponent }      from './vendors-admin/vendors-admin.component';
import { AnnoncesAdminComponent }     from './annonces-admin/annonces-admin.component';
import { AnnonceDetailAdminComponent } from './annonce-detail-admin/annonce-detail-admin.component';
import { ProductsAdminComponent }     from './products-admin/products-admin.component';
import { ProductDetailAdminComponent } from './product-detail-admin/product-detail-admin.component';
import { VendorDetailAdminComponent } from './vendor-detail-admin/vendor-detail-admin.component';
import { UserDetailAdminComponent }   from './user-detail-admin/user-detail-admin.component';
import { IaDashboardComponent }       from './ia-dashboard/ia-dashboard.component';
import { SettingsAdminComponent }     from './settings-admin/settings-admin.component';
import { AdminCrudComponent }         from './crud-generic/admin-crud.component';
import { BrandsAdminComponent }       from './brands-admin/brands-admin.component';
import { CountriesAdminComponent }    from './countries-admin/countries-admin.component';
import { CitiesAdminComponent }       from './cities-admin/cities-admin.component';
import { CausesAdminComponent }       from './causes-admin/causes-admin.component';
import { CouponsAdminComponent }      from './coupons-admin/coupons-admin.component';
import { PrizesAdminComponent }       from './prizes-admin/prizes-admin.component';
import { BoostPacksAdminComponent }   from './boost-packs-admin/boost-packs-admin.component';
import { WinnersAdminComponent }      from './winners-admin/winners-admin.component';
import { DealsAdminComponent }        from './deals-admin/deals-admin.component';
import { DealDetailAdminComponent }   from './deal-detail-admin/deal-detail-admin.component';
import { PermissionsAdminComponent }  from './permissions-admin/permissions-admin.component';
import { TransportsAdminComponent }   from './transports-admin/transports-admin.component';
import { DeliveriesAdminComponent }   from './deliveries-admin/deliveries-admin.component';
import { PaymentsAdminComponent }     from './payments-admin/payments-admin.component';
import { ReportsAdminComponent }      from './reports-admin/reports-admin.component';
import { InvoicesAdminComponent }     from './invoices-admin/invoices-admin.component';
import { VerificationAdminComponent } from './verification-admin/verification-admin.component';
import { PremiumAdminComponent }      from './premium-admin/premium-admin.component';
import { BoostsAdminComponent }       from './boosts-admin/boosts-admin.component';
import { WalletsAdminComponent }      from './wallets-admin/wallets-admin.component';

const routes: Routes = [
  { path: '',                   redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard',          component: DashboardAdminComponent },
  { path: 'users',              component: UsersAdminComponent },
  { path: 'user-detail/:id',    component: UserDetailAdminComponent },
  { path: 'categories',         component: CategoriesAdminComponent },
  { path: 'features',           component: FeaturesAdminComponent },
  { path: 'orders',             component: OrdersAdminComponent },
  { path: 'vendors',            component: VendorsAdminComponent },
  { path: 'vendor-detail/:id',  component: VendorDetailAdminComponent },
  { path: 'annonces',           component: AnnoncesAdminComponent },
  { path: 'annonce-detail/:id', component: AnnonceDetailAdminComponent },
  { path: 'products',           component: ProductsAdminComponent },
  { path: 'product-detail/:id', component: ProductDetailAdminComponent },
  { path: 'ia',                 component: IaDashboardComponent },
  { path: 'settings',           component: SettingsAdminComponent },
  { path: 'brands',             component: BrandsAdminComponent },
  { path: 'countries',          component: CountriesAdminComponent },
  { path: 'cities',             component: CitiesAdminComponent },
  { path: 'causes',             component: CausesAdminComponent },
  { path: 'coupons',            component: CouponsAdminComponent },
  { path: 'prizes',             component: PrizesAdminComponent },
  { path: 'boost-packs',        component: BoostPacksAdminComponent },
  { path: 'winners',            component: WinnersAdminComponent    },
  { path: 'deals',              component: DealsAdminComponent      },
  { path: 'deal-detail/:id',    component: DealDetailAdminComponent },
  { path: 'permissions',        component: PermissionsAdminComponent },
  { path: 'transports',         component: TransportsAdminComponent  },
  { path: 'deliveries',         component: DeliveriesAdminComponent  },
  { path: 'payments',           component: PaymentsAdminComponent    },
  { path: 'reports',            component: ReportsAdminComponent     },
  { path: 'invoices',           component: InvoicesAdminComponent    },
  { path: 'verifications',      component: VerificationAdminComponent },
  { path: 'premium',            component: PremiumAdminComponent      },
  { path: 'boosts',             component: BoostsAdminComponent       },
  { path: 'wallets',            component: WalletsAdminComponent      },
  {
    path: 'reclamations',
    loadChildren: () => import('./reclamations/reclamations.module').then(m => m.ReclamationsModule),
  },
];

@NgModule({
  declarations: [
    DashboardAdminComponent,
    UsersAdminComponent,
    CategoriesAdminComponent,
    FeaturesAdminComponent,
    OrdersAdminComponent,
    VendorsAdminComponent,
    AnnoncesAdminComponent,
    AnnonceDetailAdminComponent,
    ProductsAdminComponent,
    ProductDetailAdminComponent,
    VendorDetailAdminComponent,
    UserDetailAdminComponent,
    IaDashboardComponent,
    SettingsAdminComponent,
    AdminCrudComponent,
    BrandsAdminComponent,
    CountriesAdminComponent,
    CitiesAdminComponent,
    CausesAdminComponent,
    CouponsAdminComponent,
    PrizesAdminComponent,
    BoostPacksAdminComponent,
    WinnersAdminComponent,
    DealsAdminComponent,
    DealDetailAdminComponent,
    PermissionsAdminComponent,
    TransportsAdminComponent,
    DeliveriesAdminComponent,
    PaymentsAdminComponent,
    ReportsAdminComponent,
    InvoicesAdminComponent,
    VerificationAdminComponent,
    PremiumAdminComponent,
    BoostsAdminComponent,
    WalletsAdminComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbToastModule,
    NgbProgressbarModule,
    NgbDropdownModule,
    NgbTooltipModule,
    NgApexchartsModule,
    SharedModule,
    RouterModule.forChild(routes),
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ComponentsAdminModule {}