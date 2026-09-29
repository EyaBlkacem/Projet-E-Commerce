import { Component, NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// Component Pages
import { IndexComponent } from "../landing/index/index.component";
import { NftComponent } from "../landing/nft/nft.component";
import { JobComponent } from '../landing/job/job.component';
import { CompleteAccountComponent } from './complete-account/complete-account.component';
import { AuthGuard } from '../core/guards/auth.guard';
import { AccountCompletionGuard } from '../core/guards/account-completion.guard';

const routes: Routes = [
  
  {
    path: "index",
    component: IndexComponent
  },
  {
    path: "nft",
    component: NftComponent
  },
  {
    path: "",
    component: IndexComponent
  },
  {path:"complete-account",
  component : CompleteAccountComponent , canActivate: [AuthGuard,AccountCompletionGuard] }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class PagesRoutingModule { }
