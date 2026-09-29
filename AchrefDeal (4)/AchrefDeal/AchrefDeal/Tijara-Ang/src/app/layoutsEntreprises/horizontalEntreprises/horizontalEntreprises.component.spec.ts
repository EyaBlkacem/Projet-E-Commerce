import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HorizontalEntreprisesComponent } from './horizontalEntreprises.component';

describe('HorizontalComponent', () => {
  let component: HorizontalEntreprisesComponent;
  let fixture: ComponentFixture<HorizontalEntreprisesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HorizontalEntreprisesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HorizontalEntreprisesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
