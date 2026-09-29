import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopbarEntrepriseComponent } from './topbar-entreprise.component';

describe('TopbarEntrepriseComponent', () => {
  let component: TopbarEntrepriseComponent;
  let fixture: ComponentFixture<TopbarEntrepriseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TopbarEntrepriseComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TopbarEntrepriseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
