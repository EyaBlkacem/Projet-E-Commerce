import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Editcity } from './editcity';

describe('Editcity', () => {
  let component: Editcity;
  let fixture: ComponentFixture<Editcity>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Editcity]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Editcity);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
