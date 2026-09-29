import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { IndexComponent }         from './index/index.component';
import { PublicLayoutComponent }  from './public-layout/public-layout.component';
import { ListingComponent }       from './listing/listing.component';
import { PublicDetailComponent }  from './detail/detail.component';
import { AboutComponent }         from './about/about.component';
import { ContactComponent }       from './contact/contact.component';
import { FaqComponent }           from './faq/faq.component';
import { TermsComponent }         from './terms/terms.component';
import { PrivacyComponent }       from './privacy/privacy.component';

const routes: Routes = [
  // ── Home (landing page existante) ────────────────────────
  { path: '', component: IndexComponent },

  // ── Pages publiques avec layout partagé ──────────────────
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      // Listings
      { path: 'annonces',          component: ListingComponent, data: { listingType: 'annonces' } },
      { path: 'annonces/:id',      component: PublicDetailComponent, data: { listingType: 'annonces' } },
      { path: 'deals',             component: ListingComponent, data: { listingType: 'deals'    } },
      { path: 'deals/:id',         component: PublicDetailComponent, data: { listingType: 'deals'    } },
      { path: 'produits',          component: ListingComponent, data: { listingType: 'produits' } },
      { path: 'produits/:id',      component: PublicDetailComponent, data: { listingType: 'produits' } },
      { path: 'prizes',            component: ListingComponent, data: { listingType: 'prizes'   } },
      { path: 'prizes/:id',        component: PublicDetailComponent, data: { listingType: 'prizes'   } },
      { path: 'vendeurs',          component: ListingComponent, data: { listingType: 'vendeurs' } },
      // Pages statiques
      { path: 'about',             component: AboutComponent   },
      { path: 'contact',           component: ContactComponent },
      { path: 'faq',               component: FaqComponent     },
      { path: 'cgu',               component: TermsComponent   },
      { path: 'privacy',           component: PrivacyComponent },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LandingRoutingModule {}