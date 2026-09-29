import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Viewreclamations } from './viewreclamations';

describe('Viewreclamations', () => {
  let component: Viewreclamations;
  let fixture: ComponentFixture<Viewreclamations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Viewreclamations]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Viewreclamations);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
