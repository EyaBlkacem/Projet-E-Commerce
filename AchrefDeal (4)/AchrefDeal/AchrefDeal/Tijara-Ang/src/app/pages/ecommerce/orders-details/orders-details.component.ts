import { Component } from '@angular/core';

@Component({
  selector: 'app-orders-details',
  templateUrl: './orders-details.component.html',
  styleUrls: ['./orders-details.component.scss'],
  standalone: false
})
export class OrdersDetailsComponent {
  breadCrumbItems = [{ label: 'Boutique' }, { label: 'Détail commande', active: true }];
}
