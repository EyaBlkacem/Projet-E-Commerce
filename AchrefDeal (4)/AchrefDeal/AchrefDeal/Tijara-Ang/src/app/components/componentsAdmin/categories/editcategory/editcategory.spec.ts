import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Editcategory } from './editcategory';

describe('Editcategory', () => {
  let component: Editcategory;
  let fixture: ComponentFixture<Editcategory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Editcategory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Editcategory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
