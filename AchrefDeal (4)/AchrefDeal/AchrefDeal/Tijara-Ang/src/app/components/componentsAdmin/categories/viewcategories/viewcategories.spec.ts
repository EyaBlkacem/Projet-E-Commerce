import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Viewcategories } from './viewcategories';

describe('Viewcategories', () => {
  let component: Viewcategories;
  let fixture: ComponentFixture<Viewcategories>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Viewcategories]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Viewcategories);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
