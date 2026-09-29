import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  NgbToastModule, NgbProgressbarModule
} from '@ng-bootstrap/ng-bootstrap';

import { FlatpickrModule } from 'angularx-flatpickr';
import { CountUpModule } from 'ngx-countup';
import { NgApexchartsModule } from 'ng-apexcharts';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { SimplebarAngularModule } from 'simplebar-angular';

// Swiper Slider
import { SlickCarouselModule } from 'ngx-slick-carousel';

import { LightboxModule } from 'ngx-lightbox';

// Load Icons
import { defineElement } from "@lordicon/element";
import lottie from 'lottie-web';
import { RouterModule, Routes } from '@angular/router';
import { Addreclamation } from './addreclamation/addreclamation';
import { Editreclamation } from './editreclamation/editreclamation';
import { Viewreclamations } from './viewreclamations/viewreclamations';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { LanguageService } from 'src/app/core/services/language.service';

// Pages Routing
// import { PagesRoutingModule } from "./pages-routing.module";
 const routes: Routes = [
  {
      path: '',
      component: Viewreclamations,
      data: { title: 'reclamations' }
  },
  {
      path: 'add',
      component: Addreclamation,
      data: { title: 'Add reclamation' }
  },
  {
      path: 'edit/:id',
      component: Editreclamation,
      data: { title: 'Edit rec' }
  },
  {
      path: 'view/:id',
      component: Viewreclamations,
      data: { title: 'View reclam' }
  }
]

@NgModule({
  declarations: [
    Addreclamation,
    Editreclamation,
    Viewreclamations
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgbToastModule,
    NgbProgressbarModule,
    FlatpickrModule.forRoot(),
    RouterModule,
    RouterModule.forChild(routes),
    CountUpModule,
    NgApexchartsModule,
    LeafletModule,
    NgbDropdownModule,
    SimplebarAngularModule,
    SlickCarouselModule,
    LightboxModule,
    TranslateModule,
    ReactiveFormsModule,
    SharedModule
  ],
  exports: [RouterModule],
  providers: [LanguageService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ReclamationsModule {
  constructor() {
    defineElement(lottie.loadAnimation);
  }
}