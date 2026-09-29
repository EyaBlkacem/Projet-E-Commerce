import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Viewusers } from './viewusers';

describe('Viewusers', () => {
  let component: Viewusers;
  let fixture: ComponentFixture<Viewusers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Viewusers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Viewusers);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
