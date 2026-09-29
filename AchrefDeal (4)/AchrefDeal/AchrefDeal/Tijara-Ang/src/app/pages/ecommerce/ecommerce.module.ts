import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  NgbPaginationModule, NgbDropdownModule,
  NgbNavModule, NgbRatingModule, NgbTooltipModule
} from '@ng-bootstrap/ng-bootstrap';

import { EcommerceRoutingModule } from './ecommerce-routing.module';
import { SharedModule } from '../../shared/shared.module';

import { ProductsComponent }      from './products/products.component';
import { ProductDetailComponent }  from './product-detail/product-detail.component';
import { OrdersComponent }         from './orders/orders.component';
import { OrdersDetailsComponent }  from './orders-details/orders-details.component';
import { CartComponent }           from './cart/cart.component';
import { CheckoutComponent }       from './checkout/checkout.component';
import { SellersComponent }        from './sellers/sellers.component';
import { SellerDetailsComponent }  from './seller-details/seller-details.component';
import { ChatComponent }           from './chat/chat.component';

@NgModule({
  declarations: [
    ProductsComponent,
    ProductDetailComponent,
    OrdersComponent,
    OrdersDetailsComponent,
    CartComponent,
    CheckoutComponent,
    SellersComponent,
    SellerDetailsComponent,
    ChatComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbPaginationModule,
    NgbDropdownModule,
    NgbNavModule,
    NgbRatingModule,
    NgbTooltipModule,
    EcommerceRoutingModule,
    SharedModule,
  ]
})
export class EcommerceModule {}
