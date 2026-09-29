import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Viewcauses } from './viewcauses';

describe('Viewcauses', () => {
  let component: Viewcauses;
  let fixture: ComponentFixture<Viewcauses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Viewcauses]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Viewcauses);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
