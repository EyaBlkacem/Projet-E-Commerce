import { NgModule }        from '@angular/core';
import { CommonModule }    from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule }    from '@angular/router';

import { NgbCarouselModule, NgbTooltipModule, NgbCollapseModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ScrollToModule }  from '@nicky-lenaers/ngx-scroll-to';
import { SharedModule }    from '../shared/shared.module';

import { LandingRoutingModule }   from './landing-routing.module';

// ── Components ──────────────────────────────────────────────────
import { IndexComponent }         from './index/index.component';
import { PublicLayoutComponent }  from './public-layout/public-layout.component';
import { ListingComponent }       from './listing/listing.component';
import { PublicDetailComponent }  from './detail/detail.component';
import { AboutComponent }         from './about/about.component';
import { ContactComponent }       from './contact/contact.component';
import { FaqComponent }           from './faq/faq.component';
import { TermsComponent }         from './terms/terms.component';
import { PrivacyComponent }       from './privacy/privacy.component';

@NgModule({
  declarations: [
    IndexComponent,
    PublicLayoutComponent,
    ListingComponent,
    PublicDetailComponent,
    AboutComponent,
    ContactComponent,
    FaqComponent,
    TermsComponent,
    PrivacyComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgbCarouselModule,
    NgbTooltipModule,
    NgbDropdownModule,
    NgbCollapseModule,
    LandingRoutingModule,
    SharedModule,
    ScrollToModule.forRoot(),
  ]
})
export class LandingModule {}
