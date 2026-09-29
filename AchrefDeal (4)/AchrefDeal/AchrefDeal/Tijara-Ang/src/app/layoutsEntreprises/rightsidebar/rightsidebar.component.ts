import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-rightsidebar',
    templateUrl: './rightsidebar.component.html',
    styleUrls: ['./rightsidebar.component.scss'],
    standalone: false
})
export class RightsidebarComponent implements OnInit {

  constructor() { }

  ngOnInit(): void { }

  topFunction() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }
}
