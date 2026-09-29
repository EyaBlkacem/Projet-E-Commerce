import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Viewcountries } from './viewcountries';

describe('Viewcountries', () => {
  let component: Viewcountries;
  let fixture: ComponentFixture<Viewcountries>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Viewcountries]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Viewcountries);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
