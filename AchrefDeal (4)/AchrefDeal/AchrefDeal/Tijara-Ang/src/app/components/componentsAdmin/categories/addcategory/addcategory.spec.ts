import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Addcategory } from './addcategory';

describe('Addcategory', () => {
  let component: Addcategory;
  let fixture: ComponentFixture<Addcategory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Addcategory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Addcategory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
