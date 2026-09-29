import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HorizontalTopbarEntreprisesComponent } from './horizontal-topbar-entreprises.component';

describe('HorizontalTopbarEntreprisesComponent', () => {
  let component: HorizontalTopbarEntreprisesComponent;
  let fixture: ComponentFixture<HorizontalTopbarEntreprisesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HorizontalTopbarEntreprisesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HorizontalTopbarEntreprisesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
