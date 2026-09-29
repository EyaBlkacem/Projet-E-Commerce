import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Addcity } from './addcity';

describe('Addcity', () => {
  let component: Addcity;
  let fixture: ComponentFixture<Addcity>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Addcity]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Addcity);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
