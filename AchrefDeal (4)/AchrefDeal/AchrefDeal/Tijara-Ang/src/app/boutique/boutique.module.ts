import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { BoutiqueRoutingModule }    from './boutique-routing.module';
import { BoutiqueListComponent }    from './boutique-list/boutique-list.component';
import { BoutiqueDetailComponent }  from './boutique-detail/boutique-detail.component';

@NgModule({
  declarations: [
    BoutiqueListComponent,
    BoutiqueDetailComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    BoutiqueRoutingModule,
  ]
})
export class BoutiqueModule {}
