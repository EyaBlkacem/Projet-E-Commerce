import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BoutiqueListComponent }   from './boutique-list/boutique-list.component';
import { BoutiqueDetailComponent } from './boutique-detail/boutique-detail.component';

const routes: Routes = [
  { path: '',          component: BoutiqueListComponent   },
  { path: 'product/:id', component: BoutiqueDetailComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BoutiqueRoutingModule {}
