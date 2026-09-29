import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayoutEntreprisesComponent } from './layoutEntreprises.component';

describe('LayoutEntreprisesComponent', () => {
  let component: LayoutEntreprisesComponent;
  let fixture: ComponentFixture<LayoutEntreprisesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LayoutEntreprisesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LayoutEntreprisesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
