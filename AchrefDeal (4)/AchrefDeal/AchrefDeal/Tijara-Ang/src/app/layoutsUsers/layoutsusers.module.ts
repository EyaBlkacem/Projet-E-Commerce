import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NgbDropdownModule, NgbNavModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SimplebarAngularModule } from 'simplebar-angular';
import { LanguageService } from '../core/services/language.service';
import { TranslateModule } from '@ngx-translate/core';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';

// Component pages
import { LayoutUsersComponent } from './layoutusers.component';
import { VerticalComponent } from './vertical/vertical.component';
import { TopbarComponent } from './topbar/topbar.component';
import { TopbarUserComponent } from './topbaruser/topbaruser.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { SidebarAdminComponent } from './sidebarAdmin/sidebarAdmin.component';
import { FooterComponent } from './footer/footer.component';
import { RightsidebarComponent } from './rightsidebar/rightsidebar.component';
import { HorizontalComponent } from './horizontal/horizontal.component';
import { HorizontalUsersComponent } from './horizontalUsers/horizontalUsers.component';
import { HorizontalTopbarComponent } from './horizontal-topbar/horizontal-topbar.component';
import { HorizontalTopbarUserComponent } from './horizontal-topbar-user/horizontal-topbar-user.component';
import { TwoColumnComponent } from './two-column/two-column.component';
import { TwoColumnSidebarComponent } from './two-column-sidebar/two-column-sidebar.component';



@NgModule({
  declarations: [
    LayoutUsersComponent,
    HorizontalUsersComponent,
    HorizontalTopbarUserComponent,
    TopbarUserComponent,

    VerticalComponent,
    TopbarComponent,
    SidebarComponent,
    FooterComponent,
    RightsidebarComponent,
    HorizontalComponent,
    HorizontalTopbarComponent,
    TwoColumnComponent,
    TwoColumnSidebarComponent,
    SidebarAdminComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    NgbDropdownModule,
    NgbNavModule,
    NgbTooltipModule,
    SimplebarAngularModule,
    TranslateModule,
    NgbCollapseModule,
    FormsModule, ReactiveFormsModule
  ],
  exports: [
    // Exportez le composant TopbarComponent si nécessaire
    HorizontalUsersComponent,
    HorizontalTopbarUserComponent,
    HorizontalTopbarComponent,
    TopbarUserComponent,
    TopbarComponent,
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ],
  providers: [LanguageService]
})
export class LayoutsUsersModule { }
