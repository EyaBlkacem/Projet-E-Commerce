import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Editcause } from './editcause';

describe('Editcause', () => {
  let component: Editcause;
  let fixture: ComponentFixture<Editcause>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Editcause]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Editcause);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
