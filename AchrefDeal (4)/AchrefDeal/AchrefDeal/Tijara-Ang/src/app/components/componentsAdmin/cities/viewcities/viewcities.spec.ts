import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Viewcities } from './viewcities';

describe('Viewcities', () => {
  let component: Viewcities;
  let fixture: ComponentFixture<Viewcities>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Viewcities]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Viewcities);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
