import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Editcountry } from './editcountry';

describe('Editcountry', () => {
  let component: Editcountry;
  let fixture: ComponentFixture<Editcountry>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Editcountry]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Editcountry);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
