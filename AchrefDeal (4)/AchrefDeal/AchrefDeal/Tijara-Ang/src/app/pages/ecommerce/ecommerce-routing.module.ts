import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ProductsComponent }      from './products/products.component';
import { ProductDetailComponent }  from './product-detail/product-detail.component';
import { CartComponent }           from './cart/cart.component';
import { CheckoutComponent }       from './checkout/checkout.component';
import { OrdersComponent }         from './orders/orders.component';
import { ChatComponent }           from './chat/chat.component';
import { OrdersDetailsComponent }  from './orders-details/orders-details.component';
import { SellersComponent }        from './sellers/sellers.component';
import { SellerDetailsComponent }  from './seller-details/seller-details.component';

const routes: Routes = [
  { path: 'products',           component: ProductsComponent },
  { path: 'product-detail/:id', component: ProductDetailComponent },
  { path: 'product-detail',     component: ProductDetailComponent },
  { path: 'cart',               component: CartComponent },
  { path: 'checkout',           component: CheckoutComponent },
  { path: 'orders',             component: OrdersComponent },
  { path: 'chat',               component: ChatComponent },
  { path: 'order-details',      component: OrdersDetailsComponent },
  { path: 'sellers',            component: SellersComponent },
  { path: 'seller-details/:id', component: SellerDetailsComponent },
  { path: 'seller-details',     component: SellerDetailsComponent },
  { path: '',                   redirectTo: 'products', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EcommerceRoutingModule {}
