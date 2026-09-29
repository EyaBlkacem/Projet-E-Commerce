import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Addreclamation } from './addreclamation';

describe('Addreclamation', () => {
  let component: Addreclamation;
  let fixture: ComponentFixture<Addreclamation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Addreclamation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Addreclamation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
