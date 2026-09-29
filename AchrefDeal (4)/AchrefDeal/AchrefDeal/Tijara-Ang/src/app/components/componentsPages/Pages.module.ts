import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { IndexComponent } from './index/index.component';

import {
  NgbCarouselModule, NgbTooltipModule, NgbCollapseModule
} from '@ng-bootstrap/ng-bootstrap';

import { ScrollToModule } from '@nicky-lenaers/ngx-scroll-to';

import { PagesRoutingModule  } from "./pages-routing.module";
import { Home } from './home/home';
import { Slider } from './home/slider/slider';
import { Pub } from './home/pub/pub';
// import { SharedModule } from '../shared/shared.module';
// // import { NftComponent } from './nft/nft.component';
// // import { JobComponent } from './job/job.component';
// import { AboutsusComponent } from './aboutsus/aboutsus.component';
// import { HomeComponent } from './home/home';
// import { JobsListComponent } from './home/jobs-list/jobs-list.component';
// import { MissionsListComponent } from './home/missions-list/missions-list.component';
// import { SliderpubComponent } from './home/sliderpub/sliderpub.component';
// import { CategoriesListComponent } from './home/categories-list/categories-list.component';
// import { CandidatsListComponent } from './home/candidats-list/candidats-list.component';
// import { FooterComponent } from './home/footer/footer.component';
// import { BlogComponent } from './home/blog/blog.component';
// import { ServiceslistComponent } from './serviceslist/serviceslist.component';
// import { JobslistComponent } from './jobslist/jobslist.component';
// import { MissionslistComponent } from './missionslist/missionslist.component';
// import { CandidatslistComponent } from './candidatslist/candidatslist.component';
// import { FaqComponent } from './home/faq/faq.component';
// import { ContactusComponent } from './contactus/contactus.component';
// import { PrivacypolicyComponent } from './privacypolicy/privacypolicy.component';
// import { TermsandconditionsComponent } from './termsandconditions/termsandconditions.component';
// import { JobdetailsComponent } from './jobdetails/jobdetails.component';
// import { MissiondetailsComponent } from './missiondetails/missiondetails.component';
// import { FreelancePagedetailsComponent } from './freelancePagedetails/freelancePagedetails.component';
// import { ServicedetailsComponent } from './servicedetails/servicedetails.component';
// import { CompleteAccountComponent } from './complete-account/complete-account.component';
// import { ReactiveFormsModule } from '@angular/forms';
// import { DropzoneModule } from "ngx-dropzone-wrapper";

@NgModule({
  declarations: [
    //IndexComponent,
    // NftComponent,
    // JobComponent,
     
  
    Home,
    Slider,
    Pub
  ],
  imports: [
    CommonModule,
    NgbCarouselModule,
    PagesRoutingModule,
    //SharedModule,
    NgbTooltipModule,
    NgbCollapseModule,
    ScrollToModule.forRoot(),
    //ReactiveFormsModule,
    //DropzoneModule,
],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]

})
export class PagesModule { }
