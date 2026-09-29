import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Addcountry } from './addcountry';

describe('Addcountry', () => {
  let component: Addcountry;
  let fixture: ComponentFixture<Addcountry>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Addcountry]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Addcountry);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
