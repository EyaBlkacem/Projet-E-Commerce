import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Addcause } from './addcause';

describe('Addcause', () => {
  let component: Addcause;
  let fixture: ComponentFixture<Addcause>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Addcause]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Addcause);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
